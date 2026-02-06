package internal

import (
	"context"
	"fmt"
)

// WorkflowRequest describes the inputs for the release workflow.
type WorkflowRequest struct {
	Component             string // Component name (e.g., "studioctl")
	Version               string // Version to release (e.g., "v1.0.0")
	DryRun                bool
	Draft                 bool
	UnsafeSkipBranchCheck bool
}

// RunWorkflow executes the release workflow.
func RunWorkflow(ctx context.Context, req WorkflowRequest, log Logger) error {
	if log == nil {
		log = NopLogger{}
	}
	if ctx == nil {
		return errContextRequired
	}
	if req.Component == "" {
		return errComponentRequired
	}
	if req.Version == "" {
		return errReleaseVersionRequired
	}

	git := NewGitCLI(
		WithDryRun(req.DryRun),
		WithLogger(log),
	)
	gh := NewGitHubCLI(
		WithGHDryRun(req.DryRun),
		WithGHLogger(log),
	)

	cfg := WorkflowConfig{
		Component:             req.Component,
		Version:               req.Version,
		ChangelogPath:         "",
		OutputDir:             "",
		RepoRoot:              "",
		DryRun:                req.DryRun,
		Draft:                 req.Draft,
		UnsafeSkipBranchCheck: req.UnsafeSkipBranchCheck,
	}
	// Pass nil builder - workflow will use the component's configured builder
	workflow, err := NewWorkflow(ctx, cfg, git, gh, nil, log)
	if err != nil {
		return fmt.Errorf("create workflow: %w", err)
	}
	if err := workflow.Run(ctx); err != nil {
		return fmt.Errorf("release workflow: %w", err)
	}
	return nil
}
