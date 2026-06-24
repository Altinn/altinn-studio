package harness

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/projectroot"
	"altinn.studio/devenv/pkg/runtimes/kind"
	"altinn.studio/pdf3/internal/assert"
	ptesting "altinn.studio/pdf3/internal/testing"
	"altinn.studio/pdf3/internal/types"
)

var IsCI bool = os.Getenv("CI") != ""

var (
	TestServerURL string
	JumpboxURL    string
	Runtime       *kind.KindContainerRuntime
	cachePath     = ".cache"
)

var (
	errUnexpectedStatusCode = errors.New("unexpected status code")
)

func Init() {
	TestServerURL = "http://testserver.default.svc.cluster.local"
	JumpboxURL = "http://localhost:8020"

	if _, err := fmt.Fprintln(os.Stdout, "=== Initializing Test Harness ==="); err != nil {
		os.Exit(1)
	}

	var err error
	projectRoot, err := projectroot.Find(projectroot.Marker)
	if err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "Couldn't find project root: %v\n", err)
		os.Exit(1)
	}
	Runtime, err = kind.LoadCurrent(filepath.Join(projectRoot, cachePath))
	if err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "Error loading runtime: %v\n", err)
		os.Exit(1)
	}

	if _, err := fmt.Fprintln(os.Stdout, "=== Test Harness Ready ==="); err != nil {
		os.Exit(1)
	}
}

func GetDefaultPdfRequest(t *testing.T) *types.PdfRequest {
	t.Helper()

	parsedUrl, err := url.Parse(TestServerURL + "/app/")
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

type PdfResponse struct {
	Input    *ptesting.PdfInternalsTestInput
	WorkerIP string
	Data     []byte
}

// LoadOutput fetches the test output from the API if testInput was provided.
func (r *PdfResponse) LoadOutput(t *testing.T) (*ptesting.PdfInternalsTestOutput, error) {
	t.Helper()

	if r.Input == nil || r.Input.ID == "" {
		//nolint:nilnil // Missing test input is a valid no-op for callers that do not use internals mode.
		return nil, nil // No test input, nothing to load
	}

	output, err := getTestOutput(t, r.Input.ID, r.WorkerIP)
	if err != nil {
		return nil, err
	}

	return output, nil
}

// getTestOutput fetches a test output from the proxy by ID (which forwards to worker).
func getTestOutput(_ *testing.T, id string, workerIP string) (*ptesting.PdfInternalsTestOutput, error) {
	assert.That(id != "", "Test output ID is required")
	assert.That(workerIP != "", "Worker IP should always be set in test internals mode")
	url := JumpboxURL + "/testoutput/" + id

	client := &http.Client{
		Timeout: types.RequestTimeout(),
	}

	httpReq, err := http.NewRequestWithContext(context.Background(), http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("create test output request: %w", err)
	}
	httpReq.Host = "pdf3-proxy.runtime-pdf3.svc.cluster.local"
	httpReq.Header.Set("X-Target-Worker-Ip", workerIP)

	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer func() {
		if closeErr := resp.Body.Close(); closeErr != nil {
			assert.That(false, "Failed to close test output response body", "error", closeErr)
		}
	}()

	if resp.StatusCode != http.StatusOK {
		body, readErr := io.ReadAll(resp.Body)
		if readErr != nil {
			return nil, fmt.Errorf("read error response body: %w", readErr)
		}
		return nil, fmt.Errorf("%w %d: %s", errUnexpectedStatusCode, resp.StatusCode, string(body))
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var output ptesting.PdfInternalsTestOutput
	if err := json.Unmarshal(data, &output); err != nil {
		return nil, fmt.Errorf("failed to unmarshal test output: %w", err)
	}

	return &output, nil
}

// RequestNewPDF sends a PDF generation request to the new PDF generator solution.
func RequestNewPDF(t *testing.T, req *types.PdfRequest) (*PdfResponse, error) {
	t.Helper()
	return RequestPDFWithHost(t, req, "pdf3-proxy.runtime-pdf3.svc.cluster.local", nil)
}

// RequestNewPDFWithTestInput sends a PDF generation request to the new PDF generator solution.
func RequestNewPDFWithTestInput(
	t *testing.T,
	req *types.PdfRequest,
	testInput *ptesting.PdfInternalsTestInput,
) (*PdfResponse, error) {
	t.Helper()
	return RequestPDFWithHost(t, req, "pdf3-proxy.runtime-pdf3.svc.cluster.local", testInput)
}

// RequestPDFWithHost sends a PDF generation request to the proxy.
func RequestPDFWithHost(
	t *testing.T,
	req *types.PdfRequest,
	overrideHost string,
	testInput *ptesting.PdfInternalsTestInput,
) (*PdfResponse, error) {
	t.Helper()

	reqBody, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	url := JumpboxURL + "/pdf"

	client := &http.Client{
		Timeout: types.RequestTimeout(),
	}

	httpReq, err := http.NewRequestWithContext(context.Background(), http.MethodPost, url, bytes.NewReader(reqBody))
	if err != nil {
		return nil, fmt.Errorf("create PDF request: %w", err)
	}
	httpReq.Host = overrideHost
	httpReq.Header.Set("Content-Type", "application/json")
	if strings.Contains(overrideHost, "pdf3") {
		if testInput == nil {
			testInput = ptesting.NewDefaultTestInput()
		}
		testInput.Serialize(httpReq.Header)
	}

	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer func() {
		// Closing response body after reading PDF data
		if closeErr := resp.Body.Close(); closeErr != nil {
			assert.That(false, "Failed to close PDF response body", "error", closeErr)
		}
	}()

	if resp.StatusCode != http.StatusOK {
		body, readErr := io.ReadAll(resp.Body)
		if readErr != nil {
			return nil, fmt.Errorf("read error response body: %w", readErr)
		}
		return nil, fmt.Errorf("%w %d: %s", errUnexpectedStatusCode, resp.StatusCode, string(body))
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}
	if !IsPDF(data) {
		t.Error("Response is not a valid PDF")
	}

	// In test internals mode, capture the worker IP for routing test output requests
	workerIP := ""
	if testInput != nil {
		workerIP = resp.Header.Get("X-Worker-Ip")
		if workerIP == "" {
			t.Fatal("Warning: X-Worker-IP header not present in response")
		}
	}

	return &PdfResponse{
		Data:     data,
		Input:    testInput,
		WorkerIP: workerIP,
	}, nil
}
