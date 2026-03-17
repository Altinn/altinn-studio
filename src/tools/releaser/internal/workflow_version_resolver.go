package internal

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"

	"altinn.studio/releaser/internal/changelog"
	semver "altinn.studio/releaser/internal/version"
)

var releaseBaseBranchPattern = regexp.MustCompile(`^release/([a-z0-9-]+)/v(\d+)\.(\d+)$`)

var (
	errBaseBranchFormat          = errors.New("base branch must be main or release/<component>/vX.Y")
	errBaseBranchMismatch        = errors.New("base branch does not match release version policy")
	errNoReleasedVersion         = errors.New("no released version found in changelog")
	errNoMatchingReleasedVersion = errors.New("no released version matching base branch")
)

type baseBranchSelector struct {
	isMain bool
	major  int
	minor  int
}

func resolveWorkflowVersion(component *Component, baseBranch, repoRoot string) (string, error) {
	if component == nil {
		return "", errComponentRequired
	}
	if repoRoot == "" {
		return "", errRepoRootRequired
	}

	changelogPath := filepath.Join(repoRoot, component.ChangelogPath)
	//nolint:gosec // G304: changelog path originates from trusted component registry.
	content, err := os.ReadFile(changelogPath)
	if err != nil {
		return "", fmt.Errorf("read changelog: %w", err)
	}

	cl, err := changelog.Parse(string(content))
	if err != nil {
		return "", fmt.Errorf("parse changelog: %w", err)
	}

	selector, err := parseBaseBranchSelector(component.Name, baseBranch)
	if err != nil {
		return "", err
	}

	var version *semver.Version
	if selector.isMain {
		version, err = cl.LatestPrerelease()
	} else {
		version, err = cl.LatestStableForLine(selector.major, selector.minor)
	}
	if err != nil {
		if errors.Is(err, changelog.ErrNoReleasedVersions) {
			return "", fmt.Errorf("%w: %s", errNoReleasedVersion, component.ChangelogPath)
		}
		if errors.Is(err, changelog.ErrNoMatchingVersion) {
			return "", fmt.Errorf("%w: %s", errNoMatchingReleasedVersion, component.ChangelogPath)
		}
		return "", fmt.Errorf("select released version: %w", err)
	}

	return version.String(), nil
}

func parseBaseBranchSelector(component, baseBranch string) (baseBranchSelector, error) {
	if baseBranch == mainBranch {
		return baseBranchSelector{isMain: true, major: 0, minor: 0}, nil
	}

	matches := releaseBaseBranchPattern.FindStringSubmatch(baseBranch)
	if matches == nil {
		return baseBranchSelector{}, fmt.Errorf("%w: %s", errBaseBranchFormat, baseBranch)
	}

	branchComponent := matches[1]
	if branchComponent != component {
		return baseBranchSelector{}, fmt.Errorf(
			"%w: branch component %s does not match %s",
			errBaseBranchMismatch,
			branchComponent,
			component,
		)
	}

	major, err := strconv.Atoi(matches[2])
	if err != nil {
		return baseBranchSelector{}, fmt.Errorf("parse release branch major: %w", err)
	}
	minor, err := strconv.Atoi(matches[3])
	if err != nil {
		return baseBranchSelector{}, fmt.Errorf("parse release branch minor: %w", err)
	}

	return baseBranchSelector{
		isMain: false,
		major:  major,
		minor:  minor,
	}, nil
}
