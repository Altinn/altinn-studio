package cmd

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

func TestRenderUpgradeReportRendersStepsAndStatusLabels(t *testing.T) {
	t.Setenv("NO_COLOR", "1")

	var stdout bytes.Buffer
	renderUpgradeReport(ui.NewOutput(&stdout, io.Discard, false), upgradeReportFixture())

	want := []string{
		"Project file",
		"  OK    Altinn.App packages set to 9.0.1",
		"",
		"Dockerfile",
		"  SKIP  Already targets net10.0",
		"",
		"Removed v9 C# APIs",
		"  OK    Migrated 3 file(s)",
		"  INFO  Folder operations: 2 renamed",
		"  WARN  SqlClient stays pinned at 5.1.0",
		"  TODO  Validator.cs:42 implements IInstanceValidator",
		"",
		"Data processors",
		"  FAIL  Unexpected character at line 12",
		"",
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

func TestRenderUpgradeReportKeepsMultilineTextAligned(t *testing.T) {
	t.Setenv("NO_COLOR", "1")

	var stdout bytes.Buffer
	renderUpgradeReport(ui.NewOutput(&stdout, io.Discard, false), []studioctlserver.AppUpgradeStep{
		{
			Name: "Project file",
			Messages: []studioctlserver.AppUpgradeMessage{
				{Text: "first line\nsecond line\n", Status: studioctlserver.AppUpgradeStatusTodo},
			},
		},
	})

	// Exception text can be multi-line: the breaks are kept, and continuation lines align under the
	// first with the label only on the first row.
	want := []string{
		"Project file",
		"  TODO  first line",
		"        second line",
		"",
	}
	got := strings.Split(strings.TrimSuffix(stdout.String(), "\n"), "\n")
	if !slices.Equal(got, want) {
		t.Errorf("lines = %q, want %q", got, want)
	}
}
