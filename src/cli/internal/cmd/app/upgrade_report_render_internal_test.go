package app

import (
	"bytes"
	"io"
	"slices"
	"strings"
	"testing"

	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/studioctlserver"
	"altinn.studio/studioctl/internal/ui"
)

func renderedLines(t *testing.T, steps []studioctlserver.AppUpgradeStep) []string {
	t.Helper()
	t.Setenv("NO_COLOR", "1")

	var stdout bytes.Buffer
	renderUpgradeSteps(ui.NewOutput(&stdout, io.Discard, false), steps)
	rendered := strings.TrimSuffix(stdout.String(), osutil.LineBreak)
	return strings.Split(rendered, osutil.LineBreak)
}

func TestRenderUpgradeStepsRendersStatusLabels(t *testing.T) {
	got := renderedLines(t, []studioctlserver.AppUpgradeStep{
		{
			Name: "Project file",
			Messages: []studioctlserver.AppUpgradeMessage{
				{Text: "Altinn.App packages set to 9.0.1", Status: studioctlserver.AppUpgradeStatusOK},
			},
		},
		{
			Name: "Dockerfile",
			Messages: []studioctlserver.AppUpgradeMessage{
				{Text: "Already targets net10.0", Status: studioctlserver.AppUpgradeStatusSkip},
			},
		},
		{
			Name: "Removed v9 C# APIs",
			Messages: []studioctlserver.AppUpgradeMessage{
				{Text: "Folder operations: 2 renamed", Status: studioctlserver.AppUpgradeStatusInfo},
				{Text: "SqlClient stays pinned at 5.1.0", Status: studioctlserver.AppUpgradeStatusWarn},
				{Text: "Validator.cs:42 implements IInstanceValidator", Status: studioctlserver.AppUpgradeStatusTodo},
			},
		},
		{
			Name: "Data processors",
			Messages: []studioctlserver.AppUpgradeMessage{
				{Text: "Unexpected character at line 12", Status: studioctlserver.AppUpgradeStatusFail},
			},
		},
	})

	// The step name is a column of its own, repeated on every message the step reported, so each line
	// stands on its own and the statuses line up down the left edge.
	want := []string{
		" OK    Project file        Altinn.App packages set to 9.0.1",
		" SKIP  Dockerfile          Already targets net10.0",
		" INFO  Removed v9 C# APIs  Folder operations: 2 renamed",
		" WARN  Removed v9 C# APIs  SqlClient stays pinned at 5.1.0",
		" TODO  Removed v9 C# APIs  Validator.cs:42 implements IInstanceValidator",
		" FAIL  Data processors     Unexpected character at line 12",
	}
	if !slices.Equal(got, want) {
		t.Errorf("lines = %q, want %q", got, want)
	}
}

func TestRenderUpgradeStepsKeepsMultilineTextAligned(t *testing.T) {
	got := renderedLines(t, []studioctlserver.AppUpgradeStep{
		{
			Name: "Project file",
			Messages: []studioctlserver.AppUpgradeMessage{
				{Text: "first line\nsecond line\n", Status: studioctlserver.AppUpgradeStatusTodo},
			},
		},
	})

	// Exception text can be multi-line: the breaks are kept, and continuation lines align under the
	// first, with the label and the step name only on the first row.
	want := []string{
		" TODO  Project file  first line",
		"                     second line",
	}
	if !slices.Equal(got, want) {
		t.Errorf("lines = %q, want %q", got, want)
	}
}
