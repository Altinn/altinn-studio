package internal

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"altinn.studio/releaser/internal/changelog"
	"altinn.studio/releaser/internal/perm"
	semver "altinn.studio/releaser/internal/version"
)

const (
	prepareKindPatch         = "patch"
	prepareKindPrerelease    = "prerelease"
	prepareKindStabilization = "stabilization"
)

type releasePrepConfig struct {
	component           *Component
	version             *semver.Version
	branchName          string
	baseBranch          string
	baseCommit          string
	releaseBranch       string
	previousVersion     string
	prTitle             string
	prBody              string
	promoted            string
	promotedSection     string
	topology            RepositoryTopology
	createReleaseBranch bool
}

// PrepareRequest describes the inputs for a release prepare operation.
type PrepareRequest struct {
	Prompter      ConfirmationPrompter
	Component     string
	Version       string
	Kind          string
	Line          string
	ChangelogPath string
	Open          bool
	DryRun        bool
}

// RunPrepare executes the release prepare workflow.
func RunPrepare(ctx context.Context, req PrepareRequest, log Logger) error {
	if log == nil {
		log = NopLogger{}
	}
	git := NewGitCLI(WithLogger(log))
	gh := NewGitHubCLI(WithGHLogger(log))
	return RunPrepareWithDeps(ctx, req, git, gh, log)
}

// RunPrepareWithDeps executes the release prepare workflow with injected dependencies.
func RunPrepareWithDeps(ctx context.Context, req PrepareRequest, git *GitCLI, gh GitHubRunner, log Logger) error {
	if log == nil {
		log = NopLogger{}
	}
	if err := validatePrepareRequest(ctx, req); err != nil {
		return err
	}

	comp, err := GetComponent(req.Component)
	if err != nil {
		return fmt.Errorf("get component: %w", err)
	}

	log.Step("Preparing release PR for " + comp.Name)
	current, err := git.CurrentBranch(ctx)
	if err != nil {
		return fmt.Errorf("get current branch: %w", err)
	}
	log.Detail("Current branch", current)
	repoRoot, err := git.RepoRoot(ctx)
	if err != nil {
		return err
	}
	log.Detail("Repo root", repoRoot)
	topology, err := discoverRepositoryTopology(ctx, git, gh)
	if err != nil {
		return err
	}
	log.Detail("Canonical repository", displayRepository(topology.BaseRepository))
	log.Detail("Source remote", topology.SourceRemote)
	log.Detail("Push remote", topology.PushRemote)

	clPath := req.ChangelogPath
	if clPath == "" {
		clPath = comp.ChangelogPath
	}

	version, err := resolvePrepareRequestVersion(
		ctx,
		git,
		comp,
		req,
		topology.SourceRemote,
		clPath,
		current,
	)
	if err != nil {
		return err
	}
	log.Detail("Release version", version)

	cfg, err := prepareReleasePrepConfig(ctx, git, comp, topology, version, req.Kind, req.Line, clPath)
	if err != nil {
		return err
	}
	log.Detail("Prep branch", cfg.branchName)
	log.Detail("Base branch", cfg.baseBranch)
	if cfg.createReleaseBranch {
		log.Detail("Release branch", cfg.releaseBranch)
	}

	if req.DryRun {
		printReleasePrepDryRun(log, cfg)
		return nil
	}

	if err := ensureWorkingTreeClean(ctx, git, log); err != nil {
		return err
	}
	remoteBase := cfg.topology.SourceRemote + "/" + cfg.baseBranch
	if cfg.createReleaseBranch {
		remoteBase = cfg.topology.SourceRemote + "/" + mainBranch
	}
	if err := confirmNonMainBranch(req.Prompter, current, "prepare",
		"Will create and switch to new working branches from latest "+remoteBase+".",
		"This changes your current branch context; cancel if you do not want to branch right now.",
	); err != nil {
		return err
	}

	return executeReleasePrepare(ctx, git, gh, log, repoRoot, clPath, cfg, req.Prompter, req.Open)
}

func validatePrepareRequest(ctx context.Context, req PrepareRequest) error {
	if ctx == nil {
		return errContextRequired
	}
	if req.Component == "" {
		return errComponentRequired
	}
	if req.Version == "" && req.Kind == "" {
		return errReleaseVersionRequired
	}
	if req.Version != "" && req.Kind != "" {
		return errReleaseVersionConflict
	}
	return nil
}

func prepareReleasePrepConfig(
	ctx context.Context,
	git *GitCLI,
	comp *Component,
	topology RepositoryTopology,
	version, kind, line, clPath string,
) (*releasePrepConfig, error) {
	verStr := version
	if !strings.HasPrefix(verStr, "v") {
		verStr = "v" + verStr
	}

	ver, err := semver.Parse(verStr)
	if err != nil {
		return nil, fmt.Errorf("parse version: %w", err)
	}

	tag := NewTag(comp, ver)

	baseBranch, createReleaseBranch, err := determineBranchStrategy(
		ctx,
		git,
		topology.SourceRemote,
		tag,
	)
	if err != nil {
		return nil, err
	}

	sourceBranch := baseBranch
	if createReleaseBranch {
		sourceBranch = mainBranch // First stable release lines are cut from main before promotion.
	}
	cl, baseCommit, err := loadReleasePrepChangelog(
		ctx,
		git,
		comp,
		topology.SourceRemote,
		sourceBranch,
		kind,
		line,
		verStr,
		clPath,
	)
	if err != nil {
		return nil, err
	}

	if cl.HasVersion(verStr) {
		return nil, fmt.Errorf("%w: %s", errChangelogVersionExists, verStr)
	}

	promotedCl, err := cl.Promote(verStr, time.Now())
	if err != nil {
		return nil, fmt.Errorf("promote changelog: %w", err)
	}
	previousVersion := previousReleasedVersion(promotedCl, verStr)
	promoted := promotedCl.String()
	promotedSection, err := promotedReleaseSection(promotedCl, verStr)
	if err != nil {
		return nil, fmt.Errorf("format promoted release section: %w", err)
	}
	prBody, err := buildPreparePRBody(comp, verStr, promotedCl)
	if err != nil {
		return nil, fmt.Errorf("build PR body: %w", err)
	}

	return &releasePrepConfig{
		component:           comp,
		version:             ver,
		branchName:          comp.PrepBranch(verStr),
		baseBranch:          baseBranch,
		baseCommit:          baseCommit,
		createReleaseBranch: createReleaseBranch,
		releaseBranch:       tag.ReleaseBranch(),
		previousVersion:     previousVersion,
		prTitle:             "chore: release " + comp.ReleaseTitle(verStr),
		prBody:              prBody,
		promoted:            promoted,
		promotedSection:     promotedSection,
		topology:            topology,
	}, nil
}

func loadReleasePrepChangelog(
	ctx context.Context,
	git *GitCLI,
	comp *Component,
	sourceRemote, sourceBranch, kind, line, version, clPath string,
) (*changelog.Changelog, string, error) {
	content, baseCommit, err := readRemoteFileAtCommit(
		ctx,
		git,
		sourceRemote,
		sourceBranch,
		clPath,
	)
	if err != nil {
		return nil, "", fmt.Errorf("read changelog: %w", err)
	}

	cl, err := changelog.Parse(content)
	if err != nil {
		return nil, "", fmt.Errorf("parse changelog: %w", err)
	}
	switch strings.ToLower(strings.TrimSpace(kind)) {
	case prepareKindPrerelease:
		actual, validationErr := resolvePrereleaseVersion(
			ctx,
			git,
			comp,
			sourceRemote,
			line,
			cl,
		)
		if validationErr != nil {
			return nil, "", fmt.Errorf("revalidate prerelease candidate: %w", validationErr)
		}
		if actual != version {
			return nil, "", fmt.Errorf(
				"%w: initially resolved %s while pinned main resolves %s",
				errPrereleaseMismatch,
				version,
				actual,
			)
		}
	case prepareKindStabilization:
		if validationErr := validateStabilizationCandidate(cl, version, sourceBranch); validationErr != nil {
			return nil, "", validationErr
		}
	}
	return cl, baseCommit, nil
}

func resolvePrepareRequestVersion(
	ctx context.Context,
	git *GitCLI,
	comp *Component,
	req PrepareRequest,
	sourceRemote, clPath, currentBranch string,
) (string, error) {
	if req.Version != "" {
		if req.Line != "" {
			return "", errReleaseLineConflict
		}
		return normalizeVersionPrefix(req.Version), nil
	}

	kind := strings.ToLower(strings.TrimSpace(req.Kind))
	if kind == prepareKindStabilization && req.Line != "" {
		return "", errReleaseLineConflict
	}
	switch kind {
	case prepareKindPrerelease:
		return resolveNextPrereleaseVersion(ctx, git, comp, sourceRemote, clPath, req.Line)
	case prepareKindStabilization:
		return resolveStabilizationVersion(ctx, git, comp, sourceRemote, clPath)
	case prepareKindPatch:
		return resolveNextPatchVersion(
			ctx,
			git,
			comp,
			sourceRemote,
			req.Line,
			currentBranch,
			clPath,
		)
	default:
		return "", fmt.Errorf("%w: %s", errReleaseKindInvalid, req.Kind)
	}
}

func normalizeVersionPrefix(version string) string {
	version = strings.TrimSpace(version)
	if strings.HasPrefix(version, "v") {
		return version
	}
	return "v" + version
}

func resolveNextPrereleaseVersion(
	ctx context.Context,
	git *GitCLI,
	comp *Component,
	sourceRemote, clPath, line string,
) (string, error) {
	cl, err := readRemoteChangelog(ctx, git, sourceRemote, mainBranch, clPath)
	if err != nil {
		return "", err
	}
	return resolvePrereleaseVersion(ctx, git, comp, sourceRemote, line, cl)
}

func resolvePrereleaseVersion(
	ctx context.Context,
	git *GitCLI,
	comp *Component,
	sourceRemote, line string,
	cl *changelog.Changelog,
) (string, error) {
	prerelease, err := activePrereleaseVersion(cl)
	if err != nil {
		return "", err
	}
	if line != "" {
		return resolvePlannedPrereleaseVersion(
			ctx,
			git,
			comp,
			sourceRemote,
			line,
			prerelease,
			plannedPrereleaseChannel(prerelease),
		)
	}
	channel, sequence, err := splitNumberedPrerelease(prerelease)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf(
		"v%d.%d.%d-%s.%d",
		prerelease.Major,
		prerelease.Minor,
		prerelease.Patch,
		channel,
		sequence+1,
	), nil
}

func plannedPrereleaseChannel(version *semver.Version) string {
	identifiers := strings.Split(version.Prerelease, ".")
	if len(identifiers) < 2 {
		return version.Prerelease
	}
	if _, err := strconv.Atoi(identifiers[len(identifiers)-1]); err != nil {
		return version.Prerelease
	}
	return strings.Join(identifiers[:len(identifiers)-1], ".")
}

func resolvePlannedPrereleaseVersion(
	ctx context.Context,
	git *GitCLI,
	comp *Component,
	sourceRemote, line string,
	active *semver.Version,
	channel string,
) (string, error) {
	major, minor, err := parseReleaseLine(line)
	if err != nil {
		return "", err
	}
	if major < active.Major || major == active.Major && minor <= active.Minor {
		return "", fmt.Errorf(
			"%w: %s is not newer than v%d.%d",
			errPrereleaseLineNotNewer,
			line,
			active.Major,
			active.Minor,
		)
	}

	activeReleaseBranch := comp.ReleaseBranch(active.Major, active.Minor)
	exists, err := git.RemoteBranchExists(ctx, sourceRemote, activeReleaseBranch)
	if err != nil {
		return "", fmt.Errorf("check release branch: %w", err)
	}
	if !exists {
		return "", fmt.Errorf("%w: %s", errPrereleaseLineOpen, activeReleaseBranch)
	}

	return fmt.Sprintf("v%d.%d.0-%s.1", major, minor, channel), nil
}

func resolveStabilizationVersion(
	ctx context.Context,
	git *GitCLI,
	comp *Component,
	sourceRemote, clPath string,
) (string, error) {
	cl, err := readRemoteChangelog(ctx, git, sourceRemote, mainBranch, clPath)
	if err != nil {
		return "", err
	}
	prerelease, err := activePrereleaseVersion(cl)
	if err != nil {
		return "", err
	}
	mainCandidate := stableVersionFor(prerelease)
	releaseBranch := comp.ReleaseBranch(prerelease.Major, prerelease.Minor)
	exists, err := git.RemoteBranchExists(ctx, sourceRemote, releaseBranch)
	if err != nil {
		return "", fmt.Errorf("check release branch: %w", err)
	}
	if !exists {
		return mainCandidate, nil
	}

	releaseChangelog, err := readRemoteChangelog(ctx, git, sourceRemote, releaseBranch, clPath)
	if err != nil {
		return "", err
	}
	releasePrerelease, err := activePrereleaseVersion(releaseChangelog)
	if err != nil {
		return "", fmt.Errorf("resolve stabilization from %s: %w", releaseBranch, err)
	}
	releaseCandidate := stableVersionFor(releasePrerelease)
	if releaseCandidate != mainCandidate {
		return "", fmt.Errorf(
			"%w: main resolves %s while %s resolves %s",
			errStabilizationMismatch,
			mainCandidate,
			releaseBranch,
			releaseCandidate,
		)
	}
	return releaseCandidate, nil
}

func stableVersionFor(prerelease *semver.Version) string {
	return fmt.Sprintf("v%d.%d.%d", prerelease.Major, prerelease.Minor, prerelease.Patch)
}

func validateStabilizationCandidate(
	cl *changelog.Changelog,
	expected, sourceBranch string,
) error {
	prerelease, err := activePrereleaseVersion(cl)
	if err != nil {
		return fmt.Errorf("resolve stabilization from %s: %w", sourceBranch, err)
	}
	actual := stableVersionFor(prerelease)
	if actual != expected {
		return fmt.Errorf(
			"%w: expected %s while %s resolves %s",
			errStabilizationMismatch,
			expected,
			sourceBranch,
			actual,
		)
	}
	return nil
}

func resolveNextPatchVersion(
	ctx context.Context,
	git *GitCLI,
	comp *Component,
	sourceRemote, line, currentBranch, clPath string,
) (string, error) {
	major, minor, err := resolvePatchLine(comp, line, currentBranch)
	if err != nil {
		return "", err
	}
	releaseBranch := comp.ReleaseBranch(major, minor)
	content, err := readRemoteFile(ctx, git, sourceRemote, releaseBranch, clPath)
	if err != nil {
		return "", fmt.Errorf("read changelog from %s: %w", releaseBranch, err)
	}
	return nextPatchVersionHint(content, major, minor)
}

func readRemoteChangelog(
	ctx context.Context,
	git *GitCLI,
	sourceRemote, branch, clPath string,
) (*changelog.Changelog, error) {
	content, err := readRemoteFile(ctx, git, sourceRemote, branch, clPath)
	if err != nil {
		return nil, fmt.Errorf("read changelog from %s: %w", branch, err)
	}
	cl, err := changelog.Parse(content)
	if err != nil {
		return nil, fmt.Errorf("parse changelog from %s: %w", branch, err)
	}
	return cl, nil
}

func activePrereleaseVersion(cl *changelog.Changelog) (*semver.Version, error) {
	if cl == nil {
		return nil, errChangelogNil
	}
	if len(cl.Versions) == 0 || cl.Versions[0] == nil || cl.Versions[0].Version == nil {
		return nil, errNoActivePrereleaseLine
	}
	version := cl.Versions[0].Version
	if !version.IsPrerelease {
		return nil, fmt.Errorf("%w: latest release is %s", errNoActivePrereleaseLine, version.String())
	}
	return version, nil
}

func splitNumberedPrerelease(version *semver.Version) (string, int, error) {
	identifiers := strings.Split(version.Prerelease, ".")
	if len(identifiers) < 2 {
		return "", 0, fmt.Errorf("%w: %s", errPrereleaseSeqInvalid, version.String())
	}

	last := identifiers[len(identifiers)-1]
	sequence, err := strconv.Atoi(last)
	if err != nil {
		return "", 0, fmt.Errorf("%w: %s", errPrereleaseSeqInvalid, version.String())
	}

	channel := strings.Join(identifiers[:len(identifiers)-1], ".")
	if channel == "" {
		return "", 0, fmt.Errorf("%w: %s", errPrereleaseSeqInvalid, version.String())
	}
	return channel, sequence, nil
}

func resolvePatchLine(comp *Component, line, currentBranch string) (int, int, error) {
	line = strings.TrimSpace(line)
	if line != "" {
		return parseReleaseLine(line)
	}

	currentBranch = strings.TrimSpace(currentBranch)
	if currentBranch == "" || currentBranch == mainBranch {
		return 0, 0, errReleaseLineRequired
	}
	selector, err := parseBaseBranchSelector(comp.Name, currentBranch)
	if err != nil || selector.isMain {
		return 0, 0, errReleaseLineRequired
	}
	return selector.major, selector.minor, nil
}

func displayPreviousVersion(previousVersion string) string {
	if previousVersion == "" {
		return "(none found)"
	}
	return previousVersion
}

func readRemoteFile(ctx context.Context, git *GitCLI, sourceRemote, branch, path string) (string, error) {
	content, _, err := readRemoteFileAtCommit(ctx, git, sourceRemote, branch, path)
	return content, err
}

func readRemoteFileAtCommit(
	ctx context.Context,
	git *GitCLI,
	sourceRemote, branch, path string,
) (string, string, error) {
	if _, err := git.Run(ctx, "fetch", sourceRemote, branch); err != nil {
		return "", "", fmt.Errorf("fetch %s/%s: %w", sourceRemote, branch, err)
	}
	remoteRef := sourceRemote + "/" + branch
	commit, err := git.Run(ctx, "rev-parse", remoteRef)
	if err != nil {
		return "", "", fmt.Errorf("resolve %s: %w", remoteRef, err)
	}
	content, err := git.Run(ctx, "show", commit+":"+path)
	if err != nil {
		return "", "", err
	}
	return content, commit, nil
}

func determineBranchStrategy(
	ctx context.Context,
	git *GitCLI,
	sourceRemote string,
	tag *Tag,
) (string, bool, error) {
	releaseBranch := tag.ReleaseBranch()
	switch {
	case tag.Version.IsPrerelease:
		exists, err := git.RemoteBranchExists(ctx, sourceRemote, releaseBranch)
		if err != nil {
			return "", false, fmt.Errorf("check release branch: %w", err)
		}
		if exists {
			return "", false, fmt.Errorf(
				"%w: %s has %s",
				errPrereleaseLineClosed,
				tag.Version.String(),
				releaseBranch,
			)
		}
		return mainBranch, false, nil
	case tag.Version.IsPatchRelease():
		exists, err := git.RemoteBranchExists(ctx, sourceRemote, releaseBranch)
		if err != nil {
			return "", false, err
		}
		if !exists {
			return "", false, fmt.Errorf("%w: %s", errReleaseBranchMissing, releaseBranch)
		}
		return releaseBranch, false, nil
	default:
		exists, err := git.RemoteBranchExists(ctx, sourceRemote, releaseBranch)
		if err != nil {
			return "", false, err
		}
		if exists {
			return releaseBranch, false, nil
		}
		return releaseBranch, true, nil
	}
}

func buildPreparePRBody(component *Component, version string, promotedCl *changelog.Changelog) (string, error) {
	if promotedCl == nil {
		return "", errChangelogNil
	}
	if component == nil {
		return "", errComponentRequired
	}

	section := promotedCl.GetVersion(version)
	if section == nil {
		return "", fmt.Errorf("%w: %s", changelog.ErrVersionNotFound, version)
	}

	var b strings.Builder
	b.WriteString("## Description\n\n")
	b.WriteString("Prepare release ")
	b.WriteString(version)
	b.WriteString("\n\n")

	entryCount := 0
	for _, category := range section.Categories {
		for _, entry := range category.Entries {
			b.WriteString("- [")
			b.WriteString(category.Name)
			b.WriteString("] ")
			b.WriteString(entry)
			b.WriteString("\n")
			entryCount++
		}
	}
	if entryCount == 0 {
		b.WriteString("- No changelog entries found\n")
	}
	previousVersion := previousReleasedVersion(promotedCl, version)
	body := strings.TrimRight(b.String(), "\n")
	body += "\n\n@coderabbitai ignore"
	previousTag := ""
	if previousVersion != "" {
		previousTag = component.Tag(previousVersion)
	}
	body = withFullChangelogLink(body, previousTag, component.Tag(version))

	return body, nil
}

func printReleasePrepDryRun(log Logger, cfg *releasePrepConfig) {
	log.Info("=== DRY RUN ===")
	if cfg.createReleaseBranch {
		log.Info("Would create release branch: %s", cfg.releaseBranch)
	}
	log.Info("Would create prep branch: %s", cfg.branchName)
	log.Info("Would promote changelog to: [%s]", cfg.version.String())
	log.Info("Current released version: %s", displayPreviousVersion(cfg.previousVersion))
	log.Info("Would create PR targeting: %s", cfg.baseBranch)
	log.Info("Would set PR title: %s", cfg.prTitle)
	log.Info("Would add label: %s", cfg.component.ReleaseLabel())
	logPromotedReleaseSection(log, cfg.promotedSection)
}

func promotedReleaseSection(promotedCl *changelog.Changelog, version string) (string, error) {
	if promotedCl == nil {
		return "", errChangelogNil
	}
	section := promotedCl.GetVersion(version)
	if section == nil {
		return "", fmt.Errorf("%w: %s", changelog.ErrVersionNotFound, version)
	}

	var b strings.Builder
	b.WriteString("## [")
	b.WriteString(section.Version.Num)
	b.WriteString("]")
	if !section.Date.IsZero() {
		b.WriteString(" - ")
		b.WriteString(section.Date.Format("2006-01-02"))
	}
	content := section.String()
	if content != "" {
		b.WriteString("\n\n")
		b.WriteString(content)
	}
	return b.String(), nil
}

func logPromotedReleaseSection(log Logger, section string) {
	log.Info("Promoted release changelog:")
	for line := range strings.SplitSeq(strings.TrimRight(section, "\n"), "\n") {
		log.Info("  %s", line)
	}
}

func executeReleasePrepare(
	ctx context.Context,
	git *GitCLI,
	gh GitHubRunner,
	log Logger,
	repoRoot string,
	clPath string,
	cfg *releasePrepConfig,
	prompter ConfirmationPrompter,
	openPR bool,
) error {
	prepBaseRef, setupErr := setupBaseBranch(ctx, git, log, cfg, prompter)
	if setupErr != nil {
		return setupErr
	}

	log.Step("Creating prep branch")
	if err := git.RunWrite(ctx, "checkout", "-b", cfg.branchName, prepBaseRef); err != nil {
		return fmt.Errorf("create prep branch: %w", err)
	}

	commitMsg := "Release " + cfg.component.ReleaseTitle(cfg.version.String())
	if err := confirmMutatingAction(prompter, "promote changelog and create commit",
		"Branch: "+cfg.branchName,
		"File: "+clPath,
		"Version: "+cfg.version.String(),
		"Previous version: "+displayPreviousVersion(cfg.previousVersion),
		"Commit message: "+commitMsg,
	); err != nil {
		return err
	}

	log.Step("Updating changelog")
	changelogFile := filepath.Join(repoRoot, clPath)
	if err := os.WriteFile(changelogFile, []byte(cfg.promoted), perm.FilePermDefault); err != nil {
		return fmt.Errorf("write changelog: %w", err)
	}
	logPromotedReleaseSection(log, cfg.promotedSection)

	log.Step("Committing changelog")
	if err := git.RunWrite(ctx, "add", clPath); err != nil {
		return fmt.Errorf("git add: %w", err)
	}
	if err := git.RunWrite(ctx, "commit", "-m", commitMsg); err != nil {
		return fmt.Errorf("git commit: %w", err)
	}

	if err := confirmMutatingAction(prompter, "push prep branch",
		"Push: "+cfg.branchName+" -> "+cfg.topology.PushRemote+"/"+cfg.branchName,
	); err != nil {
		return err
	}

	log.Step("Pushing prep branch")
	if err := git.RunWrite(ctx, "push", "-u", cfg.topology.PushRemote, cfg.branchName); err != nil {
		return fmt.Errorf("git push: %w", err)
	}

	prDetails := buildPreparePRPromptDetails(cfg)
	if err := confirmMutatingAction(prompter, "create GitHub PR", prDetails...); err != nil {
		return err
	}

	log.Step("Creating release PR")
	prURL, createErr := createPreparePR(ctx, gh, cfg)
	if createErr != nil {
		return createErr
	}
	handlePreparePRResult(ctx, log, openPR, prURL)

	log.Success("Release PR created successfully")
	log.Info("Target branch: %s", cfg.baseBranch)
	log.Info("Once the PR is merged, the release workflow will trigger automatically.")
	return nil
}

func handlePreparePRResult(ctx context.Context, log Logger, openPR bool, prURL string) {
	if prURL == "" {
		log.Error("PR created, but URL could not be determined")
	} else {
		log.Info("PR: %s", prURL)
	}
	if !openPR {
		return
	}
	if prURL == "" {
		log.Error("Could not open PR in browser: PR URL is unavailable")
		return
	}
	if openErr := OpenBrowser(ctx, prURL); openErr != nil {
		log.Error("Could not open PR in browser: %v", openErr)
	}
}

func createPreparePR(ctx context.Context, gh GitHubRunner, cfg *releasePrepConfig) (string, error) {
	// Keep PR creation as a separate step so execution flow stays simple and lint-compliant.
	prURL, err := gh.CreatePR(ctx, PullRequestOptions{
		Title:      cfg.prTitle,
		Body:       cfg.prBody,
		Label:      cfg.component.ReleaseLabel(),
		Base:       cfg.baseBranch,
		Head:       cfg.topology.pullRequestHead(cfg.branchName),
		Repository: cfg.topology.BaseRepository.NameWithOwner,
	})
	if err != nil {
		return "", fmt.Errorf("create PR: %w", err)
	}
	return prURL, nil
}

func setupBaseBranch(
	ctx context.Context,
	git *GitCLI,
	log Logger,
	cfg *releasePrepConfig,
	prompter ConfirmationPrompter,
) (string, error) {
	if !cfg.createReleaseBranch {
		return cfg.baseCommit, nil
	}

	canonicalPushRemote, err := cfg.topology.canonicalPushRemote()
	if err != nil {
		return "", err
	}
	if err := confirmMutatingAction(prompter, "create and push release branch",
		"Source branch: "+cfg.topology.SourceRemote+"/"+mainBranch,
		"Source commit: "+cfg.baseCommit,
		"New branch: "+cfg.releaseBranch,
		"Push: "+cfg.releaseBranch+" -> "+canonicalPushRemote+"/"+cfg.releaseBranch,
	); err != nil {
		return "", err
	}
	log.Info(
		"Creating release branch %s from %s/%s...",
		cfg.releaseBranch,
		cfg.topology.SourceRemote,
		mainBranch,
	)
	if err := git.RunWrite(
		ctx,
		"checkout",
		"-b",
		cfg.releaseBranch,
		cfg.baseCommit,
	); err != nil {
		return "", fmt.Errorf("create release branch: %w", err)
	}
	if err := git.RunWrite(ctx, "push", "-u", canonicalPushRemote, cfg.releaseBranch); err != nil {
		return "", fmt.Errorf(
			"push release branch to canonical remote %s: %w",
			canonicalPushRemote,
			err,
		)
	}
	return cfg.releaseBranch, nil
}

func buildPreparePRPromptDetails(cfg *releasePrepConfig) []string {
	bodyLines := strings.Split(cfg.prBody, "\n")
	prDetails := make([]string, 0, 4+len(bodyLines))
	prDetails = append(prDetails,
		"Base branch: "+cfg.baseBranch,
		"Title: "+cfg.prTitle,
		"Label: "+cfg.component.ReleaseLabel(),
		"Body:",
	)
	return append(prDetails, bodyLines...)
}
