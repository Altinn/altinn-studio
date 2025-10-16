package simple

import (
	"bytes"
	"net/http"
	"os"
	"testing"
	"time"

	ptesting "altinn.studio/pdf3/internal/testing"
	"altinn.studio/pdf3/test/harness"
)

func TestMain(m *testing.M) {
	harness.Init()

	code := m.Run()
	os.Exit(code)
}

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

func Test_CompareOldAndNew(t *testing.T) {
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

	newPdf := makePdfDeterministic(t, newResp.Data)
	oldPdf := makePdfDeterministic(t, oldResp.Data)
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

func Test_WithCleanupDelay(t *testing.T) {
	req := harness.GetDefaultPdfRequest(t)
	req.URL = harness.TestServerURL + "/app/?render=light"

	testInput := ptesting.NewTestInput(3)
	resp, err := harness.RequestNewPDFWithTestInput(t, req, testInput)
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
