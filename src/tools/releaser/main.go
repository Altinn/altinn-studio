// Package main provides a standalone release tooling CLI.
//
//nolint:forbidigo // CLI tool uses fmt.Print for output
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"os"

	"altinn.studio/releaser/internal"
)

var (
	errComponentRequired           = errors.New("component is required")
	errBaseBranchRequired          = errors.New("base-branch is required")
	errReleaseVersionRequired      = errors.New("version is required")
	errReleaseCommitBranchRequired = errors.New("commit and branch are required")
	errBaseHeadRequired            = errors.New("base and head are required")
	errWorkflowRequiresCI          = errors.New(
		"workflow command may only run in CI; use -dry-run for local validation",
	)
)

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	var err error
	switch os.Args[1] {
	case "workflow":
		err = runWorkflow(os.Args[2:])
	case "prepare":
		err = runPrepare(os.Args[2:])
	case "backport":
		err = runBackport(os.Args[2:])
	case "validate-changelog":
		err = runValidateChangelog(os.Args[2:])
	case "help", "-h", "--help":
		printUsage()
		return
	default:
		fmt.Fprintf(os.Stderr, "unknown command: %s\n\n", os.Args[1])
		printUsage()
		os.Exit(1)
	}

	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Print(`releaser - Release tooling for Altinn Studio components

Usage: releaser <command> [options]

Commands:
  workflow            Run the complete release workflow (for CI)
  prepare             Create a changelog promotion PR for release
  backport            Cherry-pick a commit to a release branch with changelog handling
  validate-changelog  Validate changelog was modified and release-ready

Notes:
  - workflow resolves the release version from CHANGELOG.md using -base-branch
  - non-dry-run workflow is CI-only (requires CI=true)

Run 'releaser <command> -h' for command-specific help.
`)
}

func runWorkflow(args []string) error {
	fs := flag.NewFlagSet("workflow", flag.ExitOnError)
	component := fs.String("component", "", "Component name (e.g., studioctl)")
	baseBranch := fs.String("base-branch", "", "Base branch (main or release/<component>/vX.Y)")
	dryRun := fs.Bool("dry-run", false, "Validate without creating tags/releases")
	skipBranchCheck := fs.Bool("skip-branch-check", false, "Skip branch requirement (unsafe)")
	fs.Usage = func() {
		fmt.Print(`Usage: releaser workflow [options]

Runs the complete release workflow. Version is derived from changelog:
  - base-branch=main -> latest prerelease version
  - base-branch=release/<component>/vX.Y -> latest stable on that line

Then it:
  1. Enforces ref policy (prerelease from main, stable from release branch)
  2. Validates changelog has version section (use 'prepare' first)
  3. Builds release artifacts (if component has a builder)
  4. Creates GitHub release (tag created automatically)

Options:
`)
		fs.PrintDefaults()
		fmt.Print(`
Examples:
  releaser workflow -component studioctl -base-branch main
  releaser workflow -component studioctl -base-branch release/studioctl/v1.2
`)
	}
	if err := fs.Parse(args); err != nil {
		return fmt.Errorf("parse flags: %w", err)
	}
	if *component == "" {
		fs.Usage()
		return errComponentRequired
	}
	if *baseBranch == "" {
		fs.Usage()
		return errBaseBranchRequired
	}

	if err := validateWorkflowExecutionContext(*dryRun); err != nil {
		return fmt.Errorf("validate workflow execution context: %w", err)
	}

	req := internal.WorkflowRequest{
		Component:             *component,
		BaseBranch:            *baseBranch,
		DryRun:                *dryRun,
		Draft:                 true,
		UnsafeSkipBranchCheck: *skipBranchCheck,
	}
	if err := internal.RunWorkflow(context.Background(), req, internal.NewConsoleLogger()); err != nil {
		return fmt.Errorf("workflow: %w", err)
	}
	return nil
}

func runPrepare(args []string) error {
	fs := flag.NewFlagSet("prepare", flag.ExitOnError)
	component := fs.String("component", "", "Component name (required, e.g., studioctl)")
	version := fs.String("version", "", "Version to release (required, e.g., v1.2.3)")
	dryRun := fs.Bool("dry-run", false, "Show what would be done without making changes")
	yes := fs.Bool("yes", false, "Skip confirmation prompts")
	yesShort := fs.Bool("y", false, "Alias for -yes")
	open := fs.Bool("open", false, "Open created PR in browser")
	fs.Usage = func() {
		fmt.Print(`Usage: releaser prepare -component <name> -version <version> [options]

Creates a PR to promote [Unreleased] changelog entries to the specified version.
After merging the PR, CI can run the release workflow if configured.

Version behavior:
  - vX.Y.Z-preview.N: prep PR targets main
  - vX.Y.0: creates release/<component>/vX.Y if missing, prep PR targets it
  - vX.Y.Z (Z>0): prep PR targets existing release/<component>/vX.Y

Steps performed:
  1. Creates branch 'release-prep/<component>-<version>'
  2. Promotes [Unreleased] to [<version>] in CHANGELOG.md
  3. Prompts before commit/push/PR actions (unless -y/-yes)
  4. Commits the change
  5. Pushes the branch
  6. Creates PR with 'release/<component>' label

Options:
`)
		fs.PrintDefaults()
	}
	if err := fs.Parse(args); err != nil {
		return fmt.Errorf("parse flags: %w", err)
	}
	if *component == "" {
		fs.Usage()
		return errComponentRequired
	}
	if *version == "" {
		fs.Usage()
		return errReleaseVersionRequired
	}

	assumeYes := *yes || *yesShort
	var prompter internal.ConfirmationPrompter
	if shouldPromptPrepare(*dryRun, assumeYes, isInteractiveInput(os.Stdin)) {
		prompter = internal.NewConsolePrompter()
	}

	req := internal.PrepareRequest{
		Component:     *component,
		Version:       *version,
		ChangelogPath: "",
		Open:          *open,
		DryRun:        *dryRun,
		Prompter:      prompter,
	}
	if err := internal.RunPrepare(context.Background(), req, internal.NewConsoleLogger()); err != nil {
		return fmt.Errorf("prepare: %w", err)
	}
	return nil
}

func runBackport(args []string) error {
	fs := flag.NewFlagSet("backport", flag.ExitOnError)
	component := fs.String("component", "", "Component name (required, e.g., studioctl)")
	commit := fs.String("commit", "", "Commit SHA to backport (required)")
	branch := fs.String("branch", "", "Release branch version (required, e.g., v1.0)")
	dryRun := fs.Bool("dry-run", false, "Show what would be done without making changes")
	yes := fs.Bool("yes", false, "Skip confirmation prompts")
	yesShort := fs.Bool("y", false, "Alias for -yes")
	open := fs.Bool("open", false, "Open created PR in browser")
	fs.Usage = func() {
		fmt.Print(`Usage: releaser backport -component <name> -commit <sha> -branch <version> [options]

Cherry-picks a commit from main to a backport branch, handling changelog entries properly.

Steps performed:
  1. Extracts changelog entries from the commit's diff
  2. Prompts if current branch is not main (unless -y/-yes)
  3. Fetches and checks out the release branch
  4. Creates a backport branch
  5. Cherry-picks the commit without auto-committing
  6. Restores the release branch's CHANGELOG.md (undoes cherry-picked changelog)
  7. Inserts extracted entries into [Unreleased] section
  8. Creates commit referencing original SHA
  9. Pushes the backport branch
 10. Creates a PR targeting the release branch (label: backport)

After merging the backport PR, use 'releaser prepare -component <name> -version vX.Y.Z'
to create the release PR (then CI can run the release workflow if configured).

Options:
`)
		fs.PrintDefaults()
	}
	if err := fs.Parse(args); err != nil {
		return fmt.Errorf("parse flags: %w", err)
	}
	if *component == "" {
		fs.Usage()
		return errComponentRequired
	}
	if *commit == "" || *branch == "" {
		fs.Usage()
		return errReleaseCommitBranchRequired
	}

	assumeYes := *yes || *yesShort
	var prompter internal.ConfirmationPrompter
	if shouldPromptPrepare(*dryRun, assumeYes, isInteractiveInput(os.Stdin)) {
		prompter = internal.NewConsolePrompter()
	}

	req := internal.BackportRequest{
		Component:     *component,
		Commit:        *commit,
		Branch:        *branch,
		ChangelogPath: "",
		Open:          *open,
		DryRun:        *dryRun,
		Prompter:      prompter,
	}
	if err := internal.RunBackport(context.Background(), req, internal.NewConsoleLogger()); err != nil {
		return fmt.Errorf("backport: %w", err)
	}
	return nil
}

func runValidateChangelog(args []string) error {
	fs := flag.NewFlagSet("validate-changelog", flag.ExitOnError)
	component := fs.String("component", "", "Component name (required, e.g., studioctl)")
	base := fs.String("base", "", "Base commit SHA (required)")
	head := fs.String("head", "", "Head commit SHA (required)")
	fs.Usage = func() {
		fmt.Print(`Usage: releaser validate-changelog -component <name> -base <sha> -head <sha>

Validates that the changelog was modified and has content in the [Unreleased] section.
Used in CI to enforce changelog updates in PRs.

Checks performed:
  1. Verifies changelog file was modified between base and head
  2. Validates [Unreleased] has at least one category and entry OR this is a release-promotion PR
  3. Validates released sections (if present) have no duplicates and are semver-descending

Options:
`)
		fs.PrintDefaults()
	}
	if err := fs.Parse(args); err != nil {
		return fmt.Errorf("parse flags: %w", err)
	}
	if *component == "" {
		fs.Usage()
		return errComponentRequired
	}
	if *base == "" || *head == "" {
		fs.Usage()
		return errBaseHeadRequired
	}

	req := internal.ValidationRequest{
		Component:     *component,
		Base:          *base,
		Head:          *head,
		ChangelogPath: "",
	}
	if err := internal.RunValidation(context.Background(), req, internal.NewConsoleLogger()); err != nil {
		return fmt.Errorf("validate changelog: %w", err)
	}

	fmt.Println("changelog validated")
	return nil
}

func shouldPromptPrepare(dryRun, assumeYes, interactive bool) bool {
	return !dryRun && !assumeYes && interactive
}

func isInteractiveInput(in *os.File) bool {
	if in == nil {
		return false
	}
	info, err := in.Stat()
	if err != nil {
		return false
	}
	return info.Mode()&os.ModeCharDevice != 0
}

func validateWorkflowExecutionContext(dryRun bool) error {
	if dryRun {
		return nil
	}
	if isCIEnvironment() {
		return nil
	}
	return errWorkflowRequiresCI
}

func isCIEnvironment() bool {
	return os.Getenv("CI") == "true"
}
