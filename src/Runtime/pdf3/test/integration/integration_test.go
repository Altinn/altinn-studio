package integration

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"altinn.studio/pdf3/internal/types"
	"altinn.studio/pdf3/test/harness"
)

var (
	testServerURL string
	jumpboxURL    string
)

func TestMain(m *testing.M) {
	// Services are running via k8s cluster locally
	testServerURL = "http://testserver.default.svc.cluster.local"
	jumpboxURL = "http://localhost:8020"

	// Wait for services to be ready
	fmt.Println("Waiting for services to be ready...")
	if err := waitForServices(); err != nil {
		fmt.Fprintf(os.Stderr, "Services not ready: %v\n", err)
		os.Exit(1)
	}

	// Run tests
	code := m.Run()
	os.Exit(code)
}

// waitForServices waits for proxy and test server to be ready
func waitForServices() error {
	client := &http.Client{Timeout: 2 * time.Second}
	maxRetries := 30

	// Wait for proxy
	for i := 0; i < maxRetries; i++ {
		req, err := http.NewRequest("GET", jumpboxURL+"/health/startup", nil)
		if err != nil {
			return err
		}
		req.Host = "pdf3-proxy.pdf3.svc.cluster.local"

		resp, err := client.Do(req)
		if err == nil {
			// Close response body when err is nil - we're in a retry loop, so ignoring error is acceptable
			if resp.StatusCode == http.StatusOK {
				_ = resp.Body.Close()
				break
			}
			_ = resp.Body.Close()
		}
		if i == maxRetries-1 {
			return fmt.Errorf("proxy not ready after %d attempts", maxRetries)
		}
		time.Sleep(1 * time.Second)
	}

	return nil
}

func getDefaultPdfRequest(t *testing.T) *types.PdfRequest {
	parsedUrl, err := url.Parse(testServerURL + "/app/")
	if err != nil {
		t.Fatalf("Couldnt parse PDF request url: %v", err)
	}

	return &types.PdfRequest{
		URL:                  parsedUrl.String(),
		WaitFor:              types.NewWaitForString("#readyForPrint"),
		SetJavaScriptEnabled: true,
		Options: types.PdfOptions{
			HeaderTemplate:      "<div/>",
			FooterTemplate:      "<div/>",
			DisplayHeaderFooter: false,
			PrintBackground:     true,
			Format:              "A4",
			Margin: types.PdfMargin{
				Top:    "0.75in",
				Left:   "0.75in",
				Bottom: "0.75in",
				Right:  "0.75in",
			},
		},
		Cookies: []types.Cookie{
			{
				Name:     "AltinnStudioRuntime",
				Value:    "for-testing-purposes",
				Domain:   parsedUrl.Hostname(),
				SameSite: "Lax",
			},
		},
	}
}

func TestPDFGeneration_Simple(t *testing.T) {
	t.Parallel()

	req := getDefaultPdfRequest(t)
	req.URL = testServerURL + "/app/?render=light"

	resp, err := requestNewPDF(t, req)
	if err != nil {
		t.Fatalf("Failed to generate PDF: %v", err)
	}

	if !harness.IsPDF(resp.Data) {
		t.Error("Response is not a valid PDF")
	}

	output, err := resp.LoadOutput(t)
	if err != nil {
		t.Errorf("Failed loading test output: %v", err)
	} else {
		harness.Snapshot(t, []byte(output.SnapshotString()), "testoutput", "json")
	}
	t.Logf("Generated PDF size: %d bytes", len(resp.Data))
}

func TestPDFGeneration_Networking(t *testing.T) {
	t.Parallel()
	url := jumpboxURL + "/health/startup"

	// Create HTTP client with 10s timeout for PDF generation
	client := &http.Client{
		Timeout: 3 * time.Second,
	}

	httpReq, err := http.NewRequest("GET", url, nil)
	if err != nil {
		t.Fatalf("Failed to create HTTP request: %v", err)
	}
	// Should not be able to reach worker directly
	httpReq.Host = "pdf3-worker.pdf3.svc.cluster.local"

	resp, err := client.Do(httpReq)
	if err == nil {
		t.Fatalf("Unexpectedly reached pdf3-worker from jumpbox: %d", resp.StatusCode)
	}

	harness.Snapshot(t, []byte(err.Error()), "error", "txt")
}

func TestPDFGeneration_CompareOldAndNew(t *testing.T) {
	t.Parallel()

	req := getDefaultPdfRequest(t)
	req.URL = testServerURL + "/app/?render=light"

	newResp, newErr := requestNewPDF(t, req)
	oldResp, oldErr := requestOldPDF(t, req)
	if newErr != nil {
		t.Errorf("New PDF generator failure: %v", newErr)
	}
	if oldErr != nil {
		t.Errorf("Old PDF generator failure: %v", oldErr)
	}
	if newErr != nil || oldErr != nil {
		return
	}

	newPdf := makePdfDeterministic(t, newResp.Data)
	oldPdf := makePdfDeterministic(t, oldResp.Data)
	harness.Snapshot(t, oldPdf, "old", "pdf")
	harness.Snapshot(t, newPdf, "new", "pdf")
	harness.Snapshot(t, oldPdf, "old", "txt")
	harness.Snapshot(t, newPdf, "new", "txt")

	t.Logf("Generated PDF sizes: %d and %d bytes", len(newResp.Data), len(oldResp.Data))
}

func makePdfDeterministic(t *testing.T, pdf []byte) []byte {
	// These are the non-deterministic parts of a PDF:
	//
	// /CreationDate (D:20251010054937+00'00')
	// /ModDate (D:20251010054937+00'00')>>
	//
	date := []byte("D:20251010054937+00'00'")

	result := bytes.Clone(pdf)

	makeDateDeterministic := func(t *testing.T, dest []byte, src []byte, prefix []byte, date []byte) {
		index := bytes.Index(src, prefix)
		if index != -1 {
			sliced := src[index:]
			startParens := index + bytes.Index(sliced, []byte{'('})
			if startParens == -1 {
				t.Errorf("Couldn't parse creation date value")
				return
			}
			endParens := index + bytes.Index(sliced, []byte{')'})
			if endParens == -1 {
				t.Errorf("Couldn't parse creation date value")
				return
			}
			if endParens-(startParens+1) != len(date) {
				t.Errorf("Couldn't fit deterministic date in /CreationDate field")
				return
			}

			copy(dest[startParens:], date)
		}
	}

	makeDateDeterministic(t, result, pdf, []byte("/CreationDate"), date)
	makeDateDeterministic(t, result, pdf, []byte("/ModDate"), date)

	return result
}

type PdfResponse struct {
	Data  []byte
	Input *types.PdfInternalsTestInput
}

// LoadOutput fetches the test output from the API if testInput was provided
func (r *PdfResponse) LoadOutput(t *testing.T) (*types.PdfInternalsTestOutput, error) {
	if r.Input.ID == "" {
		return nil, nil // No test input, nothing to load
	}

	output, err := getTestOutput(t, r.Input.ID)
	if err != nil {
		return nil, err
	}

	return output, nil
}

// requestNewPDF sends a PDF generation request to the new PDF generator solution
func requestNewPDF(t *testing.T, req *types.PdfRequest) (*PdfResponse, error) {
	return requestPDFWithHost(t, req, "pdf3-proxy.pdf3.svc.cluster.local", nil)
}

// requestNewPDF sends a PDF generation request to the new PDF generator solution
func requestNewPDFWithTestInput(t *testing.T, req *types.PdfRequest, testInput *types.PdfInternalsTestInput) (*PdfResponse, error) {
	return requestPDFWithHost(t, req, "pdf3-proxy.pdf3.svc.cluster.local", testInput)
}

// requestOldPDF sends a PDF generation request to the old PDF generator solution
func requestOldPDF(t *testing.T, req *types.PdfRequest) (*PdfResponse, error) {
	return requestPDFWithHost(t, req, "pdf-generator.pdf.svc.cluster.local", nil)
}

// requestPDF sends a PDF generation request to the proxy
func requestPDFWithHost(t *testing.T, req *types.PdfRequest, overrideHost string, testInput *types.PdfInternalsTestInput) (*PdfResponse, error) {
	reqBody, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	url := jumpboxURL + "/pdf"

	// Create HTTP client with 10s timeout for PDF generation
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	httpReq, err := http.NewRequest("POST", url, bytes.NewReader((reqBody)))
	if err != nil {
		return nil, err
	}
	httpReq.Host = overrideHost
	httpReq.Header.Set("Content-Type", "application/json")
	if strings.Contains(overrideHost, "pdf3") {
		if testInput == nil {
			testInput = types.NewDefaultPdfInternalsTestInput()
		}
		testInput.Serialize(httpReq.Header)
	}

	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer func() {
		// Closing response body after reading PDF data
		_ = resp.Body.Close()
	}()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status code %d: %s", resp.StatusCode, string(body))
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}
	if !harness.IsPDF(data) {
		t.Error("Response is not a valid PDF")
	}

	return &PdfResponse{
		Data:  data,
		Input: testInput,
	}, nil
}

func TestPDFGeneration_RetryOnQueueFull(t *testing.T) {
	// This test verifies that the proxy retries when the worker queue is full
	// We send multiple concurrent requests to fill the queue

	const concurrentRequests = 50

	results := make(chan error, concurrentRequests)

	// Send concurrent requests
	for index := 0; index < concurrentRequests; index++ {
		go func(index int) {
			req := getDefaultPdfRequest(t)
			req.URL = fmt.Sprintf("%s?render=light&i=%d", req.URL, index)

			resp, err := requestNewPDF(t, req)
			if err != nil {
				results <- fmt.Errorf("request %d failed: %w", index, err)
				return
			}

			if !harness.IsPDF(resp.Data) {
				results <- fmt.Errorf("request %d: response is not a valid PDF", index)
				return
			}

			results <- nil
		}(index)
	}

	// Collect results
	var failures []error
	errorsDueTo429 := 0
	for i := 0; i < concurrentRequests; i++ {
		if err := <-results; err != nil {
			// Check if it's a 429 error - we expect some might fail with 429 after retries
			if !strings.Contains(err.Error(), "429") {
				failures = append(failures, err)
			} else {
				errorsDueTo429++
				// t.Logf("Request failed with 429 (expected under load): %v", err)
			}
		}
	}

	if errorsDueTo429 == 0 {
		t.Error("No failures with 429 occurred")
	} else {
		t.Logf("%d requests failed with 429", errorsDueTo429)
	}

	// Report unexpected failures
	if len(failures) > 0 {
		for _, err := range failures {
			t.Errorf("Unexpected failure: %v", err)
		}
	}

	// At least some requests should have succeeded due to retries
	if len(failures) == concurrentRequests {
		t.Error("All requests failed - retry logic may not be working")
	}

	t.Logf("Completed %d concurrent requests with %d unexpected failures", concurrentRequests, len(failures))
}

func TestPDFGeneration_WithConsoleErrors(t *testing.T) {
	req := getDefaultPdfRequest(t)
	// Page will log 1 console error
	req.URL = testServerURL + "/app/?render=light&logerrors=1"

	resp, err := requestNewPDF(t, req)
	if err != nil {
		t.Fatalf("Failed to generate PDF with console errors: %v", err)
	}

	if !harness.IsPDF(resp.Data) {
		t.Error("Response is not a valid PDF")
	}

	t.Logf("Generated PDF size: %d bytes", len(resp.Data))
}

func TestPDFGeneration_WithThrownErrors(t *testing.T) {
	req := getDefaultPdfRequest(t)
	// Page will throw 2 errors (1 caught, last uncaught, which should result in error)
	req.URL = testServerURL + "/app/?render=light&throwerrors=2"

	resp, err := requestNewPDF(t, req)
	if err != nil {
		t.Fatalf("Failed to generate PDF with thrown errors: %v", err)
	}

	if !harness.IsPDF(resp.Data) {
		t.Error("Response is not a valid PDF")
	}

	t.Logf("Generated PDF size: %d bytes", len(resp.Data))
}

func TestPDFGeneration_WithCleanupDelay(t *testing.T) {

	const totalRequests int = 30
	const threads int = 16

	var wg sync.WaitGroup
	queue := make(chan int, 30)

	errors429 := atomic.Uint64{}
	requestsMade := atomic.Uint64{}
	failureQueue := make(chan error, 30)
	failures := make([]error, 0)

	for j := 0; j < threads; j++ {
		wg.Add(1)
		go func(j int) {
			defer wg.Done()

			for i := range queue {
				req := getDefaultPdfRequest(t)
				req.URL = fmt.Sprintf("%s/app/?render=light&j=%d&i=%d", testServerURL, j, i)
				testInput := types.NewPdfInternalsTestInput(3 * time.Second)
				resp, err := requestNewPDFWithTestInput(t, req, testInput)
				requestsMade.Add(1)
				if err != nil {
					if !strings.Contains(err.Error(), "429") {
						failureQueue <- fmt.Errorf("[%d, %d] request failed: %v", j, i, err)
					} else {
						errors429.Add(1)
					}
					return
				}

				if !harness.IsPDF(resp.Data) {
					failureQueue <- fmt.Errorf("[%d, %d] response is not PDF", j, i)
				}

				// Load test output from API
				if output, err := resp.LoadOutput(t); err != nil {
					failureQueue <- fmt.Errorf("[%d, %d] failed to load test output: %v", j, i, err)
				} else if output != nil && output.HadErrors() {
					failureQueue <- fmt.Errorf("[%d, %d] response had errors reported in browsers", j, i)
				}
			}
		}(j)
	}

	go func() {
		for err := range failureQueue {
			failures = append(failures, err)
		}
	}()

	t.Log("Started threads")

	for i := range totalRequests {
		queue <- i
	}
	close(queue)
	t.Log("Started dispatched messages")

	wg.Wait()
	close(failureQueue)

	if requestsMade.Load() != uint64(totalRequests) {
		t.Fatalf("Only completed %d requests", requestsMade.Load())
	}
	t.Logf("Requests complete, found %d failures (%d 429's)", len(failures), errors429.Load())
}

// getTestOutput fetches a test output from the proxy by ID (which forwards to worker)
func getTestOutput(_ *testing.T, id string) (*types.PdfInternalsTestOutput, error) {
	url := jumpboxURL + "/testoutput/" + id

	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	httpReq, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	httpReq.Host = "pdf3-proxy.pdf3.svc.cluster.local"

	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status code %d: %s", resp.StatusCode, string(body))
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var output types.PdfInternalsTestOutput
	if err := json.Unmarshal(data, &output); err != nil {
		return nil, fmt.Errorf("failed to unmarshal test output: %w", err)
	}

	return &output, nil
}

func TestPDFGeneration_CookieCleanup(t *testing.T) {
	t.Parallel()

	req := getDefaultPdfRequest(t)
	req.URL = testServerURL + "/app/?render=light"

	testInput := types.NewPdfInternalsTestInput(0)

	// Make a PDF generation request with test input
	resp, err := requestNewPDFWithTestInput(t, req, testInput)
	if err != nil {
		t.Fatalf("Failed to generate PDF: %v", err)
	}

	if !harness.IsPDF(resp.Data) {
		t.Error("Response is not a valid PDF")
	}

	// Fetch the test output from the worker using the API (endpoint waits for completion)
	output, err := getTestOutput(t, testInput.ID)
	if err != nil {
		t.Fatalf("Failed to get test output: %v", err)
	}

	// Verify the test output
	if output.ID != testInput.ID {
		t.Errorf("Expected test output ID %s, got %s", testInput.ID, output.ID)
	}

	// We should have exactly 2 browser state snapshots: before and after cleanup
	if len(output.BrowserStates) != 2 {
		t.Fatalf("Expected 2 browser state snapshots, got %d", len(output.BrowserStates))
	}

	// Before cleanup: verify state name and cookies
	beforeCleanup := output.BrowserStates[0]
	if beforeCleanup.State != "BeforeCleanup" {
		t.Errorf("Expected state 'BeforeCleanup', got '%s'", beforeCleanup.State)
	}
	if len(beforeCleanup.Cookies) == 0 {
		t.Error("Expected cookies before cleanup, but got 0")
	} else {
		t.Logf("Found %d cookies before cleanup: %v", len(beforeCleanup.Cookies), beforeCleanup.Cookies)
	}
	t.Logf("Before cleanup - ConsoleErrors: %d, BrowserErrors: %d",
		beforeCleanup.ConsoleErrorLogs, beforeCleanup.BrowserErrors)

	// After cleanup: verify state name and no cookies
	afterCleanup := output.BrowserStates[1]
	if afterCleanup.State != "AfterCleanup" {
		t.Errorf("Expected state 'AfterCleanup', got '%s'", afterCleanup.State)
	}
	if len(afterCleanup.Cookies) != 0 {
		t.Errorf("Expected 0 cookies after cleanup, but got %d: %v",
			len(afterCleanup.Cookies), afterCleanup.Cookies)
	} else {
		t.Log("All cookies successfully cleaned up")
	}
	t.Logf("After cleanup - ConsoleErrors: %d, BrowserErrors: %d",
		afterCleanup.ConsoleErrorLogs, afterCleanup.BrowserErrors)

	// Snapshot the output for reference
	harness.Snapshot(t, []byte(output.String()), "testoutput", "json")

	// Log error counts from the final state
	finalState := output.BrowserStates[len(output.BrowserStates)-1]
	t.Logf("Generated PDF size: %d bytes (with %d console error logs, %d browser errors)",
		len(resp.Data), finalState.ConsoleErrorLogs, finalState.BrowserErrors)
}
