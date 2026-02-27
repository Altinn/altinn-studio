package internal

import (
	"context"
	"fmt"
)

// WorkflowRequest describes the inputs for the release workflow.
type WorkflowRequest struct {
	Component             string // Component name (e.g., "studioctl")
	BaseBranch            string // Derive version from changelog for this base branch
	DryRun                bool
	Draft                 bool
	UnsafeSkipBranchCheck bool
}

type workflowRunDeps struct {
	component *Component
	git       GitRunner
	gh        GitHubRunner
	repoRoot  string
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
	if req.BaseBranch == "" {
		return errBaseBranchRequired
	}

	deps, err := buildWorkflowRunDeps(ctx, req, log)
	if err != nil {
		return err
	}

	version, err := resolveWorkflowVersion(deps.component, req.BaseBranch, deps.repoRoot)
	if err != nil {
		return fmt.Errorf("resolve version: %w", err)
	}

	cfg := WorkflowConfig{
		Component:             req.Component,
		Version:               version,
		ChangelogPath:         "",
		OutputDir:             "",
		RepoRoot:              deps.repoRoot,
		DryRun:                req.DryRun,
		Draft:                 req.Draft,
		UnsafeSkipBranchCheck: req.UnsafeSkipBranchCheck,
	}
	workflow, err := NewWorkflow(ctx, cfg, deps.git, deps.gh, nil, log)
	if err != nil {
		return fmt.Errorf("create workflow: %w", err)
	}
	if err := workflow.Run(ctx); err != nil {
		return fmt.Errorf("release workflow: %w", err)
	}
	return nil
}

func buildWorkflowRunDeps(ctx context.Context, req WorkflowRequest, log Logger) (workflowRunDeps, error) {
	component, err := GetComponent(req.Component)
	if err != nil {
		return workflowRunDeps{}, fmt.Errorf("get component: %w", err)
	}

	git := NewGitCLI(
		WithDryRun(req.DryRun),
		WithLogger(log),
	)
	gh := NewGitHubCLI(
		WithGHDryRun(req.DryRun),
		WithGHLogger(log),
	)

	repoRoot, err := git.RepoRoot(ctx)
	if err != nil {
		return workflowRunDeps{}, fmt.Errorf("get repo root: %w", err)
	}

	return workflowRunDeps{
		component: component,
		git:       git,
		gh:        gh,
		repoRoot:  repoRoot,
	}, nil
}
