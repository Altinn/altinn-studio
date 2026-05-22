package ui

import (
	"bytes"
	"strings"
	"testing"
)

func TestSpinner_UsesPlainOutputWhenTerminalDecorationsDisabled(t *testing.T) {
	setTerminalDecorationsForTest(t, false)

	var buf bytes.Buffer
	out := NewOutput(&buf, &buf, false)
	spinner := NewSpinner(out, "Completing installation...")

	spinner.Start()
	spinner.StopWithSuccess("Installation completed")

	output := buf.String()
	if !strings.Contains(output, "Completing installation...") {
		t.Fatalf("spinner output = %q, want start message", output)
	}
	if !strings.Contains(output, "[ok] Installation completed") {
		t.Fatalf("spinner output = %q, want plain success message", output)
	}
	for _, forbidden := range []string{"\x1b", "\r\033[K", "⠋", "✓"} {
		if strings.Contains(output, forbidden) {
			t.Fatalf("spinner output = %q, did not want %q", output, forbidden)
		}
	}
}
