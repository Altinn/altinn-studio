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
	"path/filepath"
	"strings"

	"altinn.studio/releaser/internal"
	"altinn.studio/releaser/internal/changelog"
)

var (
	errComponentRequired           = errors.New("component is required")
	errReleaseVersionRequired      = errors.New("version is required")
	errReleaseCommitBranchRequired = errors.New("commit and branch are required")
	errTagFormat                   = errors.New("invalid tag format: expected component/vX.Y.Z")
	errBaseHeadRequired            = errors.New("base and head are required")
	errChangelogNotModified        = errors.New("changelog was not modified")
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
  validate-changelog  Validate changelog was modified and has [Unreleased] content

Run 'releaser <command> -h' for command-specific help.
`)
}

func runWorkflow(args []string) error {
	fs := flag.NewFlagSet("workflow", flag.ExitOnError)
	tag := fs.String("tag", "", "Release tag (e.g., studioctl/v1.2.3)")
	component := fs.String("component", "", "Component name (e.g., studioctl)")
	version := fs.String("version", "", "Version to release (e.g., v1.2.3)")
	dryRun := fs.Bool("dry-run", false, "Validate without creating tags/releases")
	skipBranchCheck := fs.Bool("skip-branch-check", false, "Skip branch requirement (unsafe)")
	fs.Usage = func() {
		fmt.Print(`Usage: releaser workflow [options]

Runs the complete release workflow:
  1. Validates version format
  2. Enforces ref policy (prerelease from main, stable from release branch)
  3. Validates changelog has version section (use 'prepare' first)
  4. Builds release artifacts (if component has a builder)
  5. Creates GitHub release (tag created automatically)

Options:
`)
		fs.PrintDefaults()
		fmt.Print(`
Examples:
  releaser workflow --tag studioctl/v1.2.3
  releaser workflow -component studioctl -version v1.2.3
`)
	}
	if err := fs.Parse(args); err != nil {
		return fmt.Errorf("parse flags: %w", err)
	}

	comp, ver, err := resolveComponentVersion(*tag, *component, *version)
	if err != nil {
		fs.Usage()
		return err
	}

	req := internal.WorkflowRequest{
		Component:             comp,
		Version:               ver,
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
	fs.Usage = func() {
		fmt.Print(`Usage: releaser prepare -component <name> -version <version> [options]

Creates a PR to promote [Unreleased] changelog entries to the specified version.
After merging the PR, the release workflow will be triggered automatically.

Steps performed:
  1. Creates branch 'release-prep/<component>-<version>'
  2. Promotes [Unreleased] to [<version>] in CHANGELOG.md
  3. Commits the change
  4. Pushes the branch
  5. Creates PR with '<component>-release' label

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

	req := internal.PrepareRequest{
		Component:     *component,
		Version:       *version,
		ChangelogPath: "",
		DryRun:        *dryRun,
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
	fs.Usage = func() {
		fmt.Print(`Usage: releaser backport -component <name> -commit <sha> -branch <version> [options]

Cherry-picks a commit from main to a backport branch, handling changelog entries properly.

Steps performed:
  1. Extracts changelog entries from the commit's diff
  2. Fetches and checks out the release branch
  3. Creates a backport branch
  4. Cherry-picks the commit without auto-committing
  5. Restores the release branch's CHANGELOG.md (undoes cherry-picked changelog)
  6. Inserts extracted entries into [Unreleased] section
  7. Creates commit referencing original SHA
  8. Pushes the backport branch
  9. Creates a PR targeting the release branch (label: backport)

After merging the backport PR, use 'releaser prepare -component <name> -version vX.Y.Z'
to create the release PR.

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

	req := internal.BackportRequest{
		Component:     *component,
		Commit:        *commit,
		Branch:        *branch,
		ChangelogPath: "",
		DryRun:        *dryRun,
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
  2. Validates [Unreleased] section exists
  3. Validates [Unreleased] section has at least one category and entry

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

	comp, err := internal.GetComponent(*component)
	if err != nil {
		return fmt.Errorf("get component: %w", err)
	}

	ctx := context.Background()
	git := internal.NewGitCLI()

	// Get repo root for path resolution
	root, err := git.RepoRoot(ctx)
	if err != nil {
		return fmt.Errorf("get repo root: %w", err)
	}
	changelogPath := filepath.Join(root, comp.ChangelogPath)

	// Check if changelog was modified
	diffOutput, err := git.Run(ctx, "diff", "--name-only", *base, *head)
	if err != nil {
		return fmt.Errorf("git diff: %w", err)
	}

	modified := false
	for line := range strings.SplitSeq(diffOutput, "\n") {
		if strings.TrimSpace(line) == comp.ChangelogPath {
			modified = true
			break
		}
	}
	if !modified {
		return fmt.Errorf("%w: %s", errChangelogNotModified, comp.ChangelogPath)
	}

	// Validate [Unreleased] section
	//nolint:gosec // G304: changelog path comes from git rev-parse in the local repo.
	content, err := os.ReadFile(changelogPath)
	if err != nil {
		return fmt.Errorf("read changelog: %w", err)
	}

	cl, err := changelog.Parse(string(content))
	if err != nil {
		return fmt.Errorf("parse changelog: %w", err)
	}

	if err := cl.ValidateUnreleased(); err != nil {
		return fmt.Errorf("validate changelog: %w", err)
	}

	fmt.Printf("changelog validated: %s\n", comp.ChangelogPath)
	return nil
}

// resolveComponentVersion extracts component and version from either:
//   - --tag flag (e.g., "studioctl/v1.2.3")
//   - -component and -version flags
func resolveComponentVersion(tag, component, version string) (string, string, error) {
	if tag != "" {
		parts := strings.SplitN(tag, "/", 2)
		if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
			return "", "", fmt.Errorf("%w: %s", errTagFormat, tag)
		}
		return parts[0], parts[1], nil
	}

	if component == "" {
		return "", "", errComponentRequired
	}
	if version == "" {
		return "", "", errReleaseVersionRequired
	}
	return component, version, nil
}
