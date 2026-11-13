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

// An Output for a JSON command drops stdout, still prints warnings on stderr and records them for the JSON.
func TestForJSONRecordsWarnings(t *testing.T) {
	t.Setenv("NO_COLOR", "1")

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	parent := ui.NewOutput(&stdout, &stderr, false)
	out := parent.ForJSON()

	out.Println("progress")
	out.Warning("first")
	out.Warningf("second %d", 2)

	if stdout.String() != "" {
		t.Fatalf("stdout = %q, want empty", stdout.String())
	}
	if got := stderr.String(); !strings.Contains(got, "first") || !strings.Contains(got, "second 2") {
		t.Fatalf("stderr = %q, want both warnings", got)
	}
	if got := out.Warnings(); len(got) != 2 || got[0] != "first" || got[1] != "second 2" {
		t.Fatalf("Warnings() = %q, want [first second 2]", got)
	}
	if got := parent.Warnings(); got != nil {
		t.Fatalf("parent Warnings() = %q, want nil", got)
	}
}
