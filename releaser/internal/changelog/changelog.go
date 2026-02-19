// Package changelog provides parsing and manipulation of Keep a Changelog format files.
package changelog

import (
	"bufio"
	"errors"
	"fmt"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"time"

	semver "altinn.studio/releaser/internal/version"
)

// Common errors returned by changelog operations.
var (
	ErrNoUnreleased       = errors.New("no [Unreleased] section found")
	ErrUnreleasedEmpty    = errors.New("[Unreleased] section is empty")
	ErrUnreleasedNoHeader = errors.New("[Unreleased] section missing category header (### Added, ### Fixed, etc.)")
	ErrUnreleasedNoEntry  = errors.New("[Unreleased] section missing list entry (- item)")
	ErrVersionNotFound    = errors.New("version not found in changelog")
	ErrInvalidVersion     = errors.New("invalid version format")
	ErrVersionExists      = errors.New("version already exists in changelog")
	ErrNoChangelogInDiff  = errors.New("no CHANGELOG.md changes found in diff")
	ErrNoEntriesInDiff    = errors.New("no changelog entries found in diff")
	ErrInvalidCategory    = errors.New("invalid changelog category")
	ErrCategoryOrder      = errors.New("categories not in standard order")
	ErrDuplicateVersion   = errors.New("duplicate released version in changelog")
	ErrVersionOrder       = errors.New("released versions are not in descending semver order")
	ErrPrereleaseConflict = errors.New("multiple active prerelease release-lines in changelog")
	ErrNoReleasedVersions = errors.New("no released versions found in changelog")
	ErrNoMatchingVersion  = errors.New("no matching released version found in changelog")
)

// Section represents a version section in the changelog.
type Section struct {
	Version    *semver.Version // nil for [Unreleased]
	Date       time.Time       // zero for [Unreleased]
	Categories []Category      // entries grouped by category
}

// Category represents a category header (### Added, ### Fixed, etc.).
type Category struct {
	Name    string   // Added, Changed, Fixed, Removed, Security, Deprecated
	Entries []string // entry text without leading "- "
}

// Entry represents a changelog entry with its category.
type Entry struct {
	Category string
	Text     string
}

// Changelog represents a parsed Keep a Changelog format document.
type Changelog struct {
	Preamble     string     // content before first section (title, description)
	Unreleased   *Section   // [Unreleased] section, nil if missing
	Versions     []*Section // released versions in document order (newest first)
	AddedEntries []Entry    // entries from diff (only if ParseWithDiff used)
}

// Version header patterns.
var (
	// Matches ## [Unreleased] or ## [Unreleased] - any text.
	unreleasedPattern = regexp.MustCompile(`^## \[Unreleased\]`)

	// Matches ## [1.2.3] - 2024-01-15 or ## [v1.2.3] - 2024-01-15 or ## [1.2.3-preview.1] - 2024-01-15.
	versionPattern = regexp.MustCompile(`^## \[v?(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?)\](?:\s+-\s+(\d{4}-\d{2}-\d{2}))?`)

	// Matches ### Added, ### Changed, ### Fixed, ### Removed, etc.
	categoryPattern = regexp.MustCompile(`^### (\w+)`)

	// Matches list items: "- some text" or "* some text".
	listItemPattern = regexp.MustCompile(`^[-*]\s+(.+)`)

	// Matches the semantic version prefix at the start of normalized versions.
	versionPrefixPattern = regexp.MustCompile(`^\d+\.\d+\.\d+`)
)

// standardCategoryOrder defines the preferred order for changelog categories.
//
//nolint:gochecknoglobals // Read-only package constant.
var standardCategoryOrder = []string{
	"Added", "Changed", "Fixed", "Removed", "Security", "Deprecated",
}

// categoryValidator validates category names and order.
type categoryValidator struct {
	lastCategoryIndex int
}

func newCategoryValidator() *categoryValidator {
	return &categoryValidator{lastCategoryIndex: -1}
}

// reset resets the validator for a new section.
func (v *categoryValidator) reset() {
	v.lastCategoryIndex = -1
}

// validate checks if a category is valid and in the correct order.
// Returns nil on success, or an error describing the validation failure.
func (v *categoryValidator) validate(categoryName string) error {
	categoryIndex := slices.Index(standardCategoryOrder, categoryName)
	if categoryIndex == -1 {
		return fmt.Errorf("%w: %q (valid categories: %s)",
			ErrInvalidCategory,
			categoryName,
			strings.Join(standardCategoryOrder, ", "))
	}

	if categoryIndex < v.lastCategoryIndex {
		return fmt.Errorf("%w: %q appears out of order (expected order: %s)",
			ErrCategoryOrder,
			categoryName,
			strings.Join(standardCategoryOrder, ", "))
	}

	v.lastCategoryIndex = categoryIndex
	return nil
}

// Parse parses changelog content into an AST representation.
func Parse(content string) (*Changelog, error) {
	return ParseWithDiff(content, "", "")
}

// ParseWithDiff parses changelog content and also extracts added entries from a git diff.
// The changelogPath is needed to locate the changelog section in the diff.
// The diff parameter can be empty string if no diff analysis is needed.
func ParseWithDiff(content, diff, changelogPath string) (*Changelog, error) {
	cl := &Changelog{
		Preamble:     "",
		Unreleased:   nil,
		Versions:     nil,
		AddedEntries: nil,
	}
	if err := parseContent(cl, content); err != nil {
		return nil, err
	}
	if err := validateVersionSections(cl.Versions); err != nil {
		return nil, err
	}
	if diff != "" && changelogPath != "" {
		entries, err := extractEntriesFromDiff(diff, changelogPath)
		if err != nil && !errors.Is(err, ErrNoChangelogInDiff) && !errors.Is(err, ErrNoEntriesInDiff) {
			return nil, err
		}
		cl.AddedEntries = entries
	}
	return cl, nil
}

func validateVersionSections(sections []*Section) error {
	seen := make(map[string]struct{}, len(sections))
	var prev *semver.Version

	for _, section := range sections {
		if section == nil || section.Version == nil {
			continue
		}

		current := section.Version
		key := current.String()
		if _, ok := seen[key]; ok {
			return fmt.Errorf("%w: %s", ErrDuplicateVersion, key)
		}
		seen[key] = struct{}{}

		if prev != nil && compareSemver(current, prev) > 0 {
			return fmt.Errorf("%w: %s appears after %s", ErrVersionOrder, current.String(), prev.String())
		}
		prev = current
	}

	return validateActivePrereleaseLine(sections)
}

func validateActivePrereleaseLine(sections []*Section) error {
	var activeMajor, activeMinor int
	lineInitialized := false

	for _, section := range sections {
		if section == nil || section.Version == nil {
			continue
		}
		if !section.Version.IsPrerelease {
			break
		}
		if !lineInitialized {
			activeMajor = section.Version.Major
			activeMinor = section.Version.Minor
			lineInitialized = true
			continue
		}
		if section.Version.Major != activeMajor || section.Version.Minor != activeMinor {
			return fmt.Errorf(
				"%w: saw v%d.%d and v%d.%d at top of changelog",
				ErrPrereleaseConflict,
				activeMajor,
				activeMinor,
				section.Version.Major,
				section.Version.Minor,
			)
		}
	}

	return nil
}

func compareSemver(a, b *semver.Version) int {
	switch {
	case a.Major > b.Major:
		return 1
	case a.Major < b.Major:
		return -1
	case a.Minor > b.Minor:
		return 1
	case a.Minor < b.Minor:
		return -1
	case a.Patch > b.Patch:
		return 1
	case a.Patch < b.Patch:
		return -1
	}

	if !a.IsPrerelease && !b.IsPrerelease {
		return 0
	}
	if !a.IsPrerelease {
		return 1
	}
	if !b.IsPrerelease {
		return -1
	}

	return comparePrerelease(a.Prerelease, b.Prerelease)
}

func comparePrerelease(a, b string) int {
	aParts := strings.Split(a, ".")
	bParts := strings.Split(b, ".")
	limit := min(len(aParts), len(bParts))

	for i := range limit {
		if aParts[i] == bParts[i] {
			continue
		}

		aNum, aIsNum := parseNumericIdentifier(aParts[i])
		bNum, bIsNum := parseNumericIdentifier(bParts[i])
		switch {
		case aIsNum && bIsNum:
			if aNum > bNum {
				return 1
			}
			return -1
		case aIsNum && !bIsNum:
			return -1
		case !aIsNum && bIsNum:
			return 1
		default:
			return strings.Compare(aParts[i], bParts[i])
		}
	}

	switch {
	case len(aParts) > len(bParts):
		return 1
	case len(aParts) < len(bParts):
		return -1
	default:
		return 0
	}
}

func parseNumericIdentifier(value string) (int, bool) {
	if value == "" {
		return 0, false
	}
	for _, char := range value {
		if char < '0' || char > '9' {
			return 0, false
		}
	}
	number, err := strconv.Atoi(value)
	if err != nil {
		return 0, false
	}
	return number, true
}

// parseContent parses the changelog content into the AST.
//
//nolint:gocognit,gocyclo,cyclop,funlen,nestif // Parser requires sequential state machine logic.
func parseContent(cl *Changelog, content string) error {
	scanner := bufio.NewScanner(strings.NewReader(content))
	var preamble strings.Builder
	var currentSection *Section
	var currentCategory *Category
	validator := newCategoryValidator()

	for scanner.Scan() {
		line := scanner.Text()

		if unreleasedPattern.MatchString(line) {
			if currentSection != nil && currentCategory != nil {
				currentSection.Categories = append(currentSection.Categories, *currentCategory)
			}
			currentSection = &Section{
				Version:    nil,
				Date:       time.Time{},
				Categories: nil,
			}
			currentCategory = nil
			validator.reset()
			cl.Unreleased = currentSection
			continue
		}

		if matches := versionPattern.FindStringSubmatch(line); matches != nil {
			if currentSection != nil && currentCategory != nil {
				currentSection.Categories = append(currentSection.Categories, *currentCategory)
			}
			ver, err := semver.Parse("v" + matches[1])
			if err != nil {
				return fmt.Errorf("parse version %q: %w", matches[1], err)
			}
			var date time.Time
			if matches[2] != "" {
				date, err = time.Parse("2006-01-02", matches[2])
				if err != nil {
					return fmt.Errorf("parse date %q: %w", matches[2], err)
				}
			}
			currentSection = &Section{
				Version:    ver,
				Date:       date,
				Categories: nil,
			}
			currentCategory = nil
			validator.reset()
			cl.Versions = append(cl.Versions, currentSection)
			continue
		}

		if matches := categoryPattern.FindStringSubmatch(line); matches != nil {
			if currentSection != nil {
				categoryName := matches[1]
				if err := validator.validate(categoryName); err != nil {
					return err
				}

				if currentCategory != nil {
					currentSection.Categories = append(currentSection.Categories, *currentCategory)
				}
				currentCategory = &Category{
					Name:    categoryName,
					Entries: nil,
				}
			}
			continue
		}

		if matches := listItemPattern.FindStringSubmatch(line); matches != nil {
			if currentCategory != nil {
				currentCategory.Entries = append(currentCategory.Entries, matches[1])
			}
			continue
		}

		if currentSection == nil && cl.Unreleased == nil && len(cl.Versions) == 0 {
			if preamble.Len() > 0 || strings.TrimSpace(line) != "" {
				preamble.WriteString(line)
				preamble.WriteString("\n")
			}
		}
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("scan changelog: %w", err)
	}

	if currentSection != nil && currentCategory != nil {
		currentSection.Categories = append(currentSection.Categories, *currentCategory)
	}

	cl.Preamble = strings.TrimRight(preamble.String(), "\n")
	return nil
}

// extractEntriesFromDiff parses a git diff and extracts changelog entries that were added.
//
//nolint:gocognit,gocyclo,cyclop // Diff parsing requires sequential state machine logic
func extractEntriesFromDiff(diffContent, changelogPath string) ([]Entry, error) {
	changelogStart := findChangelogSection(diffContent, changelogPath)
	if changelogStart == -1 {
		return nil, ErrNoChangelogInDiff
	}

	diffSection := diffContent[changelogStart:]
	changelogDiffPrefix := "diff --git a/" + changelogPath

	var entries []Entry
	var currentCategory string

	scanner := bufio.NewScanner(strings.NewReader(diffSection))
	for scanner.Scan() {
		line := scanner.Text()

		if strings.HasPrefix(line, "diff --git") && !strings.HasPrefix(line, changelogDiffPrefix) {
			break
		}

		if strings.HasPrefix(line, "@@") || strings.HasPrefix(line, "---") || strings.HasPrefix(line, "+++") ||
			strings.HasPrefix(line, "index ") || strings.HasPrefix(line, "diff --git") {
			continue
		}

		var contentLine string
		switch {
		case strings.HasPrefix(line, "+"):
			contentLine = strings.TrimPrefix(line, "+")
		case strings.HasPrefix(line, "-"):
			contentLine = strings.TrimPrefix(line, "-")
		case strings.HasPrefix(line, " "):
			contentLine = strings.TrimPrefix(line, " ")
		default:
			contentLine = line
		}

		if versionPattern.MatchString(contentLine) {
			currentCategory = ""
			continue
		}

		if matches := categoryPattern.FindStringSubmatch(contentLine); matches != nil {
			currentCategory = matches[1]
			continue
		}

		if !strings.HasPrefix(line, "+") {
			continue
		}

		if currentCategory == "" {
			continue
		}

		if matches := listItemPattern.FindStringSubmatch(contentLine); matches != nil {
			entries = append(entries, Entry{
				Category: currentCategory,
				Text:     matches[1],
			})
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("scan diff: %w", err)
	}

	if len(entries) == 0 {
		return nil, ErrNoEntriesInDiff
	}

	return entries, nil
}

// findChangelogSection returns the index where the changelog diff section starts, or -1 if not found.
func findChangelogSection(diffContent, changelogPath string) int {
	pattern := "diff --git a/" + changelogPath
	if idx := strings.Index(diffContent, pattern); idx != -1 {
		return idx
	}
	return -1
}

// HasVersion checks if the changelog contains a specific version.
func (c *Changelog) HasVersion(version string) bool {
	return c.GetVersion(version) != nil
}

// GetVersion returns the section for a specific version, or nil if not found.
func (c *Changelog) GetVersion(version string) *Section {
	normalized := normalizeVersion(version)
	if normalized == "" {
		return nil
	}
	for _, sec := range c.Versions {
		if sec.Version != nil && sec.Version.Num == normalized {
			return sec
		}
	}
	return nil
}

// LatestPrerelease returns the highest prerelease version found in released sections.
func (c *Changelog) LatestPrerelease() (*semver.Version, error) {
	return c.latestVersion(func(ver *semver.Version) bool {
		return ver.IsPrerelease
	})
}

// LatestStableForLine returns the highest stable version for a release line (major.minor).
func (c *Changelog) LatestStableForLine(major, minor int) (*semver.Version, error) {
	return c.latestVersion(func(ver *semver.Version) bool {
		return !ver.IsPrerelease && ver.Major == major && ver.Minor == minor
	})
}

// ExtractNotes returns the release notes for a specific version as markdown.
func (c *Changelog) ExtractNotes(version string) (string, error) {
	sec := c.GetVersion(version)
	if sec == nil {
		normalized := normalizeVersion(version)
		if normalized == "" {
			return "", ErrInvalidVersion
		}
		return "", ErrVersionNotFound
	}
	return sec.String(), nil
}

// ValidateUnreleased checks that [Unreleased] section exists and follows
// Keep a Changelog format: must have at least one category header and at least one list item.
func (c *Changelog) ValidateUnreleased() error {
	if c.Unreleased == nil {
		return ErrNoUnreleased
	}
	if len(c.Unreleased.Categories) == 0 {
		return ErrUnreleasedNoHeader
	}
	for _, cat := range c.Unreleased.Categories {
		if len(cat.Entries) > 0 {
			return nil
		}
	}
	return ErrUnreleasedNoEntry
}

// Promote moves [Unreleased] content to a new version section with the given date.
// Returns a new Changelog with the promoted version.
func (c *Changelog) Promote(version string, date time.Time) (*Changelog, error) {
	normalized := normalizeVersion(version)
	if normalized == "" {
		return nil, ErrInvalidVersion
	}

	if c.HasVersion(normalized) {
		return nil, ErrVersionExists
	}

	if c.Unreleased == nil {
		return nil, ErrNoUnreleased
	}

	ver, err := semver.Parse("v" + normalized)
	if err != nil {
		return nil, fmt.Errorf("parse version: %w", err)
	}

	promotedCategories := buildPromotedCategories(c, ver)
	if len(promotedCategories) == 0 {
		return nil, ErrUnreleasedEmpty
	}

	newCl := &Changelog{
		Preamble: c.Preamble,
		Unreleased: &Section{
			Version:    nil,
			Date:       time.Time{},
			Categories: nil,
		},
		Versions:     nil, // Set below
		AddedEntries: c.AddedEntries,
	}

	newVersion := &Section{
		Version:    ver,
		Date:       date,
		Categories: promotedCategories,
	}

	// Insert new version so released sections stay semver-descending.
	newCl.Versions = make([]*Section, 0, len(c.Versions)+1)
	inserted := false
	for _, v := range c.Versions {
		if !inserted && (v == nil || v.Version == nil || compareSemver(ver, v.Version) > 0) {
			newCl.Versions = append(newCl.Versions, newVersion)
			inserted = true
		}
		newCl.Versions = append(newCl.Versions, cloneSection(v))
	}
	if !inserted {
		newCl.Versions = append(newCl.Versions, newVersion)
	}

	if err := validateVersionSections(newCl.Versions); err != nil {
		return nil, err
	}

	return newCl, nil
}

func buildPromotedCategories(c *Changelog, target *semver.Version) []Category {
	unreleased := cloneNonEmptyCategories(c.Unreleased.Categories)
	if target.IsPrerelease || target.Patch > 0 {
		return unreleased
	}

	// A new stable .0 should include prerelease history for the same release line.
	prereleaseLine := collectPrereleaseLineCategories(c.Versions, target)
	return mergeCategories(prereleaseLine, unreleased)
}

func collectPrereleaseLineCategories(versions []*Section, target *semver.Version) []Category {
	categories := make([]Category, 0)
	for i := len(versions) - 1; i >= 0; i-- {
		section := versions[i]
		if section == nil || section.Version == nil {
			continue
		}
		version := section.Version
		if !version.IsPrerelease {
			continue
		}
		if version.Major != target.Major || version.Minor != target.Minor || version.Patch != target.Patch {
			continue
		}
		categories = mergeCategories(categories, cloneNonEmptyCategories(section.Categories))
	}
	return categories
}

func cloneNonEmptyCategories(categories []Category) []Category {
	if len(categories) == 0 {
		return nil
	}
	nonEmpty := make([]Category, 0, len(categories))
	for _, category := range categories {
		if len(category.Entries) == 0 {
			continue
		}
		nonEmpty = append(nonEmpty, Category{
			Name:    category.Name,
			Entries: slices.Clone(category.Entries),
		})
	}
	return nonEmpty
}

func mergeCategories(left, right []Category) []Category {
	if len(left) == 0 {
		return cloneCategories(right)
	}
	if len(right) == 0 {
		return cloneCategories(left)
	}

	mergedByName := make(map[string][]string, len(left)+len(right))
	seenNames := make(map[string]struct{}, len(left)+len(right))
	orderedNames := make([]string, 0, len(left)+len(right))
	appendCategory := func(category Category) {
		if _, seen := seenNames[category.Name]; !seen {
			seenNames[category.Name] = struct{}{}
			orderedNames = append(orderedNames, category.Name)
		}
		mergedByName[category.Name] = append(mergedByName[category.Name], category.Entries...)
	}

	for _, category := range left {
		appendCategory(category)
	}
	for _, category := range right {
		appendCategory(category)
	}

	result := make([]Category, 0, len(orderedNames))
	for _, name := range orderedNames {
		result = append(result, Category{
			Name:    name,
			Entries: mergedByName[name],
		})
	}
	sortCategories(result)
	return result
}

// InsertEntries adds entries to the [Unreleased] section.
// Returns a new Changelog with the entries inserted.
func (c *Changelog) InsertEntries(entries []Entry) (*Changelog, error) {
	if len(entries) == 0 {
		return c, nil
	}

	if c.Unreleased == nil {
		return nil, ErrNoUnreleased
	}

	versions := make([]*Section, len(c.Versions))
	for i, v := range c.Versions {
		versions[i] = cloneSection(v)
	}

	newCl := &Changelog{
		Preamble:     c.Preamble,
		Unreleased:   cloneSection(c.Unreleased),
		Versions:     versions,
		AddedEntries: c.AddedEntries,
	}

	byCategory := make(map[string][]string)
	for _, e := range entries {
		byCategory[e.Category] = append(byCategory[e.Category], e.Text)
	}

	for cat, texts := range byCategory {
		found := false
		for i := range newCl.Unreleased.Categories {
			if newCl.Unreleased.Categories[i].Name == cat {
				newCl.Unreleased.Categories[i].Entries = append(texts, newCl.Unreleased.Categories[i].Entries...)
				found = true
				break
			}
		}
		if !found {
			newCl.Unreleased.Categories = append(newCl.Unreleased.Categories, Category{
				Name:    cat,
				Entries: texts,
			})
		}
	}

	sortCategories(newCl.Unreleased.Categories)

	return newCl, nil
}

// String returns the changelog as markdown content.
func (c *Changelog) String() string {
	var b strings.Builder

	if c.Preamble != "" {
		b.WriteString(c.Preamble)
		b.WriteString("\n\n")
	}

	if c.Unreleased != nil {
		b.WriteString("## [Unreleased]")
		content := c.Unreleased.String()
		if content != "" {
			b.WriteString("\n\n")
			b.WriteString(content)
		}
		b.WriteString("\n")
	}

	for i, ver := range c.Versions {
		if c.Unreleased != nil || i > 0 {
			b.WriteString("\n")
		}
		b.WriteString("## [")
		b.WriteString(ver.Version.Num)
		b.WriteString("]")
		if !ver.Date.IsZero() {
			b.WriteString(" - ")
			b.WriteString(ver.Date.Format("2006-01-02"))
		}
		content := ver.String()
		if content != "" {
			b.WriteString("\n\n")
			b.WriteString(content)
			b.WriteString("\n")
		} else {
			b.WriteString("\n")
		}
	}

	return strings.TrimRight(b.String(), "\n") + "\n"
}

func (c *Changelog) latestVersion(matches func(*semver.Version) bool) (*semver.Version, error) {
	var best *semver.Version
	hasReleased := false
	for _, section := range c.Versions {
		if section == nil || section.Version == nil {
			continue
		}
		hasReleased = true
		if !matches(section.Version) {
			continue
		}
		if best == nil || compareSemver(section.Version, best) > 0 {
			best = section.Version
		}
	}
	if !hasReleased {
		return nil, ErrNoReleasedVersions
	}
	if best == nil {
		return nil, ErrNoMatchingVersion
	}
	return best, nil
}

// IsUnreleased returns true if this is the [Unreleased] section.
func (s *Section) IsUnreleased() bool {
	return s.Version == nil
}

// HasCategory checks if the section has a category with the given name.
func (s *Section) HasCategory(name string) bool {
	return s.GetCategory(name) != nil
}

// GetCategory returns the category with the given name, or nil if not found.
func (s *Section) GetCategory(name string) *Category {
	for i := range s.Categories {
		if s.Categories[i].Name == name {
			return &s.Categories[i]
		}
	}
	return nil
}

// String renders the section content as markdown (without the header).
func (s *Section) String() string {
	if len(s.Categories) == 0 {
		return ""
	}

	var b strings.Builder
	sorted := sortedCategories(s.Categories)

	for i, cat := range sorted {
		if i > 0 {
			b.WriteString("\n")
		}
		b.WriteString("### ")
		b.WriteString(cat.Name)
		b.WriteString("\n")
		for _, entry := range cat.Entries {
			b.WriteString("- ")
			b.WriteString(entry)
			b.WriteString("\n")
		}
	}

	return strings.TrimRight(b.String(), "\n")
}

// normalizeVersion strips the 'v' prefix and validates the version format.
// Also strips an optional "<component>/" prefix if present.
func normalizeVersion(version string) string {
	if slash := strings.LastIndex(version, "/"); slash >= 0 {
		version = version[slash+1:]
	}
	version = strings.TrimPrefix(version, "v")

	if !versionPrefixPattern.MatchString(version) {
		return ""
	}
	return version
}

// cloneSection creates a deep copy of a section.
func cloneSection(s *Section) *Section {
	if s == nil {
		return nil
	}
	return &Section{
		Version:    s.Version, // Version is immutable, no need to clone
		Date:       s.Date,
		Categories: cloneCategories(s.Categories),
	}
}

// cloneCategories creates a deep copy of categories.
func cloneCategories(cats []Category) []Category {
	if cats == nil {
		return nil
	}
	result := make([]Category, len(cats))
	for i, cat := range cats {
		result[i] = Category{
			Name:    cat.Name,
			Entries: slices.Clone(cat.Entries),
		}
	}
	return result
}

// sortCategories sorts categories in place by standard order.
func sortCategories(cats []Category) {
	slices.SortFunc(cats, func(a, b Category) int {
		aIdx := slices.Index(standardCategoryOrder, a.Name)
		bIdx := slices.Index(standardCategoryOrder, b.Name)
		if aIdx == -1 {
			aIdx = len(standardCategoryOrder)
		}
		if bIdx == -1 {
			bIdx = len(standardCategoryOrder)
		}
		if aIdx != bIdx {
			return aIdx - bIdx
		}
		return strings.Compare(a.Name, b.Name)
	})
}

// sortedCategories returns a copy of categories sorted by standard order.
func sortedCategories(cats []Category) []Category {
	result := cloneCategories(cats)
	sortCategories(result)
	return result
}
