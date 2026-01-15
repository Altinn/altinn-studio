package changelog_test

import (
	"errors"
	"slices"
	"strings"
	"testing"
	"time"

	"altinn.studio/releaser/internal/changelog"
)

const testChangelogPath = "src/cli/CHANGELOG.md"

const sampleChangelog = `# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- New feature X

### Fixed
- Bug in Y

## [1.2.0] - 2024-01-15

### Added
- Feature A
- Feature B

### Changed
- Updated C

## [1.1.0] - 2024-01-01

### Added
- Initial feature
`

const emptyUnreleasedChangelog = `# Changelog

## [Unreleased]

## [1.0.0] - 2024-01-01

### Added
- Initial release
`

const noUnreleasedChangelog = `# Changelog

## [1.0.0] - 2024-01-01

### Added
- Initial release
`

const unreleasedOnlyChangelog = `# Changelog

## [Unreleased]

### Added
- New feature
`

func TestParse(t *testing.T) {
	cl, err := changelog.Parse(sampleChangelog)
	if err != nil {
		t.Fatalf("Parse() error = %v", err)
	}

	if cl.Preamble != "# Changelog\n\nAll notable changes to this project will be documented in this file." {
		t.Errorf("Preamble = %q, want changelog header", cl.Preamble)
	}

	if cl.Unreleased == nil {
		t.Fatal("Unreleased = nil, want non-nil")
	}

	if len(cl.Unreleased.Categories) != 2 {
		t.Errorf("Unreleased.Categories = %d, want 2", len(cl.Unreleased.Categories))
	}

	if len(cl.Versions) != 2 {
		t.Errorf("Versions = %d, want 2", len(cl.Versions))
	}

	if cl.Versions[0].Version.Num != "1.2.0" {
		t.Errorf("Versions[0].Version.Num = %q, want 1.2.0", cl.Versions[0].Version.Num)
	}

	if cl.Versions[0].Date.Format("2006-01-02") != "2024-01-15" {
		t.Errorf("Versions[0].Date = %v, want 2024-01-15", cl.Versions[0].Date)
	}
}

func TestExtractNotes(t *testing.T) {
	tests := []struct {
		wantErr error
		name    string
		content string
		version string
		want    string
	}{
		{
			name:    "extract existing version",
			content: sampleChangelog,
			version: "1.2.0",
			want: `### Added
- Feature A
- Feature B

### Changed
- Updated C`,
		},
		{
			name:    "extract with v prefix",
			content: sampleChangelog,
			version: "v1.2.0",
			want: `### Added
- Feature A
- Feature B

### Changed
- Updated C`,
		},
		{
			name:    "extract with studioctl/ prefix",
			content: sampleChangelog,
			version: "studioctl/v1.2.0",
			want: `### Added
- Feature A
- Feature B

### Changed
- Updated C`,
		},
		{
			name:    "extract last version",
			content: sampleChangelog,
			version: "1.1.0",
			want: `### Added
- Initial feature`,
		},
		{
			name:    "version not found",
			content: sampleChangelog,
			version: "9.9.9",
			wantErr: changelog.ErrVersionNotFound,
		},
		{
			name:    "invalid version format",
			content: sampleChangelog,
			version: "invalid",
			wantErr: changelog.ErrInvalidVersion,
		},
		{
			name:    "empty version",
			content: sampleChangelog,
			version: "",
			wantErr: changelog.ErrInvalidVersion,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cl, err := changelog.Parse(tt.content)
			if err != nil {
				t.Fatalf("Parse() error = %v", err)
			}

			got, err := cl.ExtractNotes(tt.version)
			if tt.wantErr != nil {
				if !errors.Is(err, tt.wantErr) {
					t.Errorf("ExtractNotes() error = %v, wantErr %v", err, tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Errorf("ExtractNotes() unexpected error = %v", err)
				return
			}
			if got != tt.want {
				t.Errorf("ExtractNotes() got:\n%s\n\nwant:\n%s", got, tt.want)
			}
		})
	}
}

func TestPromote(t *testing.T) {
	fixedDate := time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC)

	tests := []struct {
		name     string
		content  string
		version  string
		wantErr  error
		contains []string
		excludes []string
	}{
		{
			name:    "promote unreleased content",
			content: sampleChangelog,
			version: "1.3.0",
			contains: []string{
				"## [Unreleased]\n\n## [1.3.0] - 2024-02-01",
				"### Added\n- New feature X",
				"### Fixed\n- Bug in Y",
			},
		},
		{
			name:    "promote with v prefix",
			content: sampleChangelog,
			version: "v1.3.0",
			contains: []string{
				"## [1.3.0] - 2024-02-01",
			},
		},
		{
			name:    "promote with studioctl prefix",
			content: sampleChangelog,
			version: "studioctl/v1.3.0",
			contains: []string{
				"## [1.3.0] - 2024-02-01",
			},
		},
		{
			name:    "promote preview version",
			content: sampleChangelog,
			version: "1.3.0-preview.1",
			contains: []string{
				"## [1.3.0-preview.1] - 2024-02-01",
			},
		},
		{
			name:    "promote beta version",
			content: sampleChangelog,
			version: "1.3.0-beta.1",
			contains: []string{
				"## [1.3.0-beta.1] - 2024-02-01",
			},
		},
		{
			name:    "empty unreleased section",
			content: emptyUnreleasedChangelog,
			version: "1.1.0",
			wantErr: changelog.ErrUnreleasedEmpty,
		},
		{
			name:    "no unreleased section",
			content: noUnreleasedChangelog,
			version: "1.1.0",
			wantErr: changelog.ErrNoUnreleased,
		},
		{
			name:    "version already exists",
			content: sampleChangelog,
			version: "1.2.0",
			wantErr: changelog.ErrVersionExists,
		},
		{
			name:    "invalid version",
			content: sampleChangelog,
			version: "invalid",
			wantErr: changelog.ErrInvalidVersion,
		},
		{
			name:    "promote when unreleased is only section",
			content: unreleasedOnlyChangelog,
			version: "1.0.0",
			contains: []string{
				"## [Unreleased]\n\n## [1.0.0] - 2024-02-01",
				"### Added\n- New feature",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cl, err := changelog.Parse(tt.content)
			if err != nil {
				t.Fatalf("Parse() error = %v", err)
			}

			promoted, err := cl.Promote(tt.version, fixedDate)
			if tt.wantErr != nil {
				if !errors.Is(err, tt.wantErr) {
					t.Errorf("Promote() error = %v, wantErr %v", err, tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Errorf("Promote() unexpected error = %v", err)
				return
			}
			got := promoted.String()
			for _, want := range tt.contains {
				if !strings.Contains(got, want) {
					t.Errorf("Promote() result missing expected content:\n%s\n\ngot:\n%s", want, got)
				}
			}
			for _, exclude := range tt.excludes {
				if strings.Contains(got, exclude) {
					t.Errorf("Promote() result contains unexpected content:\n%s\n\ngot:\n%s", exclude, got)
				}
			}
		})
	}
}

func TestValidateUnreleased(t *testing.T) {
	tests := []struct {
		name    string
		content string
		want    bool
	}{
		{
			name:    "has unreleased content",
			content: sampleChangelog,
			want:    true,
		},
		{
			name:    "empty unreleased section",
			content: emptyUnreleasedChangelog,
			want:    false,
		},
		{
			name:    "no unreleased section",
			content: noUnreleasedChangelog,
			want:    false,
		},
		{
			name:    "unreleased only",
			content: unreleasedOnlyChangelog,
			want:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cl, err := changelog.Parse(tt.content)
			if err != nil {
				t.Fatalf("Parse() error = %v", err)
			}

			got := cl.ValidateUnreleased() == nil
			if got != tt.want {
				t.Errorf("ValidateUnreleased() == nil = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestHasVersion(t *testing.T) {
	tests := []struct {
		name    string
		content string
		version string
		want    bool
	}{
		{
			name:    "version exists",
			content: sampleChangelog,
			version: "1.2.0",
			want:    true,
		},
		{
			name:    "version exists with v prefix",
			content: sampleChangelog,
			version: "v1.2.0",
			want:    true,
		},
		{
			name:    "version not found",
			content: sampleChangelog,
			version: "9.9.9",
			want:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cl, err := changelog.Parse(tt.content)
			if err != nil {
				t.Fatalf("Parse() error = %v", err)
			}

			if got := cl.HasVersion(tt.version); got != tt.want {
				t.Errorf("HasVersion() = %v, want %v", got, tt.want)
			}
		})
	}
}

// Sample git diffs for testing entry extraction.
const sampleDiff = `diff --git a/src/cli/CHANGELOG.md b/src/cli/CHANGELOG.md
index abc123..def456 100644
--- a/src/cli/CHANGELOG.md
+++ b/src/cli/CHANGELOG.md
@@ -4,6 +4,9 @@ All notable changes to this project will be documented in this file.

 ## [Unreleased]

+### Fixed
+- Fix memory leak in connection pool
+
 ### Added
 - Existing feature

`

const sampleDiffMultipleEntries = `diff --git a/src/cli/CHANGELOG.md b/src/cli/CHANGELOG.md
index abc123..def456 100644
--- a/src/cli/CHANGELOG.md
+++ b/src/cli/CHANGELOG.md
@@ -4,6 +4,12 @@ All notable changes to this project will be documented in this file.

 ## [Unreleased]

+### Added
+- New command for backporting
+
+### Fixed
+- Fix memory leak in connection pool
+- Fix race condition in scheduler
+
 ## [1.0.0] - 2024-01-15

 ### Added
`

const sampleDiffNoChangelog = `diff --git a/main.go b/main.go
index abc123..def456 100644
--- a/main.go
+++ b/main.go
@@ -1,5 +1,5 @@
 package main

-func old() {}
+func new() {}
`

const sampleDiffNoEntries = `diff --git a/src/cli/CHANGELOG.md b/src/cli/CHANGELOG.md
index abc123..def456 100644
--- a/src/cli/CHANGELOG.md
+++ b/src/cli/CHANGELOG.md
@@ -1,3 +1,4 @@
 # Changelog

+Some random text that is not an entry.
 ## [Unreleased]
`

const sampleDiffBackport = `diff --git a/src/cli/CHANGELOG.md b/src/cli/CHANGELOG.md
index 1111111..2222222 100644
--- a/src/cli/CHANGELOG.md
+++ b/src/cli/CHANGELOG.md
@@ -3,6 +3,7 @@
 ## [Unreleased]

 ### Added
+- Backport entry
 ### Fixed
 - Existing fix
diff --git a/other.go b/other.go
index aaa..bbb 100644
--- a/other.go
+++ b/other.go
@@ -1 +1 @@
-old
+new
`

func TestParseWithDiff(t *testing.T) {
	tests := []struct {
		wantFirst  changelog.Entry
		name       string
		diff       string
		wantCount  int
		checkFirst bool
	}{
		{
			name:       "single entry",
			diff:       sampleDiff,
			wantCount:  1,
			checkFirst: true,
			wantFirst: changelog.Entry{
				Category: "Fixed",
				Text:     "Fix memory leak in connection pool",
			},
		},
		{
			name:      "multiple entries",
			diff:      sampleDiffMultipleEntries,
			wantCount: 3,
		},
		{
			name:      "no changelog in diff",
			diff:      sampleDiffNoChangelog,
			wantCount: 0,
		},
		{
			name:      "no entries in diff",
			diff:      sampleDiffNoEntries,
			wantCount: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cl, err := changelog.ParseWithDiff("", tt.diff, testChangelogPath)
			if err != nil {
				t.Fatalf("ParseWithDiff() error = %v", err)
			}

			if len(cl.AddedEntries) != tt.wantCount {
				t.Errorf("AddedEntries count = %d, want %d", len(cl.AddedEntries), tt.wantCount)
			}
			if tt.checkFirst && len(cl.AddedEntries) > 0 {
				if cl.AddedEntries[0] != tt.wantFirst {
					t.Errorf("AddedEntries[0] = %+v, want %+v", cl.AddedEntries[0], tt.wantFirst)
				}
			}
		})
	}
}

func TestParseWithDiff_Categories(t *testing.T) {
	cl, err := changelog.ParseWithDiff("", sampleDiffMultipleEntries, testChangelogPath)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	categories := make(map[string]int)
	for _, e := range cl.AddedEntries {
		categories[e.Category]++
	}

	if categories["Added"] != 1 {
		t.Errorf("expected 1 Added entry, got %d", categories["Added"])
	}
	if categories["Fixed"] != 2 {
		t.Errorf("expected 2 Fixed entries, got %d", categories["Fixed"])
	}
}

func TestParseWithDiff_BackportStyle(t *testing.T) {
	cl, err := changelog.ParseWithDiff("", sampleDiffBackport, testChangelogPath)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(cl.AddedEntries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(cl.AddedEntries))
	}
	if cl.AddedEntries[0].Category != "Added" || cl.AddedEntries[0].Text != "Backport entry" {
		t.Fatalf("unexpected entry: %+v", cl.AddedEntries[0])
	}
}

func TestInsertEntries(t *testing.T) {
	tests := []struct {
		wantErr  error
		name     string
		content  string
		entries  []changelog.Entry
		contains []string
	}{
		{
			name:    "insert into existing category",
			content: sampleChangelog,
			entries: []changelog.Entry{
				{Category: "Fixed", Text: "New bugfix"},
			},
			contains: []string{
				"### Fixed\n- New bugfix\n- Bug in Y",
			},
		},
		{
			name:    "insert new category",
			content: unreleasedOnlyChangelog,
			entries: []changelog.Entry{
				{Category: "Fixed", Text: "A bugfix"},
			},
			contains: []string{
				"## [Unreleased]",
				"### Fixed\n- A bugfix",
			},
		},
		{
			name:    "insert multiple entries same category",
			content: emptyUnreleasedChangelog,
			entries: []changelog.Entry{
				{Category: "Fixed", Text: "Bugfix one"},
				{Category: "Fixed", Text: "Bugfix two"},
			},
			contains: []string{
				"### Fixed\n- Bugfix one\n- Bugfix two",
			},
		},
		{
			name:    "insert multiple categories",
			content: emptyUnreleasedChangelog,
			entries: []changelog.Entry{
				{Category: "Added", Text: "New feature"},
				{Category: "Fixed", Text: "Bugfix"},
			},
			contains: []string{
				"### Added\n- New feature",
				"### Fixed\n- Bugfix",
			},
		},
		{
			name:    "insert backport entry creates category",
			content: sampleChangelog,
			entries: []changelog.Entry{
				{Category: "Changed", Text: "Backport change"},
			},
			contains: []string{
				"## [Unreleased]",
				"### Changed\n- Backport change",
			},
		},
		{
			name:    "no unreleased section",
			content: noUnreleasedChangelog,
			entries: []changelog.Entry{
				{Category: "Fixed", Text: "Bugfix"},
			},
			wantErr: changelog.ErrNoUnreleased,
		},
		{
			name:     "empty entries",
			content:  sampleChangelog,
			entries:  []changelog.Entry{},
			contains: []string{sampleChangelog[:50]},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cl, err := changelog.Parse(tt.content)
			if err != nil {
				t.Fatalf("Parse() error = %v", err)
			}

			updated, err := cl.InsertEntries(tt.entries)
			if tt.wantErr != nil {
				if !errors.Is(err, tt.wantErr) {
					t.Errorf("InsertEntries() error = %v, wantErr %v", err, tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Errorf("InsertEntries() unexpected error = %v", err)
				return
			}
			got := updated.String()
			for _, want := range tt.contains {
				if !strings.Contains(got, want) {
					t.Errorf("InsertEntries() result missing expected content:\n%s\n\ngot:\n%s", want, got)
				}
			}
		})
	}
}

func TestInsertEntries_CategoryOrder(t *testing.T) {
	cl, err := changelog.Parse(emptyUnreleasedChangelog)
	if err != nil {
		t.Fatalf("Parse() error = %v", err)
	}

	entries := []changelog.Entry{
		{Category: "Removed", Text: "Removed feature"},
		{Category: "Added", Text: "New feature"},
		{Category: "Fixed", Text: "Bugfix"},
		{Category: "Changed", Text: "Changed behavior"},
	}

	updated, err := cl.InsertEntries(entries)
	if err != nil {
		t.Fatalf("InsertEntries() error = %v", err)
	}

	got := updated.String()

	// Check order: Added should come before Changed, Changed before Fixed, Fixed before Removed
	addedIdx := strings.Index(got, "### Added")
	changedIdx := strings.Index(got, "### Changed")
	fixedIdx := strings.Index(got, "### Fixed")
	removedIdx := strings.Index(got, "### Removed")

	indices := []int{addedIdx, changedIdx, fixedIdx, removedIdx}
	if !slices.IsSorted(indices) {
		t.Errorf("categories not in expected order: Added=%d, Changed=%d, Fixed=%d, Removed=%d",
			addedIdx, changedIdx, fixedIdx, removedIdx)
	}
}

func TestSection_String(t *testing.T) {
	cl, err := changelog.Parse(sampleChangelog)
	if err != nil {
		t.Fatalf("Parse() error = %v", err)
	}

	ver := cl.GetVersion("1.2.0")
	if ver == nil {
		t.Fatal("GetVersion() = nil, want non-nil")
	}

	got := ver.String()
	want := `### Added
- Feature A
- Feature B

### Changed
- Updated C`

	if got != want {
		t.Errorf("Section.String() got:\n%s\n\nwant:\n%s", got, want)
	}
}

func TestSection_IsUnreleased(t *testing.T) {
	cl, err := changelog.Parse(sampleChangelog)
	if err != nil {
		t.Fatalf("Parse() error = %v", err)
	}

	if !cl.Unreleased.IsUnreleased() {
		t.Error("Unreleased.IsUnreleased() = false, want true")
	}

	if cl.Versions[0].IsUnreleased() {
		t.Error("Versions[0].IsUnreleased() = true, want false")
	}
}

func TestSection_HasCategory(t *testing.T) {
	cl, err := changelog.Parse(sampleChangelog)
	if err != nil {
		t.Fatalf("Parse() error = %v", err)
	}

	if !cl.Unreleased.HasCategory("Added") {
		t.Error("Unreleased.HasCategory(Added) = false, want true")
	}

	if cl.Unreleased.HasCategory("Removed") {
		t.Error("Unreleased.HasCategory(Removed) = true, want false")
	}
}

func TestSection_GetCategory(t *testing.T) {
	cl, err := changelog.Parse(sampleChangelog)
	if err != nil {
		t.Fatalf("Parse() error = %v", err)
	}

	cat := cl.Unreleased.GetCategory("Added")
	if cat == nil {
		t.Fatal("GetCategory(Added) = nil, want non-nil")
	}

	if len(cat.Entries) != 1 || cat.Entries[0] != "New feature X" {
		t.Errorf("GetCategory(Added).Entries = %v, want [New feature X]", cat.Entries)
	}

	if cl.Unreleased.GetCategory("Removed") != nil {
		t.Error("GetCategory(Removed) != nil, want nil")
	}
}

func TestChangelog_String_RoundTrip(t *testing.T) {
	// Parse and re-serialize should produce valid changelog
	cl, err := changelog.Parse(sampleChangelog)
	if err != nil {
		t.Fatalf("Parse() error = %v", err)
	}

	serialized := cl.String()

	// Parse again
	cl2, err := changelog.Parse(serialized)
	if err != nil {
		t.Fatalf("Parse(serialized) error = %v", err)
	}

	// Check key properties are preserved
	if cl2.Unreleased == nil {
		t.Error("Unreleased = nil after round trip")
	}

	if len(cl2.Versions) != len(cl.Versions) {
		t.Errorf("Versions count = %d, want %d", len(cl2.Versions), len(cl.Versions))
	}

	for i, v := range cl.Versions {
		if cl2.Versions[i].Version.Num != v.Version.Num {
			t.Errorf("Versions[%d].Version.Num = %q, want %q", i, cl2.Versions[i].Version.Num, v.Version.Num)
		}
	}
}
