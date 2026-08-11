package app

import (
	"bytes"
	"io"
	"slices"
	"strings"
	"testing"

	"altinn.studio/studioctl/internal/studioctlserver"
	"altinn.studio/studioctl/internal/ui"
)

func upgradeReportFixture() []studioctlserver.AppUpgradeStep {
	return []studioctlserver.AppUpgradeStep{
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
				{Text: "Migrated 3 file(s)", Status: studioctlserver.AppUpgradeStatusOK},
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
	}
}

func TestRenderUpgradeStepsRendersStatusLabels(t *testing.T) {
	t.Setenv("NO_COLOR", "1")

	var stdout bytes.Buffer
	renderUpgradeSteps(ui.NewOutput(&stdout, io.Discard, false), upgradeReportFixture())

	// The step name is a column of its own, repeated on every message the step reported, so each line
	// stands on its own and the statuses line up down the left edge.
	want := []string{
		" OK    Project file        Altinn.App packages set to 9.0.1",
		" SKIP  Dockerfile          Already targets net10.0",
		" OK    Removed v9 C# APIs  Migrated 3 file(s)",
		" INFO  Removed v9 C# APIs  Folder operations: 2 renamed",
		" WARN  Removed v9 C# APIs  SqlClient stays pinned at 5.1.0",
		" TODO  Removed v9 C# APIs  Validator.cs:42 implements IInstanceValidator",
		" FAIL  Data processors     Unexpected character at line 12",
	}

	got := strings.Split(strings.TrimSuffix(stdout.String(), "\n"), "\n")
	if len(got) != len(want) {
		t.Fatalf("line count = %d, want %d\ngot:\n%s", len(got), len(want), stdout.String())
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("line %d = %q, want %q", i, got[i], want[i])
		}
	}
}

func TestRenderUpgradeStepsKeepsMultilineTextAligned(t *testing.T) {
	t.Setenv("NO_COLOR", "1")

	var stdout bytes.Buffer
	renderUpgradeSteps(ui.NewOutput(&stdout, io.Discard, false), []studioctlserver.AppUpgradeStep{
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
	got := strings.Split(strings.TrimSuffix(stdout.String(), "\n"), "\n")
	if !slices.Equal(got, want) {
		t.Errorf("lines = %q, want %q", got, want)
	}
}

func TestPrintUpgradeResultKeepsBothReportAndFreeText(t *testing.T) {
	t.Setenv("NO_COLOR", "1")

	var stdout bytes.Buffer
	// An upgrade kind reports steps or free text, never both - but if one ever arrives with both, neither
	// may be dropped, so a stray step cannot hide what the upgrade wrote.
	PrintUpgradeResult(ui.NewOutput(&stdout, io.Discard, false), studioctlserver.AppUpgradeResult{
		Steps: []studioctlserver.AppUpgradeStep{
			{
				Name: "Staging changes",
				Messages: []studioctlserver.AppUpgradeMessage{
					{Text: "Staged 3 file(s)", Status: studioctlserver.AppUpgradeStatusOK},
				},
			},
		},
		Output: "free text from an older upgrade kind",
	})

	got := stdout.String()
	for _, want := range []string{"Staged 3 file(s)", "free text from an older upgrade kind"} {
		if !strings.Contains(got, want) {
			t.Errorf("output %q does not contain %q", got, want)
		}
	}
}
