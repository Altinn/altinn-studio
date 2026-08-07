package internal

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os/exec"
	"strconv"
	"strings"
)

// GitHub operation errors.
var (
	ErrGHCommandFailed = errors.New("gh command failed")
	ErrGHNotAvailable  = errors.New("gh CLI not available")
)

// GitHubRunner defines the interface for GitHub operations.
type GitHubRunner interface {
	// CreateRelease creates a GitHub release.
	CreateRelease(ctx context.Context, opts Options) error
	// FindRelease returns a release by tag and whether it exists.
	FindRelease(ctx context.Context, repository, tag string) (GitHubRelease, bool, error)
	// UpdateRelease updates a release and replaces matching draft assets.
	UpdateRelease(ctx context.Context, opts Options) error
	// CreatePR creates a GitHub pull request.
	CreatePR(ctx context.Context, opts PullRequestOptions) (string, error)
	// SetWorkdir sets the working directory for gh commands.
	SetWorkdir(dir string)
	// Repository resolves a remote against the built-in canonical identity.
	Repository(ctx context.Context, remoteURL string) (Repository, *Repository, error)
}

// PullRequestOptions configures a GitHub pull request.
type PullRequestOptions struct {
	Title      string
	Body       string
	Label      string
	Base       string
	Head       string
	Repository string
}

// Options configures a GitHub release.
type Options struct {
	Tag             string   // Required: tag name
	Title           string   // Required: release title
	NotesFile       string   // Path to release notes file
	Target          string   // Target branch for tag creation (if tag doesn't exist)
	Repository      string   // GitHub repository in OWNER/REPO form
	Assets          []string // Paths to assets to upload
	Draft           bool     // Create as draft
	Prerelease      bool     // Mark as prerelease
	FailOnNoCommits bool     // Fail if no new commits since last release
}

// GitHubRelease is the release state needed to validate a safe retry.
type GitHubRelease struct {
	TargetCommitish string `json:"targetCommitish"`
	IsDraft         bool   `json:"isDraft"`
}

// GitHubCLI implements GitHubRunner, using the gh CLI for mutations.
type GitHubCLI struct {
	log     Logger
	workdir string
	dryRun  bool
}

// GitHubCLIOption configures GitHubCLI.
type GitHubCLIOption func(*GitHubCLI)

// WithGHDryRun enables dry-run mode.
func WithGHDryRun(dryRun bool) GitHubCLIOption {
	return func(g *GitHubCLI) { g.dryRun = dryRun }
}

// WithGHLogger sets the logger.
func WithGHLogger(log Logger) GitHubCLIOption {
	return func(g *GitHubCLI) { g.log = log }
}

// NewGitHubCLI creates a new GitHubCLI instance.
func NewGitHubCLI(opts ...GitHubCLIOption) *GitHubCLI {
	g := &GitHubCLI{
		log:     NopLogger{},
		workdir: "",
		dryRun:  false,
	}
	for _, opt := range opts {
		opt(g)
	}
	return g
}

// CreateRelease creates a GitHub release using the gh CLI.
// If the tag doesn't exist, gh will create it automatically at the target branch.
func (g *GitHubCLI) CreateRelease(ctx context.Context, opts Options) error {
	args := []string{"release", "create", opts.Tag}

	if opts.Repository != "" {
		args = append(args, "--repo", opts.Repository)
	}
	if opts.Title != "" {
		args = append(args, "--title", opts.Title)
	}

	if opts.NotesFile != "" {
		args = append(args, "--notes-file", opts.NotesFile)
	}

	if opts.Target != "" {
		args = append(args, "--target", opts.Target)
	}

	if opts.Draft {
		args = append(args, "--draft")
	}

	if opts.Prerelease {
		args = append(args, "--prerelease")
	}

	if opts.FailOnNoCommits {
		args = append(args, "--fail-on-no-commits")
	}

	args = append(args, opts.Assets...)

	return g.runWrite(ctx, args...)
}

// FindRelease returns a GitHub release by tag.
func (g *GitHubCLI) FindRelease(ctx context.Context, repository, tag string) (GitHubRelease, bool, error) {
	args := []string{
		"release", "view", tag,
		"--json", "targetCommitish,isDraft",
	}
	if repository != "" {
		args = append(args, "--repo", repository)
	}
	output, err := g.runRead(ctx, args...)
	if err != nil {
		if strings.HasSuffix(strings.TrimSpace(err.Error()), ": release not found") {
			return GitHubRelease{
				TargetCommitish: "",
				IsDraft:         false,
			}, false, nil
		}
		return GitHubRelease{}, false, fmt.Errorf("find release %s: %w", tag, err)
	}
	var release GitHubRelease
	if err := json.Unmarshal([]byte(output), &release); err != nil {
		return GitHubRelease{}, false, fmt.Errorf("decode release %s: %w", tag, err)
	}
	return release, true, nil
}

// UpdateRelease updates an existing draft release and replaces matching assets.
func (g *GitHubCLI) UpdateRelease(ctx context.Context, opts Options) error {
	args := []string{"release", "edit", opts.Tag}
	if opts.Repository != "" {
		args = append(args, "--repo", opts.Repository)
	}
	if opts.Title != "" {
		args = append(args, "--title", opts.Title)
	}
	if opts.NotesFile != "" {
		args = append(args, "--notes-file", opts.NotesFile)
	}
	if opts.Target != "" {
		args = append(args, "--target", opts.Target)
	}
	args = append(
		args,
		"--draft="+strconv.FormatBool(opts.Draft),
		"--prerelease="+strconv.FormatBool(opts.Prerelease),
	)
	if err := g.runWrite(ctx, args...); err != nil {
		return err
	}
	if len(opts.Assets) == 0 {
		return nil
	}

	uploadArgs := []string{"release", "upload", opts.Tag}
	if opts.Repository != "" {
		uploadArgs = append(uploadArgs, "--repo", opts.Repository)
	}
	uploadArgs = append(uploadArgs, "--clobber")
	uploadArgs = append(uploadArgs, opts.Assets...)
	return g.runWrite(ctx, uploadArgs...)
}

// CreatePR creates a GitHub pull request using the gh CLI.
func (g *GitHubCLI) CreatePR(ctx context.Context, opts PullRequestOptions) (string, error) {
	args := []string{"pr", "create"}

	if opts.Repository != "" {
		args = append(args, "--repo", opts.Repository)
	}
	if opts.Title != "" {
		args = append(args, "--title", opts.Title)
	}
	if opts.Body != "" {
		args = append(args, "--body", opts.Body)
	}
	if opts.Label != "" {
		args = append(args, "--label", opts.Label)
	}
	if opts.Base != "" {
		args = append(args, "--base", opts.Base)
	}
	if opts.Head != "" {
		args = append(args, "--head", opts.Head)
	}

	output, err := g.runWriteOutput(ctx, args...)
	if err != nil {
		return "", err
	}

	if g.dryRun {
		return "", nil
	}

	prURL := extractPRURL(output)
	if prURL != "" {
		return prURL, nil
	}

	viewArgs := []string{"pr", "view"}
	if opts.Repository != "" {
		viewArgs = append(viewArgs, "--repo", opts.Repository)
	}
	viewArgs = append(viewArgs, "--json", "url", "--jq", ".url")
	fallbackURL, fallbackErr := g.runRead(ctx, viewArgs...)
	if fallbackErr == nil {
		prURL = strings.TrimSpace(fallbackURL)
	} else {
		g.log.Error("Could not determine PR URL from gh output: %v", fallbackErr)
	}
	return prURL, nil
}

// Repository resolves a remote URL against this releaser's canonical repository.
func (*GitHubCLI) Repository(
	_ context.Context,
	remoteURL string,
) (Repository, *Repository, error) {
	host, _, hosted := splitHostedRepositoryURL(remoteURL)
	if !hosted {
		// Local and file-based remotes are useful for dry runs and end-to-end tests.
		// They have no hosted identity, so the configured remote is both source and
		// push repository.
		return Repository{NameWithOwner: "", URL: remoteURL}, nil, nil
	}
	if !isGitHubRepositoryHost(remoteURL, host) {
		return Repository{}, nil, fmt.Errorf("%w: %s", errRepositoryHostMismatch, host)
	}

	selector := repositorySelectorFromURL(remoteURL)
	owner, name, found := strings.Cut(selector, "/")
	if !found || owner == "" || name == "" || strings.Contains(name, "/") {
		return Repository{}, nil, fmt.Errorf("%w: %s", errRepositoryURLInvalid, remoteURL)
	}
	repository := Repository{
		NameWithOwner: selector,
		URL:           remoteURL,
	}
	if strings.EqualFold(repository.NameWithOwner, canonicalRepositoryName) {
		return repository, nil, nil
	}

	parent := &Repository{
		NameWithOwner: canonicalRepositoryName,
		URL:           canonicalRepositoryURL,
	}
	return repository, parent, nil
}

// SetWorkdir sets the working directory for gh commands.
func (g *GitHubCLI) SetWorkdir(dir string) {
	g.workdir = dir
}

func (g *GitHubCLI) runWrite(ctx context.Context, args ...string) error {
	_, err := g.runWriteOutput(ctx, args...)
	return err
}

func (g *GitHubCLI) runWriteOutput(ctx context.Context, args ...string) (string, error) {
	if g.dryRun {
		g.log.Command("gh", append([]string{"(dry-run)"}, args...))
		return "", nil
	}

	g.log.Command("gh", args)

	//nolint:gosec // G204: executable is fixed to gh; args are the intended wrapper input.
	cmd := exec.CommandContext(ctx, "gh", args...)
	if g.workdir != "" {
		cmd.Dir = g.workdir
	}

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("%w: %s: %s", ErrGHCommandFailed, strings.Join(args, " "), stderr.String())
	}

	return strings.TrimSpace(stdout.String()), nil
}

func (g *GitHubCLI) runRead(ctx context.Context, args ...string) (string, error) {
	g.log.Command("gh", args)

	//nolint:gosec // G204: executable is fixed to gh; args are the intended wrapper input.
	cmd := exec.CommandContext(ctx, "gh", args...)
	if g.workdir != "" {
		cmd.Dir = g.workdir
	}

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("%w: %s: %s", ErrGHCommandFailed, strings.Join(args, " "), stderr.String())
	}

	return strings.TrimSpace(stdout.String()), nil
}

func extractPRURL(output string) string {
	for token := range strings.FieldsSeq(output) {
		if strings.HasPrefix(token, "https://") || strings.HasPrefix(token, "http://") {
			return strings.TrimRight(token, ".,);")
		}
	}
	return ""
}
