package main

import (
	"errors"
	"testing"
)

func TestValidateWorkflowExecutionContext(t *testing.T) {
	check := func(t *testing.T, ci, gha string, dryRun bool, wantErr error) {
		t.Helper()

		t.Setenv("CI", ci)
		t.Setenv("GITHUB_ACTIONS", gha)

		err := validateWorkflowExecutionContext(dryRun)
		if wantErr == nil {
			if err != nil {
				t.Fatalf("ValidateWorkflowExecutionContext() unexpected error: %v", err)
			}
			return
		}
		if err == nil {
			t.Fatalf("ValidateWorkflowExecutionContext() expected error: %v", wantErr)
		}
		if !errors.Is(err, wantErr) {
			t.Fatalf("ValidateWorkflowExecutionContext() error = %v, want %v", err, wantErr)
		}
	}

	t.Run("dry run allowed outside ci", func(t *testing.T) {
		check(t, "", "", true, nil)
	})
	t.Run("allowed when ci is true", func(t *testing.T) {
		check(t, "true", "", false, nil)
	})
	t.Run("github actions alone is not enough", func(t *testing.T) {
		check(t, "", "true", false, errWorkflowRequiresCI)
	})
	t.Run("rejected outside ci", func(t *testing.T) {
		check(t, "", "", false, errWorkflowRequiresCI)
	})
}

func TestCLIArgValidation(t *testing.T) {
	t.Run("workflow requires component", func(t *testing.T) {
		err := runWorkflow([]string{"-base-branch", "main", "-dry-run"})
		if !errors.Is(err, errComponentRequired) {
			t.Fatalf("runWorkflow() error = %v, want %v", err, errComponentRequired)
		}
	})

	t.Run("workflow requires base branch", func(t *testing.T) {
		err := runWorkflow([]string{"-component", "studioctl", "-dry-run"})
		if !errors.Is(err, errBaseBranchRequired) {
			t.Fatalf("runWorkflow() error = %v, want %v", err, errBaseBranchRequired)
		}
	})

	t.Run("prepare requires version", func(t *testing.T) {
		err := runPrepare([]string{"-component", "studioctl"})
		if !errors.Is(err, errReleaseVersionRequired) {
			t.Fatalf("runPrepare() error = %v, want %v", err, errReleaseVersionRequired)
		}
	})

	t.Run("backport requires commit and branch", func(t *testing.T) {
		err := runBackport([]string{"-component", "studioctl"})
		if !errors.Is(err, errReleaseCommitBranchRequired) {
			t.Fatalf("runBackport() error = %v, want %v", err, errReleaseCommitBranchRequired)
		}
	})

	t.Run("validate changelog requires base and head", func(t *testing.T) {
		err := runValidateChangelog([]string{"-component", "studioctl"})
		if !errors.Is(err, errBaseHeadRequired) {
			t.Fatalf("runValidateChangelog() error = %v, want %v", err, errBaseHeadRequired)
		}
	})
}

func TestWorkflowCommandRequiresCI(t *testing.T) {
	t.Setenv("CI", "")
	t.Setenv("GITHUB_ACTIONS", "")

	err := runWorkflow([]string{"-component", "studioctl", "-base-branch", "main"})
	if !errors.Is(err, errWorkflowRequiresCI) {
		t.Fatalf("runWorkflow() error = %v, want %v", err, errWorkflowRequiresCI)
	}
}

func TestShouldPromptPrepare(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		dryRun      bool
		assumeYes   bool
		interactive bool
		want        bool
	}{
		{
			name:        "interactive default prompts",
			dryRun:      false,
			assumeYes:   false,
			interactive: true,
			want:        true,
		},
		{
			name:        "dry run does not prompt",
			dryRun:      true,
			assumeYes:   false,
			interactive: true,
			want:        false,
		},
		{
			name:        "yes flag does not prompt",
			dryRun:      false,
			assumeYes:   true,
			interactive: true,
			want:        false,
		},
		{
			name:        "non interactive does not prompt",
			dryRun:      false,
			assumeYes:   false,
			interactive: false,
			want:        false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got := shouldPromptPrepare(tc.dryRun, tc.assumeYes, tc.interactive)
			if got != tc.want {
				t.Fatalf("shouldPromptPrepare() = %v, want %v", got, tc.want)
			}
		})
	}
}
