package internal

import (
	"context"
	"fmt"
)

// WorkflowRequest describes the inputs for the release workflow.
type WorkflowRequest struct {
	Component             string // Component name (e.g., "studioctl")
	Version               string // Exact promoted version (e.g., "v1.2.3-preview.1")
	Commit                string // Exact release commit expected at HEAD
	BaseBranch            string // Canonical branch containing Commit
	DryRun                bool
	Draft                 bool
	UnsafeSkipBranchCheck bool
}

type workflowRunDeps struct {
	git GitRunner
	gh  GitHubRunner
}

// RunWorkflow executes the release workflow.
func RunWorkflow(ctx context.Context, req WorkflowRequest, log Logger) error {
	deps := buildWorkflowRunDeps(req, log)
	return RunWorkflowWithDeps(ctx, req, deps.git, deps.gh, nil, log)
}

// RunWorkflowWithDeps executes the release workflow with injected dependencies.
func RunWorkflowWithDeps(
	ctx context.Context,
	req WorkflowRequest,
	git GitRunner,
	gh GitHubRunner,
	builder ComponentBuilder,
	log Logger,
) error {
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
	if req.Version == "" {
		return errReleaseVersionRequired
	}
	if req.Commit == "" {
		return errCommitRequired
	}
	if git == nil {
		return errGitRequired
	}
	if gh == nil {
		return errGitHubRequired
	}
	component, err := GetComponent(req.Component)
	if err != nil {
		return fmt.Errorf("get component: %w", err)
	}
	if planErr := validateWorkflowReleasePlan(component, req.BaseBranch, req.Version); planErr != nil {
		return fmt.Errorf("validate release plan: %w", planErr)
	}

	repoRoot, err := git.RepoRoot(ctx)
	if err != nil {
		return fmt.Errorf("get repo root: %w", err)
	}

	head, err := git.HeadCommit(ctx)
	if err != nil {
		return fmt.Errorf("resolve current HEAD: %w", err)
	}
	if head != req.Commit {
		return fmt.Errorf("%w: got %s, want %s", errCommitMismatch, head, req.Commit)
	}

	cfg := WorkflowConfig{
		Component:             req.Component,
		Version:               req.Version,
		ChangelogPath:         "",
		OutputDir:             "",
		RepoRoot:              repoRoot,
		DryRun:                req.DryRun,
		Draft:                 req.Draft,
		UnsafeSkipBranchCheck: req.UnsafeSkipBranchCheck,
	}
	workflow, err := NewWorkflow(ctx, cfg, git, gh, builder, log)
	if err != nil {
		return fmt.Errorf("create workflow: %w", err)
	}
	if err := workflow.Run(ctx); err != nil {
		return fmt.Errorf("release workflow: %w", err)
	}
	return nil
}

func buildWorkflowRunDeps(req WorkflowRequest, log Logger) workflowRunDeps {
	git := NewGitCLI(
		WithDryRun(req.DryRun),
		WithLogger(log),
	)
	gh := NewGitHubCLI(
		WithGHDryRun(req.DryRun),
		WithGHLogger(log),
	)

	return workflowRunDeps{
		git: git,
		gh:  gh,
	}
}
