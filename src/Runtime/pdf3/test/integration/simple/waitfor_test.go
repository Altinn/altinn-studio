package simple_test

import (
	"testing"

	"altinn.studio/pdf3/internal/types"
	"altinn.studio/pdf3/test/harness"
)

// Test_WaitForVisible tests waiting for an element that starts hidden and becomes visible.
func Test_WaitForVisible(t *testing.T) {
	req := harness.GetDefaultPdfRequest(t)
	// Element will be initially hidden and become visible after 500ms
	req.URL = harness.TestServerURL + "/app/?render=light&initiallyhidden&becomesvisible=500"

	visible := true
	req.WaitFor = types.NewWaitForOptions(types.WaitForOptions{
		Selector: "#readyForPrint",
		Visible:  &visible,
		Timeout:  nil, // use default timeout
	})

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

// Test_WaitForHidden tests waiting for an element that starts visible and becomes hidden.
func Test_WaitForHidden(t *testing.T) {
	req := harness.GetDefaultPdfRequest(t)
	// Element will be visible initially and become hidden after 500ms
	req.URL = harness.TestServerURL + "/app/?render=light&becomeshidden=500"

	hidden := true
	req.WaitFor = types.NewWaitForOptions(types.WaitForOptions{
		Selector: "#readyForPrint",
		Hidden:   &hidden,
		Timeout:  nil, // use default timeout
	})

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

// Test_WaitForVisibleTimeout tests that timeout occurs when element never becomes visible.
func Test_WaitForVisibleTimeout(t *testing.T) {
	req := harness.GetDefaultPdfRequest(t)
	// Element will be initially hidden and stay hidden
	req.URL = harness.TestServerURL + "/app/?render=light&initiallyhidden"

	visible := true
	timeout := int32(2000) // 2 second timeout
	req.WaitFor = types.NewWaitForOptions(types.WaitForOptions{
		Selector: "#readyForPrint",
		Visible:  &visible,
		Timeout:  &timeout,
	})

	_, err := harness.RequestNewPDF(t, req)
	if err == nil {
		t.Fatal("Expected timeout error, but PDF generation succeeded")
	}

	// Verify the error is about element not ready
	t.Logf("Expected error occurred: %v", err)
}

// Test_WaitForHiddenTimeout tests that timeout occurs when element never becomes hidden.
func Test_WaitForHiddenTimeout(t *testing.T) {
	t.Skip(
		"Currently can't test this, it seems like PDF generation completes immediately (we cant add the div fast enough)",
	)

	req := harness.GetDefaultPdfRequest(t)
	// Element will be visible and stay visible
	req.URL = harness.TestServerURL + "/app/?render=light&becomeshidden=10000"

	hidden := true
	timeout := int32(2000) // 2 second timeout
	req.WaitFor = types.NewWaitForOptions(types.WaitForOptions{
		Selector: "#readyForPrint",
		Hidden:   &hidden,
		Timeout:  &timeout,
	})

	_, err := harness.RequestNewPDF(t, req)
	if err == nil {
		t.Fatal("Expected timeout error, but PDF generation succeeded")
	}

	// Verify the error is about element not ready
	t.Logf("Expected error occurred: %v", err)
}

// Test_WaitForNoVisibilityCheck tests that without visible/hidden flags, it works as before.
func Test_WaitForNoVisibilityCheck(t *testing.T) {
	req := harness.GetDefaultPdfRequest(t)
	// Element exists but is hidden - should still succeed without visibility check
	req.URL = harness.TestServerURL + "/app/?render=light&initiallyhidden"

	req.WaitFor = types.NewWaitForOptions(types.WaitForOptions{
		Selector: "#readyForPrint",
		Timeout:  nil, // use default timeout
	})

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

// Test_WaitForAlreadyVisible tests waiting for element that is already visible (immediate success).
func Test_WaitForAlreadyVisible(t *testing.T) {
	req := harness.GetDefaultPdfRequest(t)
	// Element will be visible from the start (no initiallyhidden)
	req.URL = harness.TestServerURL + "/app/?render=light"

	visible := true
	req.WaitFor = types.NewWaitForOptions(types.WaitForOptions{
		Selector: "#readyForPrint",
		Visible:  &visible,
		Timeout:  nil, // use default timeout
	})

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

// Test_WaitForAlreadyHidden tests waiting for element that is already hidden (immediate success).
func Test_WaitForAlreadyHidden(t *testing.T) {
	req := harness.GetDefaultPdfRequest(t)
	// Element will be hidden from the start
	req.URL = harness.TestServerURL + "/app/?render=light&initiallyhidden"

	hidden := true
	req.WaitFor = types.NewWaitForOptions(types.WaitForOptions{
		Selector: "#readyForPrint",
		Hidden:   &hidden,
		Timeout:  nil, // use default timeout
	})

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

// Test_WaitForClassSelector tests waiting for element using a class selector (general path)
// This tests the non-ID-optimized code path in waitForElement.
func Test_WaitForClassSelector(t *testing.T) {
	req := harness.GetDefaultPdfRequest(t)
	// Use class selector to wait for existing content div
	req.URL = harness.TestServerURL + "/app/?render=light"

	visible := true
	req.WaitFor = types.NewWaitForOptions(types.WaitForOptions{
		Selector: ".content", // Class selector instead of ID
		Visible:  &visible,
		Timeout:  nil, // use default timeout
	})

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

// Test_WaitForVisibleViaClassRemoval tests waiting for element that becomes visible via class removal
// This tests that MutationObserver detects class attribute changes.
func Test_WaitForVisibleViaClassRemoval(t *testing.T) {
	req := harness.GetDefaultPdfRequest(t)
	// Element starts with 'hidden' class and becomes visible by removing the class after 500ms
	req.URL = harness.TestServerURL + "/app/?render=light&initiallyhidden&becomesvisible=500&useclass"

	visible := true
	req.WaitFor = types.NewWaitForOptions(types.WaitForOptions{
		Selector: "#readyForPrint",
		Visible:  &visible,
		Timeout:  nil, // use default timeout
	})

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

// Test_WaitForHiddenViaClassAddition tests waiting for element that becomes hidden via class addition
// This tests that MutationObserver detects class attribute changes.
func Test_WaitForHiddenViaClassAddition(t *testing.T) {
	req := harness.GetDefaultPdfRequest(t)
	// Element starts visible and becomes hidden by adding 'hidden' class after 500ms
	req.URL = harness.TestServerURL + "/app/?render=light&becomeshidden=500&useclass"

	hidden := true
	req.WaitFor = types.NewWaitForOptions(types.WaitForOptions{
		Selector: "#readyForPrint",
		Hidden:   &hidden,
		Timeout:  nil, // use default timeout
	})

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
