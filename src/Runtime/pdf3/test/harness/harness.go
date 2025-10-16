package harness

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"altinn.studio/pdf3/internal/assert"
	ptesting "altinn.studio/pdf3/internal/testing"
	"altinn.studio/pdf3/internal/types"
)

var IsCI bool = os.Getenv("CI") != ""

var (
	TestServerURL string
	JumpboxURL    string
)

func Init() {
	TestServerURL = "http://testserver.default.svc.cluster.local"
	JumpboxURL = "http://localhost:8020"

	// Wait for services to be ready
	fmt.Println("Waiting for services to be ready...")
	if err := waitForServices(); err != nil {
		fmt.Fprintf(os.Stderr, "Services not ready: %v\n", err)
		os.Exit(1)
	}
}

// waitForServices waits for proxy and test server to be ready
func waitForServices() error {
	client := &http.Client{Timeout: 2 * time.Second}
	maxRetries := 30

	// Wait for proxy
	for i := 0; i < maxRetries; i++ {
		req, err := http.NewRequest("GET", JumpboxURL+"/health/startup", nil)
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

func GetDefaultPdfRequest(t *testing.T) *types.PdfRequest {
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
	Data     []byte
	Input    *ptesting.PdfInternalsTestInput
	WorkerIP string // Worker IP that generated this PDF (for routing test output requests)
}

// LoadOutput fetches the test output from the API if testInput was provided
func (r *PdfResponse) LoadOutput(t *testing.T) (*ptesting.PdfInternalsTestOutput, error) {
	if r.Input.ID == "" {
		return nil, nil // No test input, nothing to load
	}

	output, err := getTestOutput(t, r.Input.ID, r.WorkerIP)
	if err != nil {
		return nil, err
	}

	return output, nil
}

// getTestOutput fetches a test output from the proxy by ID (which forwards to worker)
func getTestOutput(_ *testing.T, id string, workerIP string) (*ptesting.PdfInternalsTestOutput, error) {
	assert.Assert(id != "")
	assert.Assert(workerIP != "")
	url := JumpboxURL + "/testoutput/" + id

	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	httpReq, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	httpReq.Host = "pdf3-proxy.pdf3.svc.cluster.local"
	httpReq.Header.Set("X-Target-Worker-IP", workerIP)

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

	var output ptesting.PdfInternalsTestOutput
	if err := json.Unmarshal(data, &output); err != nil {
		return nil, fmt.Errorf("failed to unmarshal test output: %w", err)
	}

	return &output, nil
}

// requestNewPDF sends a PDF generation request to the new PDF generator solution
func RequestNewPDF(t *testing.T, req *types.PdfRequest) (*PdfResponse, error) {
	return RequestPDFWithHost(t, req, "pdf3-proxy.pdf3.svc.cluster.local", nil)
}

// requestNewPDF sends a PDF generation request to the new PDF generator solution
func RequestNewPDFWithTestInput(t *testing.T, req *types.PdfRequest, testInput *ptesting.PdfInternalsTestInput) (*PdfResponse, error) {
	return RequestPDFWithHost(t, req, "pdf3-proxy.pdf3.svc.cluster.local", testInput)
}

// requestOldPDF sends a PDF generation request to the old PDF generator solution
func RequestOldPDF(t *testing.T, req *types.PdfRequest) (*PdfResponse, error) {
	return RequestPDFWithHost(t, req, "pdf-generator.pdf.svc.cluster.local", nil)
}

// requestPDF sends a PDF generation request to the proxy
func RequestPDFWithHost(t *testing.T, req *types.PdfRequest, overrideHost string, testInput *ptesting.PdfInternalsTestInput) (*PdfResponse, error) {
	reqBody, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	url := JumpboxURL + "/pdf"

	// Create HTTP client with 30s timeout for PDF generation
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	httpReq, err := http.NewRequest("POST", url, bytes.NewReader((reqBody)))
	if err != nil {
		return nil, err
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
	if !IsPDF(data) {
		t.Error("Response is not a valid PDF")
	}

	// In test internals mode, capture the worker IP for routing test output requests
	workerIP := ""
	if testInput != nil {
		workerIP = resp.Header.Get("X-Worker-IP")
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

// IsPDF checks if the given bytes represent a valid PDF file
func IsPDF(data []byte) bool {
	// PDF files start with %PDF-
	if len(data) < 5 {
		return false
	}
	return bytes.HasPrefix(data, []byte("%PDF-"))
}

func Snapshot(t *testing.T, data []byte, name string, ext string) {
	wd, err := os.Getwd()
	if err != nil {
		t.Fatalf("Couldn't get working directory: %v", err)
	}

	testName := strings.ReplaceAll(t.Name(), "/", "_")
	if name != "" {
		testName = fmt.Sprintf("%s_%s", testName, name)
	}

	var directoryMode os.FileMode
	wdStat, err := os.Stat(wd)
	if err != nil {
		directoryMode = 0755
		t.Logf("Failed to get working directory mode, defaulting to %d: %v", directoryMode, err)
	} else {
		directoryMode = wdStat.Mode()
	}
	directory := path.Join(wd, "_snapshots")
	err = os.MkdirAll(directory, directoryMode)
	if err != nil {
		t.Fatalf("Couldnt create snapshot directory: %v", err)
	}

	if ext == "" {
		ext = "txt"
	}
	fileName := path.Join(wd, "_snapshots", testName) + "." + ext

	if IsCI {
		existingData, err := os.ReadFile(fileName)
		if err != nil {
			t.Errorf("Error reading existing snapshot at: %s: %v", fileName, err)
			return
		} else if !bytes.Equal(existingData, data) {
			t.Errorf("Snapshots not equal for: %s", fileName)
			return
		}
	}

	err = os.WriteFile(fileName, data, 0644)
	if err != nil {
		t.Fatalf("Error writing snapshot: %v", err)
	}
}

// FindProjectRoot searches upward for a directory containing go.mod
// It starts from the current working directory and checks up to maxIterations parent directories
func FindProjectRoot() (string, error) {
	const maxIterations = 10

	// Get current working directory
	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}

	// Track the previous directory to detect when we've reached the filesystem root
	prevDir := ""

	for i := 0; i < maxIterations; i++ {
		// Check if go.mod exists in current directory
		goModPath := filepath.Join(dir, "go.mod")
		if _, err := os.Stat(goModPath); err == nil {
			return dir, nil
		}

		// Move to parent directory
		parentDir := filepath.Dir(dir)

		// Check if we've reached the filesystem root (dir == parentDir on Unix, or checking against previous)
		if parentDir == dir || parentDir == prevDir {
			return "", errors.New("reached filesystem root without finding go.mod")
		}

		prevDir = dir
		dir = parentDir
	}

	return "", errors.New("exceeded maximum iterations searching for go.mod")
}
