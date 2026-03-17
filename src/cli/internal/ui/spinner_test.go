package ui_test

import (
	"bytes"
	"strings"
	"sync"
	"testing"
	"time"

	"altinn.studio/studioctl/internal/ui"
)

// safeBuffer is a thread-safe wrapper around bytes.Buffer.
type safeBuffer struct {
	buf bytes.Buffer
	mu  sync.Mutex
}

func (sb *safeBuffer) Write(p []byte) (n int, err error) {
	sb.mu.Lock()
	defer sb.mu.Unlock()
	//nolint:wrapcheck // Test helper, no need to wrap buffer errors.
	return sb.buf.Write(p)
}

func (sb *safeBuffer) String() string {
	sb.mu.Lock()
	defer sb.mu.Unlock()
	return sb.buf.String()
}

func TestSpinner_OutputToConfiguredWriter(t *testing.T) {
	t.Parallel()

	buf := &safeBuffer{}
	out := ui.NewOutput(buf, buf, false)
	spinner := ui.NewSpinner(out, "Testing spinner")

	// Start the spinner and let it run briefly
	spinner.Start()
	time.Sleep(200 * time.Millisecond)
	spinner.Stop()
	time.Sleep(50 * time.Millisecond) // Allow goroutine to finish

	// Verify output was written to the buffer, not stdout
	output := buf.String()
	if !strings.Contains(output, "Testing spinner") {
		t.Errorf("expected output to contain 'Testing spinner', got: %q", output)
	}
}

func TestSpinner_StopWithSuccess(t *testing.T) {
	t.Parallel()

	buf := &safeBuffer{}
	out := ui.NewOutput(buf, buf, false)
	spinner := ui.NewSpinner(out, "Working")

	spinner.Start()
	time.Sleep(100 * time.Millisecond)
	spinner.StopWithSuccess("Done successfully")
	time.Sleep(50 * time.Millisecond) // Allow goroutine to finish

	output := buf.String()
	if !strings.Contains(output, "Done successfully") {
		t.Errorf("expected output to contain 'Done successfully', got: %q", output)
	}
	// Check for either colored checkmark or plain text
	if !strings.Contains(output, "✓") && !strings.Contains(output, "[ok]") {
		t.Errorf("expected output to contain success indicator (✓ or [ok]), got: %q", output)
	}
}

func TestSpinner_StopWithError(t *testing.T) {
	t.Parallel()

	buf := &safeBuffer{}
	out := ui.NewOutput(buf, buf, false)
	spinner := ui.NewSpinner(out, "Working")

	spinner.Start()
	time.Sleep(100 * time.Millisecond)
	spinner.StopWithError("Operation failed")
	time.Sleep(50 * time.Millisecond) // Allow goroutine to finish

	output := buf.String()
	if !strings.Contains(output, "Operation failed") {
		t.Errorf("expected output to contain 'Operation failed', got: %q", output)
	}
	// Check for either colored X or plain text
	if !strings.Contains(output, "✗") && !strings.Contains(output, "[error]") {
		t.Errorf("expected output to contain error indicator (✗ or [error]), got: %q", output)
	}
}
