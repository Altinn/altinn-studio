package simple

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"testing"
	"time"

	ptesting "altinn.studio/pdf3/internal/testing"
	"altinn.studio/pdf3/internal/types"
	"altinn.studio/pdf3/test/harness"
)

func Test_Simple(t *testing.T) {
	req := harness.GetDefaultPdfRequest(t)
	req.URL = harness.TestServerURL + "/app/?render=light"

	resp, err := harness.RequestNewPDF(t, req)
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

func Test_Networking(t *testing.T) {
	url := harness.JumpboxURL + "/health/startup"

	client := &http.Client{
		Timeout: 3 * time.Second,
	}

	httpReq, err := http.NewRequest("GET", url, nil)
	if err != nil {
		t.Fatalf("Failed to create HTTP request: %v", err)
	}
	// Should not be able to reach worker directly
	httpReq.Host = "pdf3-worker.runtime-pdf3.svc.cluster.local"

	resp, err := client.Do(httpReq)
	if err == nil {
		t.Fatalf("Unexpectedly reached pdf3-worker from jumpbox: %d", resp.StatusCode)
	}

	harness.Snapshot(t, []byte(err.Error()), "error", "txt")
}

func Test_CompareOldAndNew(t *testing.T) {
	err := harness.Runtime.KubernetesClient.RolloutStatus("pdf-generator", "pdf", 2*time.Minute)
	if err != nil {
		t.Fatalf("Error waiting for old PDF generator: %v", err)
	}

	req := harness.GetDefaultPdfRequest(t)
	req.URL = harness.TestServerURL + "/app/?render=light"

	newResp, newErr := harness.RequestNewPDF(t, req)
	oldResp, oldErr := harness.RequestOldPDF(t, req)
	if newErr != nil {
		t.Errorf("New PDF generator failure: %v", newErr)
	}
	if oldErr != nil {
		t.Errorf("Old PDF generator failure: %v", oldErr)
	}
	if newErr != nil || oldErr != nil {
		return
	}

	newPdf := harness.MakePdfDeterministic(t, newResp.Data)
	oldPdf := harness.MakePdfDeterministic(t, oldResp.Data)
	harness.Snapshot(t, oldPdf, "old", "pdf")
	harness.Snapshot(t, newPdf, "new", "pdf")
	harness.Snapshot(t, oldPdf, "old", "txt")
	harness.Snapshot(t, newPdf, "new", "txt")

	output, err := newResp.LoadOutput(t)
	if err != nil {
		t.Errorf("Failed loading test output: %v", err)
	} else {
		harness.Snapshot(t, []byte(output.SnapshotString()), "testoutput", "json")
	}

	t.Logf("Generated PDF sizes: %d and %d bytes", len(newResp.Data), len(oldResp.Data))
}

func Test_WithConsoleErrors(t *testing.T) {
	req := harness.GetDefaultPdfRequest(t)
	// Page will log 1 console error
	req.URL = harness.TestServerURL + "/app/?render=light&logerrors=1"

	resp, err := harness.RequestNewPDF(t, req)
	if err != nil {
		t.Fatalf("Failed to generate PDF with console errors: %v", err)
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

func Test_WithThrownErrors(t *testing.T) {
	req := harness.GetDefaultPdfRequest(t)
	// Page will throw 2 errors (1 caught, last uncaught, which should result in error)
	req.URL = harness.TestServerURL + "/app/?render=light&throwerrors=2"

	resp, err := harness.RequestNewPDF(t, req)
	if err != nil {
		t.Fatalf("Failed to generate PDF with thrown errors: %v", err)
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

func Test_WaitForTimeoutWithErrors(t *testing.T) {
	t.Parallel()

	req := harness.GetDefaultPdfRequest(t)
	// Page will throw an error AND never show the ready element
	req.URL = harness.TestServerURL + "/app/?render=light&throwerrors=1&neverready"

	req.WaitFor = types.NewWaitForString("#readyForPrint")

	_, err := harness.RequestNewPDF(t, req)
	if err == nil {
		t.Fatal("Expected timeout error when element never appears, but PDF generation succeeded")
	}

	harness.Snapshot(t, []byte(err.Error()), "error", "txt")

	t.Logf("Expected error occurred: %v", err)

	req2 := harness.GetDefaultPdfRequest(t)
	req2.URL = harness.TestServerURL + "/app/?render=light"

	resp2, err2 := harness.RequestNewPDF(t, req2)
	if err2 != nil {
		t.Fatalf("Connection broken after timeout - subsequent request failed: %v", err2)
	}

	if !harness.IsPDF(resp2.Data) {
		t.Error("Subsequent response is not a valid PDF")
	}

	t.Logf("Connection healthy after timeout - subsequent PDF generated successfully (%d bytes)", len(resp2.Data))
}

func Test_WithCleanupDelay(t *testing.T) {
	req := harness.GetDefaultPdfRequest(t)
	req.URL = harness.TestServerURL + "/app/?render=light"

	testInput := ptesting.NewTestInput(3)
	resp, err := harness.RequestNewPDFWithTestInput(t, req, testInput)
	if err != nil {
		t.Fatalf("Failed to generate PDF while testing cleanup delay: %v", err)
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

func requestPDFWithCancellation(t *testing.T, req *types.PdfRequest, cancelAfter time.Duration) {
	// Marshal the request
	reqBody, err := json.Marshal(req)
	if err != nil {
		t.Fatalf("Failed to marshal request: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Record when we start
	startTime := time.Now()

	go func() {
		time.Sleep(cancelAfter)
		cancel()
	}()

	// Create the HTTP request with the cancellable context
	url := harness.JumpboxURL + "/pdf"
	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(reqBody))
	if err != nil {
		t.Fatalf("Failed to create HTTP request: %v", err)
	}
	httpReq.Host = "pdf3-proxy.runtime-pdf3.svc.cluster.local"
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{
		Timeout: types.RequestTimeout(),
	}

	resp, err := client.Do(httpReq)
	if err != nil {
		// TODO: this condition is hard to test, I think we have
		// to move away from the testinput/testoutput way of testing
		// and maybe just do snapshots/assertions based on OTel.
		// We would naturally be able to construct/analyze the traces and attributes

		// We expect an error due to context cancellation
		elapsed := time.Since(startTime)
		t.Logf("Request cancelled as expected after %s: %v", elapsed, err)
		harness.Snapshot(t, []byte(err.Error()), "error", "txt")

		// Verify cancellation happened reasonably quickly (within 2x the cancel time + small buffer)
		maxExpectedTime := cancelAfter*2 + 200*time.Millisecond
		if elapsed > maxExpectedTime {
			t.Errorf("Cancellation took too long: %s (expected < %s)", elapsed, maxExpectedTime)
		}

		// Verify system recovered by making a successful request
		t.Log("Verifying system recovered with a successful request...")
		followupReq := harness.GetDefaultPdfRequest(t)
		followupReq.URL = harness.TestServerURL + "/app/?render=light"

		followupResp, followupErr := harness.RequestNewPDF(t, followupReq)
		if followupErr != nil {
			t.Fatalf("System did not recover - follow-up request failed: %v", followupErr)
		}

		if !harness.IsPDF(followupResp.Data) {
			t.Error("Follow-up response is not a valid PDF")
		}

		t.Logf("System recovered successfully - follow-up PDF generated (%d bytes)", len(followupResp.Data))
		return
	}
	defer func() { _ = resp.Body.Close() }()

	// If we get here, the request completed before cancellation
	body, _ := io.ReadAll(resp.Body)
	t.Fatalf("Request completed before cancellation (status %d, body length %d bytes)", resp.StatusCode, len(body))
}

func Test_RequestCancellation(t *testing.T) {
	req := harness.GetDefaultPdfRequest(t)
	req.URL = harness.TestServerURL + "/app/?render=heavy" // Heavy targets ~2s

	requestPDFWithCancellation(t, req, 250*time.Millisecond)
}

func Test_RequestCancellationWaitForTimeout(t *testing.T) {
	req := harness.GetDefaultPdfRequest(t)
	req.URL = harness.TestServerURL + "/app/?render=heavy" // Heavy targets ~2s
	req.WaitFor = types.NewWaitForTimeout(5000)

	requestPDFWithCancellation(t, req, 250*time.Millisecond)
}
