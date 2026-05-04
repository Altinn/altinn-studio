package ui_test

import (
	"bytes"
	"strings"
	"testing"

	"altinn.studio/studioctl/internal/ui"
)

func TestVerboseWritesToStderr(t *testing.T) {
	t.Setenv("NO_COLOR", "1")

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	out := ui.NewOutput(&stdout, &stderr, true)

	out.Verbose("details")

	if stdout.String() != "" {
		t.Fatalf("stdout = %q, want empty", stdout.String())
	}
	if got := stderr.String(); !strings.Contains(got, "details") {
		t.Fatalf("stderr = %q, want verbose output", got)
	}
}
