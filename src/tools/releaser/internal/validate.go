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
	// ErrNoNewUnreleasedEntries indicates [Unreleased] has no entries added compared to base.
	ErrNoNewUnreleasedEntries = errors.New("unreleased section has no new entries compared to base")
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
	baseChangelog, err := loadBaseChangelog(ctx, git, base, changelogPath)
	if err != nil {
		return fmt.Errorf("load base changelog: %w", err)
	}

	if err := cl.ValidateUnreleased(); err != nil {
		if !isAllowedUnreleasedValidationError(err) {
			return fmt.Errorf("validate changelog: %w", err)
		}

		allowed, diffErr := isReleasePromotionDiff(baseChangelog, cl)
		if diffErr != nil {
			return fmt.Errorf("release promotion validation: %w", diffErr)
		}
		if !allowed {
			return fmt.Errorf("validate changelog: %w", err)
		}
		return nil
	}

	if err := validateHasNewUnreleasedEntries(baseChangelog, cl); err != nil {
		return fmt.Errorf("validate changelog: %w", err)
	}
	return nil
}

func isAllowedUnreleasedValidationError(err error) bool {
	return errors.Is(err, changelog.ErrUnreleasedNoHeader) || errors.Is(err, changelog.ErrUnreleasedNoEntry)
}

type changelogEntryKey struct {
	category string
	text     string
}

func loadBaseChangelog(
	ctx context.Context,
	git *GitCLI,
	base,
	changelogPath string,
) (*changelog.Changelog, error) {
	baseContent, err := git.Run(ctx, "show", base+":"+changelogPath)
	if err != nil {
		return nil, fmt.Errorf("git show: %w", err)
	}
	baseChangelog, err := changelog.Parse(baseContent)
	if err != nil {
		return nil, fmt.Errorf("parse base changelog: %w", err)
	}
	return baseChangelog, nil
}

func validateHasNewUnreleasedEntries(baseChangelog, headChangelog *changelog.Changelog) error {
	baseUnreleasedEntries := sectionEntrySet(baseChangelog.Unreleased)
	headUnreleasedEntries := sectionEntrySet(headChangelog.Unreleased)
	for entry := range headUnreleasedEntries {
		if _, exists := baseUnreleasedEntries[entry]; !exists {
			return nil
		}
	}
	return ErrNoNewUnreleasedEntries
}

func isReleasePromotionDiff(baseChangelog, headChangelog *changelog.Changelog) (bool, error) {
	if baseChangelog == nil || headChangelog == nil {
		return false, errChangelogNil
	}

	if err := baseChangelog.ValidateUnreleased(); err != nil {
		if isAllowedUnreleasedValidationError(err) {
			return false, nil
		}
		return false, fmt.Errorf("validate base changelog: %w", err)
	}

	baseUnreleasedEntries := sectionEntrySet(baseChangelog.Unreleased)
	if len(baseUnreleasedEntries) == 0 {
		return false, nil
	}

	headUnreleasedEntries := sectionEntrySet(headChangelog.Unreleased)
	if !hasRemovedUnreleasedEntry(baseUnreleasedEntries, headUnreleasedEntries) {
		return false, nil
	}

	newReleaseEntries := newReleaseEntrySet(baseChangelog, headChangelog)
	if len(newReleaseEntries) == 0 {
		return false, nil
	}

	return hasAnyCommonEntry(baseUnreleasedEntries, newReleaseEntries), nil
}

func sectionEntrySet(section *changelog.Section) map[changelogEntryKey]struct{} {
	entries := make(map[changelogEntryKey]struct{})
	if section == nil {
		return entries
	}
	for _, category := range section.Categories {
		for _, text := range category.Entries {
			entries[changelogEntryKey{category: category.Name, text: text}] = struct{}{}
		}
	}
	return entries
}

func hasRemovedUnreleasedEntry(base, head map[changelogEntryKey]struct{}) bool {
	for entry := range base {
		if _, exists := head[entry]; !exists {
			return true
		}
	}
	return false
}

func newReleaseEntrySet(baseChangelog, headChangelog *changelog.Changelog) map[changelogEntryKey]struct{} {
	entries := make(map[changelogEntryKey]struct{})
	for _, section := range headChangelog.Versions {
		if section == nil || section.Version == nil {
			continue
		}
		if baseChangelog.HasVersion(section.Version.Num) {
			continue
		}
		for _, category := range section.Categories {
			for _, text := range category.Entries {
				entries[changelogEntryKey{category: category.Name, text: text}] = struct{}{}
			}
		}
	}
	return entries
}

func hasAnyCommonEntry(left, right map[changelogEntryKey]struct{}) bool {
	for entry := range left {
		if _, exists := right[entry]; exists {
			return true
		}
	}
	return false
}
