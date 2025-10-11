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
		if err == nil && resp.StatusCode == http.StatusOK {
			resp.Body.Close()
			break
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
	req := getDefaultPdfRequest(t)

	pdfData, err := requestNewPDF(t, req)
	if err != nil {
		t.Fatalf("Failed to generate PDF: %v", err)
	}

	if !harness.IsPDF(pdfData) {
		t.Error("Response is not a valid PDF")
	}

	if len(pdfData) == 0 {
		t.Error("PDF data is empty")
	}

	t.Logf("Generated PDF size: %d bytes", len(pdfData))
}

func TestPDFGeneration_CompareOldAndNew(t *testing.T) {
	req := getDefaultPdfRequest(t)

	newPdfData, newErr := requestNewPDF(t, req)
	oldPdfData, oldErr := requestOldPDF(t, req)
	if newErr != nil {
		t.Errorf("New PDF generator failure: %v", newErr)
	}
	if oldErr != nil {
		t.Errorf("Old PDF generator failure: %v", oldErr)
	}

	newPdf := makePdfDeterministic(t, newPdfData)
	oldPdf := makePdfDeterministic(t, oldPdfData)
	harness.Snapshot(t, oldPdf, "old", "pdf")
	harness.Snapshot(t, newPdf, "new", "pdf")
	harness.Snapshot(t, oldPdf, "old", "txt")
	harness.Snapshot(t, newPdf, "new", "txt")

	t.Logf("Generated PDF sizes: %d and %d bytes", len(newPdfData), len(oldPdfData))
}

func makePdfDeterministic(t *testing.T, pdf []byte) []byte {
	// These are the non-deterministic parts of a PDF:
	//
	// /CreationDate (D:20251010054937+00'00')
	// /ModDate (D:20251010054937+00'00')>>
	//
	var date []byte = []byte("D:20251010054937+00'00'")

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

// requestNewPDF sends a PDF generation request to the new PDF generator solution
func requestNewPDF(t *testing.T, req *types.PdfRequest) ([]byte, error) {
	return requestPDFWithHost(t, req, "pdf3-proxy.pdf3.svc.cluster.local")
}

// requestNewPDF sends a PDF generation request to the old PDF generator solution
func requestOldPDF(t *testing.T, req *types.PdfRequest) ([]byte, error) {
	return requestPDFWithHost(t, req, "pdf-generator.pdf.svc.cluster.local")
}

// requestPDF sends a PDF generation request to the proxy
func requestPDFWithHost(t *testing.T, req *types.PdfRequest, overrideHost string) ([]byte, error) {
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

	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

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
	if len(data) == 0 {
		t.Error("PDF data is empty")
	}

	return data, nil
}

func TestPDFGeneration_RetryOnQueueFull(t *testing.T) {
	// This test verifies that the proxy retries when the worker queue is full
	// We send multiple concurrent requests to fill the queue

	const concurrentRequests = 6

	results := make(chan error, concurrentRequests)

	// Send concurrent requests
	for i := 0; i < concurrentRequests; i++ {
		go func(index int) {
			req := getDefaultPdfRequest(t)
			req.URL = fmt.Sprintf("%s?i=%d", req.URL, i)

			pdfData, err := requestNewPDF(t, req)
			if err != nil {
				results <- fmt.Errorf("request %d failed: %w", index, err)
				return
			}

			if !harness.IsPDF(pdfData) {
				results <- fmt.Errorf("request %d: response is not a valid PDF", index)
				return
			}

			results <- nil
		}(i)
	}

	// Collect results
	var failures []error
	for i := 0; i < concurrentRequests; i++ {
		if err := <-results; err != nil {
			// Check if it's a 429 error - we expect some might fail with 429 after retries
			if !strings.Contains(err.Error(), "429") {
				failures = append(failures, err)
			} else {
				t.Logf("Request failed with 429 (expected under load): %v", err)
			}
		}
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
