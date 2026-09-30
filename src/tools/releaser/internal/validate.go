package internal

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"unicode"

	"altinn.studio/releaser/internal/changelog"
)

var (
	// ErrChangelogNotModified indicates that the component changelog file
	// was not touched in the compared commit range.
	ErrChangelogNotModified = errors.New("changelog was not modified")
	// ErrNoNewUnreleasedEntries indicates [Unreleased] has no entries added compared to base.
	ErrNoNewUnreleasedEntries = errors.New("unreleased section has no new entries compared to base")
	// ErrBaseChangelogOutdated indicates that the base branch changelog changed
	// after the PR branch diverged.
	ErrBaseChangelogOutdated = errors.New("base branch contains newer changelog changes")
	// ErrEntryTooLong indicates a new or changed [Unreleased] entry has more than MaxEntryWords words.
	ErrEntryTooLong = errors.New("changelog entry is too long")
)

// MaxEntryWords is the most words a new or changed [Unreleased] entry may have.
// Entries are release notes; detail beyond this belongs in the documentation.
const MaxEntryWords = 60

// entryExcerptWords is how many words of a too-long entry the error quotes.
const entryExcerptWords = 8

var (
	// pullRequestLinkPattern matches a pull request reference such as [#1234](https://...).
	pullRequestLinkPattern = regexp.MustCompile(`\[#\d+\]\([^)\s]*\)`)
	// linkTargetPattern matches the target of a Markdown link, the (https://...) after its text.
	linkTargetPattern = regexp.MustCompile(`\]\([^)\s]*\)`)
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

	err = validateBaseChangelogCurrent(ctx, git, req.Base, req.Head, clPath)
	if err != nil {
		return err
	}

	diffOutput, err := git.Run(ctx, "diff", "--name-only", req.Base, req.Head)
	if err != nil {
		return fmt.Errorf("git diff: %w", err)
	}
	if !ChangelogWasModified(diffOutput, clPath) {
		return fmt.Errorf("%w: %s", ErrChangelogNotModified, clPath)
	}

	return parseAndValidateChangelog(ctx, git, root, clPath, req.Base)
}

// vendoredChangelogFragments are path fragments that mark a CHANGELOG.md as
// third-party or generated, so it must not be structurally validated against
// our Keep a Changelog conventions.
//
//nolint:gochecknoglobals // Read-only package constant.
var vendoredChangelogFragments = []string{
	"node_modules/",
	"/.nuget/",
	"/_testapps/",
	".claude/",
	"/obj/",
	"/bin/",
}

// RunStructureValidation validates the Keep a Changelog structure of every
// changed CHANGELOG.md between base and head (or, when base/head are empty,
// every tracked CHANGELOG.md). It is component-agnostic: any project's
// changelog is covered automatically, with no registry or workflow wiring.
// Vendored and generated changelogs are skipped. Structural errors
// (category order, invalid categories, version ordering, duplicates) fail, as
// do [Unreleased] entries longer than MaxEntryWords that are new or changed
// since head diverged from base. Without a range there is nothing to compare,
// so entry length is not checked. Release-policy semantics are intentionally
// not enforced here.
func RunStructureValidation(ctx context.Context, base, head string, log Logger) error {
	if log == nil {
		log = NopLogger{}
	}
	git := NewGitCLI(WithLogger(log))
	return RunStructureValidationWithDeps(ctx, base, head, git, log)
}

// RunStructureValidationWithDeps validates changelog structure with an
// injected git dependency.
func RunStructureValidationWithDeps(ctx context.Context, base, head string, git *GitCLI, log Logger) error {
	if ctx == nil {
		return errContextRequired
	}
	if git == nil {
		return errGitRequired
	}
	if log == nil {
		log = NopLogger{}
	}

	root, err := git.RepoRoot(ctx)
	if err != nil {
		return fmt.Errorf("get repo root: %w", err)
	}

	paths, err := discoverChangelogPaths(ctx, git, base, head)
	if err != nil {
		return err
	}
	if len(paths) == 0 {
		log.Info("no changelog changes to validate")
		return nil
	}

	var errs []error
	for _, clPath := range paths {
		log.Info("validating changelog structure: %s", clPath)
		if perr := validateChangelogStructure(ctx, git, root, clPath, base, head); perr != nil {
			errs = append(errs, fmt.Errorf("%s: %w", clPath, perr))
		}
	}
	return errors.Join(errs...)
}

// discoverChangelogPaths returns the repo-relative CHANGELOG.md paths to
// validate: those changed between base and head when both are provided,
// otherwise all tracked changelogs. Vendored/generated paths are excluded.
func discoverChangelogPaths(ctx context.Context, git *GitCLI, base, head string) ([]string, error) {
	var raw string
	var err error
	if base != "" && head != "" {
		// --diff-filter=d excludes deletions so we never read a removed file.
		raw, err = git.Run(ctx, "diff", "--name-only", "--diff-filter=d", base, head, "--", "*CHANGELOG.md")
		if err != nil {
			return nil, fmt.Errorf("git diff: %w", err)
		}
	} else {
		raw, err = git.Run(ctx, "ls-files", "*CHANGELOG.md")
		if err != nil {
			return nil, fmt.Errorf("git ls-files: %w", err)
		}
	}

	var paths []string
	for line := range strings.SplitSeq(raw, "\n") {
		path := strings.TrimSpace(line)
		if path == "" || filepath.Base(path) != "CHANGELOG.md" || isVendoredChangelog(path) {
			continue
		}
		paths = append(paths, path)
	}
	return paths, nil
}

func isVendoredChangelog(path string) bool {
	for _, fragment := range vendoredChangelogFragments {
		if strings.Contains(path, fragment) {
			return true
		}
	}
	return false
}

// validateChangelogStructure reads and parses a single changelog on disk,
// surfacing structural (format) errors and, given a range, too-long new entries.
// The length check reads the changelog at head rather than on disk: on a pull
// request the checkout is head merged into base, which also holds entries that
// reached base after head diverged.
func validateChangelogStructure(ctx context.Context, git *GitCLI, root, clPath, base, head string) error {
	changelogFile := clPath
	if !filepath.IsAbs(changelogFile) {
		changelogFile = filepath.Join(root, changelogFile)
	}

	//nolint:gosec // G304: path derived from git-tracked changelog paths.
	content, err := os.ReadFile(changelogFile)
	if err != nil {
		return fmt.Errorf("read changelog: %w", err)
	}

	if _, err = changelog.Parse(string(content)); err != nil {
		return fmt.Errorf("parse changelog: %w", err)
	}

	if base == "" || head == "" {
		return nil
	}
	previous, err := loadChangelogAtMergeBase(ctx, git, base, head, clPath)
	if err != nil {
		return err
	}
	current, err := loadChangelogAt(ctx, git, head, clPath)
	if err != nil {
		return err
	}
	return validateEntryLengths(previous, current)
}

// loadChangelogAtMergeBase returns the changelog as it was where head diverged
// from base, or an empty changelog when the file did not exist there.
func loadChangelogAtMergeBase(
	ctx context.Context,
	git *GitCLI,
	base, head, changelogPath string,
) (*changelog.Changelog, error) {
	mergeBase, err := git.Run(ctx, "merge-base", base, head)
	if err != nil {
		return nil, fmt.Errorf("git merge-base: %w", err)
	}
	return loadChangelogAt(ctx, git, mergeBase, changelogPath)
}

// loadChangelogAt returns the changelog at a revision, or an empty changelog
// when the file does not exist there.
func loadChangelogAt(ctx context.Context, git *GitCLI, revision, changelogPath string) (*changelog.Changelog, error) {
	code, err := git.runExitCode(ctx, "cat-file", "-e", revision+":"+changelogPath)
	if err != nil {
		return nil, fmt.Errorf("git cat-file: %w", err)
	}
	if code != 0 {
		return &changelog.Changelog{Preamble: "", Unreleased: nil, Versions: nil}, nil
	}
	return loadBaseChangelog(ctx, git, revision, changelogPath)
}

// entryWords returns the words of an entry as a reader counts them: pull request
// links, link targets, list markers and punctuation on their own are left out.
func entryWords(text string) []string {
	text = pullRequestLinkPattern.ReplaceAllString(text, "")
	text = linkTargetPattern.ReplaceAllString(text, "]")
	var words []string
	for field := range strings.FieldsSeq(text) {
		if strings.IndexFunc(field, func(r rune) bool { return unicode.IsLetter(r) || unicode.IsDigit(r) }) >= 0 {
			words = append(words, field)
		}
	}
	return words
}

// validateEntryLengths fails on every [Unreleased] entry in cl that is not in
// previous's [Unreleased] and has more than MaxEntryWords words.
func validateEntryLengths(previous, cl *changelog.Changelog) error {
	var errs []error
	for _, entry := range changelog.NewEntries(previous.Unreleased.Entries(), cl.Unreleased.Entries()) {
		words := entryWords(entry.Text)
		if len(words) <= MaxEntryWords {
			continue
		}
		errs = append(errs, fmt.Errorf(
			"%w: %s entry %q has %d words, the limit is %d",
			ErrEntryTooLong,
			entry.Category,
			strings.Join(words[:entryExcerptWords], " ")+" ...",
			len(words),
			MaxEntryWords,
		))
	}
	return errors.Join(errs...)
}

// parseAndValidateChangelog reads, parses and validates a single component
// changelog on disk (the head working tree) against its base revision.
func parseAndValidateChangelog(ctx context.Context, git *GitCLI, root, clPath, base string) error {
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

	return ValidateUnreleasedOrReleasePromotion(ctx, git, cl, base, clPath)
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

func validateBaseChangelogCurrent(ctx context.Context, git *GitCLI, base, head, changelogPath string) error {
	mergeBase, err := git.Run(ctx, "merge-base", base, head)
	if err != nil {
		return fmt.Errorf("git merge-base: %w", err)
	}
	if mergeBase == base {
		return nil
	}

	diffOutput, err := git.Run(ctx, "diff", "--name-only", mergeBase, base, "--", changelogPath)
	if err != nil {
		return fmt.Errorf("git diff base changelog: %w", err)
	}
	if !ChangelogWasModified(diffOutput, changelogPath) {
		return nil
	}

	return fmt.Errorf(
		"%w: %s changed on the base branch after this branch diverged; rebase or merge the base branch before validating changelog",
		ErrBaseChangelogOutdated,
		changelogPath,
	)
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
	if len(changelog.NewEntries(baseChangelog.Unreleased.Entries(), headChangelog.Unreleased.Entries())) == 0 {
		return ErrNoNewUnreleasedEntries
	}
	return nil
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
