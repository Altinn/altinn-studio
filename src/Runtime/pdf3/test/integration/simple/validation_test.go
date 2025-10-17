package simple

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"

	"altinn.studio/pdf3/internal/types"
	"altinn.studio/pdf3/test/harness"
)

func Test_Validation_MissingURL(t *testing.T) {
	t.Parallel()

	req := &types.PdfRequest{
		URL: "", // Invalid: empty URL
		Options: types.PdfOptions{
			Format: "A4",
		},
	}

	resp, statusCode, err := sendInvalidRequest(t, req)
	if err != nil {
		t.Fatalf("Failed to send request: %v", err)
	}

	if statusCode != http.StatusBadRequest {
		t.Errorf("Expected status code %d, got %d", http.StatusBadRequest, statusCode)
	}

	if !strings.Contains(resp, "url is required") {
		t.Errorf("Expected error message to contain 'url is required', got: %s", resp)
	}
}

func Test_Validation_InvalidFormat(t *testing.T) {
	t.Parallel()

	req := harness.GetDefaultPdfRequest(t)
	req.Options.Format = "InvalidFormat" // Invalid format

	resp, statusCode, err := sendInvalidRequest(t, req)
	if err != nil {
		t.Fatalf("Failed to send request: %v", err)
	}

	if statusCode != http.StatusBadRequest {
		t.Errorf("Expected status code %d, got %d", http.StatusBadRequest, statusCode)
	}

	if !strings.Contains(resp, "invalid format") {
		t.Errorf("Expected error message to contain 'invalid format', got: %s", resp)
	}
}

func Test_Validation_InvalidWaitForTimeout(t *testing.T) {
	t.Parallel()

	req := harness.GetDefaultPdfRequest(t)
	req.WaitFor = types.NewWaitForTimeout(-100) // Invalid: negative timeout

	resp, statusCode, err := sendInvalidRequest(t, req)
	if err != nil {
		t.Fatalf("Failed to send request: %v", err)
	}

	if statusCode != http.StatusBadRequest {
		t.Errorf("Expected status code %d, got %d", http.StatusBadRequest, statusCode)
	}

	if !strings.Contains(resp, "waitFor timeout must be >= 0") {
		t.Errorf("Expected error message to contain 'waitFor timeout must be >= 0', got: %s", resp)
	}
}

func Test_Validation_InvalidWaitForEmptyString(t *testing.T) {
	t.Parallel()

	req := harness.GetDefaultPdfRequest(t)
	req.WaitFor = types.NewWaitForString("") // Invalid: empty string

	resp, statusCode, err := sendInvalidRequest(t, req)
	if err != nil {
		t.Fatalf("Failed to send request: %v", err)
	}

	if statusCode != http.StatusBadRequest {
		t.Errorf("Expected status code %d, got %d", http.StatusBadRequest, statusCode)
	}

	if !strings.Contains(resp, "waitFor string must not be empty") {
		t.Errorf("Expected error message to contain 'waitFor string must not be empty', got: %s", resp)
	}
}

func Test_Validation_InvalidWaitForSelector(t *testing.T) {
	t.Parallel()

	req := harness.GetDefaultPdfRequest(t)
	req.WaitFor = types.NewWaitForOptions(types.WaitForOptions{
		Selector: "", // Invalid: empty selector
	})

	resp, statusCode, err := sendInvalidRequest(t, req)
	if err != nil {
		t.Fatalf("Failed to send request: %v", err)
	}

	if statusCode != http.StatusBadRequest {
		t.Errorf("Expected status code %d, got %d", http.StatusBadRequest, statusCode)
	}

	if !strings.Contains(resp, "waitFor selector must not be empty") {
		t.Errorf("Expected error message to contain 'waitFor selector must not be empty', got: %s", resp)
	}
}

func Test_Validation_InvalidCookieMissingName(t *testing.T) {
	t.Parallel()

	req := harness.GetDefaultPdfRequest(t)
	req.Cookies = []types.Cookie{
		{
			Name:  "", // Invalid: missing name
			Value: "value",
		},
	}

	resp, statusCode, err := sendInvalidRequest(t, req)
	if err != nil {
		t.Fatalf("Failed to send request: %v", err)
	}

	if statusCode != http.StatusBadRequest {
		t.Errorf("Expected status code %d, got %d", http.StatusBadRequest, statusCode)
	}

	if !strings.Contains(resp, "cookie[0]: name is required") {
		t.Errorf("Expected error message to contain 'cookie[0]: name is required', got: %s", resp)
	}
}

func Test_Validation_InvalidCookieMissingValue(t *testing.T) {
	t.Parallel()

	req := harness.GetDefaultPdfRequest(t)
	req.Cookies = []types.Cookie{
		{
			Name:  "test",
			Value: "", // Invalid: missing value
		},
	}

	resp, statusCode, err := sendInvalidRequest(t, req)
	if err != nil {
		t.Fatalf("Failed to send request: %v", err)
	}

	if statusCode != http.StatusBadRequest {
		t.Errorf("Expected status code %d, got %d", http.StatusBadRequest, statusCode)
	}

	if !strings.Contains(resp, "cookie[0]: value is required") {
		t.Errorf("Expected error message to contain 'cookie[0]: value is required', got: %s", resp)
	}
}

func Test_Validation_InvalidCookieSameSite(t *testing.T) {
	t.Parallel()

	req := harness.GetDefaultPdfRequest(t)
	req.Cookies = []types.Cookie{
		{
			Name:     "test",
			Value:    "value",
			SameSite: "Invalid", // Invalid: must be Strict or Lax
		},
	}

	resp, statusCode, err := sendInvalidRequest(t, req)
	if err != nil {
		t.Fatalf("Failed to send request: %v", err)
	}

	if statusCode != http.StatusBadRequest {
		t.Errorf("Expected status code %d, got %d", http.StatusBadRequest, statusCode)
	}

	if !strings.Contains(resp, "sameSite must be 'Strict' or 'Lax'") {
		t.Errorf("Expected error message to contain sameSite error, got: %s", resp)
	}
}

func Test_Validation_AllValidFormats(t *testing.T) {
	t.Parallel()

	for _, format := range types.ValidFormats {
		t.Run("format_"+format, func(t *testing.T) {
			req := harness.GetDefaultPdfRequest(t)
			req.URL = harness.TestServerURL + "/app/?render=light"
			req.Options.Format = format

			_, err := harness.RequestNewPDF(t, req)
			if err != nil {
				t.Errorf("Valid format %s should not fail validation: %v", format, err)
			}
		})
	}
}

func Test_Validation_ValidRequestStillWorks(t *testing.T) {
	req := harness.GetDefaultPdfRequest(t)
	req.URL = harness.TestServerURL + "/app/?render=light"

	resp, err := harness.RequestNewPDF(t, req)
	if err != nil {
		t.Fatalf("Valid request should not fail: %v", err)
	}

	if !harness.IsPDF(resp.Data) {
		t.Error("Response is not a valid PDF")
	}
}

// sendInvalidRequest sends a request that is expected to fail validation
// and returns the response body and status code
func sendInvalidRequest(_ *testing.T, req *types.PdfRequest) (string, int, error) {
	reqBody, err := json.Marshal(req)
	if err != nil {
		return "", 0, err
	}

	url := harness.JumpboxURL + "/pdf"

	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	httpReq, err := http.NewRequest("POST", url, bytes.NewReader(reqBody))
	if err != nil {
		return "", 0, err
	}
	httpReq.Host = "pdf3-proxy.runtime-pdf3.svc.cluster.local"
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(httpReq)
	if err != nil {
		return "", 0, err
	}
	defer func() { _ = resp.Body.Close() }()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", resp.StatusCode, err
	}

	return string(body), resp.StatusCode, nil
}
