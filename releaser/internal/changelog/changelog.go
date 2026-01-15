// Package changelog provides parsing and manipulation of Keep a Changelog format files.
package changelog

import (
	"bufio"
	"errors"
	"fmt"
	"regexp"
	"slices"
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
)

// standardCategoryOrder defines the preferred order for changelog categories.
//
//nolint:gochecknoglobals // Read-only package constant.
var standardCategoryOrder = []string{
	"Added", "Changed", "Fixed", "Removed", "Security", "Deprecated",
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
	if diff != "" && changelogPath != "" {
		entries, err := extractEntriesFromDiff(diff, changelogPath)
		if err != nil && !errors.Is(err, ErrNoChangelogInDiff) && !errors.Is(err, ErrNoEntriesInDiff) {
			return nil, err
		}
		cl.AddedEntries = entries
	}
	return cl, nil
}

// parseContent parses the changelog content into the AST.
//
//nolint:gocognit,gocyclo,cyclop,funlen,nestif // Parser requires sequential state machine logic.
func parseContent(cl *Changelog, content string) error {
	scanner := bufio.NewScanner(strings.NewReader(content))
	var preamble strings.Builder
	var currentSection *Section
	var currentCategory *Category

	for scanner.Scan() {
		line := scanner.Text()

		// Check for [Unreleased] header
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
			cl.Unreleased = currentSection
			continue
		}

		// Check for version header
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
			cl.Versions = append(cl.Versions, currentSection)
			continue
		}

		// Check for category header
		if matches := categoryPattern.FindStringSubmatch(line); matches != nil {
			if currentSection != nil {
				if currentCategory != nil {
					currentSection.Categories = append(currentSection.Categories, *currentCategory)
				}
				currentCategory = &Category{
					Name:    matches[1],
					Entries: nil,
				}
			}
			continue
		}

		// Check for list item
		if matches := listItemPattern.FindStringSubmatch(line); matches != nil {
			if currentCategory != nil {
				currentCategory.Entries = append(currentCategory.Entries, matches[1])
			}
			continue
		}

		// Preamble (before any section)
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

	// Finalize last category
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

		// Stop at next file in diff
		if strings.HasPrefix(line, "diff --git") && !strings.HasPrefix(line, changelogDiffPrefix) {
			break
		}

		// Skip diff metadata lines
		if strings.HasPrefix(line, "@@") || strings.HasPrefix(line, "---") || strings.HasPrefix(line, "+++") ||
			strings.HasPrefix(line, "index ") || strings.HasPrefix(line, "diff --git") {
			continue
		}

		// Get the content without diff markers (+/-/space) for section detection
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

		// Reset category at version boundaries
		if versionPattern.MatchString(contentLine) {
			currentCategory = ""
			continue
		}

		// Track category headers (both context and added)
		if matches := categoryPattern.FindStringSubmatch(contentLine); matches != nil {
			currentCategory = matches[1]
			continue
		}

		// Only process added lines for entries
		if !strings.HasPrefix(line, "+") {
			continue
		}

		// Must be in a section with a category
		if currentCategory == "" {
			continue
		}

		// Extract list items from added lines
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

	if len(c.Unreleased.Categories) == 0 {
		return nil, ErrUnreleasedEmpty
	}

	hasContent := false
	for _, cat := range c.Unreleased.Categories {
		if len(cat.Entries) > 0 {
			hasContent = true
			break
		}
	}
	if !hasContent {
		return nil, ErrUnreleasedEmpty
	}

	ver, err := semver.Parse("v" + normalized)
	if err != nil {
		return nil, fmt.Errorf("parse version: %w", err)
	}

	// Clone the changelog
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

	// Create new version section from unreleased content
	newVersion := &Section{
		Version:    ver,
		Date:       date,
		Categories: cloneCategories(c.Unreleased.Categories),
	}

	// Prepend new version to versions list
	newCl.Versions = make([]*Section, 0, len(c.Versions)+1)
	newCl.Versions = append(newCl.Versions, newVersion)
	for _, v := range c.Versions {
		newCl.Versions = append(newCl.Versions, cloneSection(v))
	}

	return newCl, nil
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

	// Clone versions
	versions := make([]*Section, len(c.Versions))
	for i, v := range c.Versions {
		versions[i] = cloneSection(v)
	}

	// Clone the changelog
	newCl := &Changelog{
		Preamble:     c.Preamble,
		Unreleased:   cloneSection(c.Unreleased),
		Versions:     versions,
		AddedEntries: c.AddedEntries,
	}

	// Group new entries by category
	byCategory := make(map[string][]string)
	for _, e := range entries {
		byCategory[e.Category] = append(byCategory[e.Category], e.Text)
	}

	// Insert entries into existing categories or create new ones
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

	// Sort categories by standard order
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
// Also strips the 'studioctl/' prefix if present.
func normalizeVersion(version string) string {
	version = strings.TrimPrefix(version, "studioctl/")
	version = strings.TrimPrefix(version, "v")

	if !regexp.MustCompile(`^\d+\.\d+\.\d+`).MatchString(version) {
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
