package internal

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"altinn.studio/releaser/internal/changelog"
)

var (
	// ErrChangelogNotModified indicates that the component changelog file
	// was not touched in the compared commit range.
	ErrChangelogNotModified = errors.New("changelog was not modified")
)

// ValidationRequest describes inputs for changelog validation.
type ValidationRequest struct {
	Component     string // Component name (required, e.g., "studioctl")
	Base          string // Base commit SHA (required)
	Head          string // Head commit SHA (required)
	ChangelogPath string // Optional: override component's default changelog path
}

// RunValidation validates changelog changes between base and head.
func RunValidation(ctx context.Context, req ValidationRequest, log Logger) error {
	if log == nil {
		log = NopLogger{}
	}
	git := NewGitCLI(WithLogger(log))
	return RunValidationWithDeps(ctx, req, git)
}

// RunValidationWithDeps validates changelog changes with injected git dependency.
func RunValidationWithDeps(ctx context.Context, req ValidationRequest, git *GitCLI) error {
	if ctx == nil {
		return errContextRequired
	}
	if req.Component == "" {
		return errComponentRequired
	}
	if req.Base == "" {
		return errValidationBaseRequired
	}
	if req.Head == "" {
		return errValidationHeadRequired
	}
	if git == nil {
		return errGitRequired
	}

	comp, err := GetComponent(req.Component)
	if err != nil {
		return fmt.Errorf("get component: %w", err)
	}

	clPath := req.ChangelogPath
	if clPath == "" {
		clPath = comp.ChangelogPath
	}

	root, err := git.RepoRoot(ctx)
	if err != nil {
		return fmt.Errorf("get repo root: %w", err)
	}

	diffOutput, err := git.Run(ctx, "diff", "--name-only", req.Base, req.Head)
	if err != nil {
		return fmt.Errorf("git diff: %w", err)
	}
	if !ChangelogWasModified(diffOutput, clPath) {
		return fmt.Errorf("%w: %s", ErrChangelogNotModified, clPath)
	}

	changelogFile := clPath
	if !filepath.IsAbs(changelogFile) {
		changelogFile = filepath.Join(root, changelogFile)
	}

	//nolint:gosec // G304: changelog path resolved from trusted component config/request.
	content, err := os.ReadFile(changelogFile)
	if err != nil {
		return fmt.Errorf("read changelog: %w", err)
	}

	cl, err := changelog.Parse(string(content))
	if err != nil {
		return fmt.Errorf("parse changelog: %w", err)
	}

	return ValidateUnreleasedOrReleasePromotion(ctx, git, cl, req.Base, clPath)
}

// ChangelogWasModified reports whether changelogPath exists in git diff --name-only output.
func ChangelogWasModified(diffOutput, changelogPath string) bool {
	for line := range strings.SplitSeq(diffOutput, "\n") {
		if strings.TrimSpace(line) == changelogPath {
			return true
		}
	}
	return false
}

// ValidateUnreleasedOrReleasePromotion validates that Unreleased has content,
// or that the diff represents a release promotion that intentionally empties it.
func ValidateUnreleasedOrReleasePromotion(
	ctx context.Context,
	git *GitCLI,
	cl *changelog.Changelog,
	base, changelogPath string,
) error {
	if cl == nil {
		return errChangelogNil
	}
	if git == nil {
		return errGitRequired
	}
	if err := cl.ValidateUnreleased(); err != nil {
		if !isAllowedUnreleasedValidationError(err) {
			return fmt.Errorf("validate changelog: %w", err)
		}

		allowed, diffErr := isReleasePromotionDiff(ctx, git, cl, base, changelogPath)
		if diffErr != nil {
			return fmt.Errorf("release promotion validation: %w", diffErr)
		}
		if !allowed {
			return fmt.Errorf("validate changelog: %w", err)
		}
	}
	return nil
}

func isAllowedUnreleasedValidationError(err error) bool {
	return errors.Is(err, changelog.ErrUnreleasedNoHeader) || errors.Is(err, changelog.ErrUnreleasedNoEntry)
}

func isReleasePromotionDiff(
	ctx context.Context,
	git *GitCLI,
	headChangelog *changelog.Changelog,
	base,
	changelogPath string,
) (bool, error) {
	baseContent, err := git.Run(ctx, "show", base+":"+changelogPath)
	if err != nil {
		return false, fmt.Errorf("git show: %w", err)
	}
	baseChangelog, err := changelog.Parse(baseContent)
	if err != nil {
		return false, fmt.Errorf("parse base changelog: %w", err)
	}
	if err := baseChangelog.ValidateUnreleased(); err != nil {
		if isAllowedUnreleasedValidationError(err) {
			return false, nil
		}
		return false, fmt.Errorf("validate base changelog: %w", err)
	}

	for _, section := range headChangelog.Versions {
		if section == nil || section.Version == nil {
			continue
		}
		if baseChangelog.HasVersion(section.Version.Num) {
			continue
		}
		for _, category := range section.Categories {
			if len(category.Entries) > 0 {
				return true, nil
			}
		}
	}

	return false, nil
}
