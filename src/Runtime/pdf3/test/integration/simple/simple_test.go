package simple

import (
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
