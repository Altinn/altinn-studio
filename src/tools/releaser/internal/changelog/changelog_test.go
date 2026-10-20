package changelog_test

import (
	"errors"
	"slices"
	"strings"
	"testing"
	"time"

	"altinn.studio/releaser/internal/changelog"
)

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
			name:    "extract with other component prefix",
			content: sampleChangelog,
			version: "fileanalyzers/v1.2.0",
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

func TestParse_CompactCategorySpacing(t *testing.T) {
	content := `# Changelog

## [Unreleased]

### Added
- Compact spacing entry
`

	cl, err := changelog.Parse(content)
	if err != nil {
		t.Fatalf("Parse() error = %v", err)
	}
	if cl.Unreleased == nil {
		t.Fatal("Parse() unreleased section = nil, want non-nil")
	}
	if len(cl.Unreleased.Categories) != 1 {
		t.Fatalf("Parse() categories len = %d, want 1", len(cl.Unreleased.Categories))
	}
	if got := cl.Unreleased.Categories[0].Entries; len(got) != 1 || got[0] != "Compact spacing entry" {
		t.Fatalf("Parse() entries = %v, want [Compact spacing entry]", got)
	}
	if !strings.Contains(cl.String(), "### Added\n\n- Compact spacing entry") {
		t.Fatalf("String() did not normalize compact spacing:\n%s", cl.String())
	}
}

func TestParse_ContinuationLines(t *testing.T) {
	content := `# Changelog

## [Unreleased]

### Added

- Wrapped entry that
  continues here
- Entry with a nested list:
  - first
  - second
- Single line

## [1.0.0] - 2024-01-01

### Fixed

- Released entry
    continued
`

	cl, err := changelog.Parse(content)
	if err != nil {
		t.Fatalf("Parse() error = %v", err)
	}
	want := []string{
		"Wrapped entry that\n  continues here",
		"Entry with a nested list:\n  - first\n  - second",
		"Single line",
	}
	if got := cl.Unreleased.Categories[0].Entries; !slices.Equal(got, want) {
		t.Fatalf("Parse() unreleased entries = %q, want %q", got, want)
	}
	if got := cl.Versions[0].Categories[0].Entries; !slices.Equal(got, []string{"Released entry\n    continued"}) {
		t.Fatalf("Parse() released entries = %q", got)
	}
	if got := cl.String(); got != content {
		t.Fatalf("String() does not round-trip continuation lines:\n%s", got)
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
				"### Added\n\n- New feature X",
				"### Fixed\n\n- Bug in Y",
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
			name:    "promote with other component prefix",
			content: sampleChangelog,
			version: "fileanalyzers/v1.3.0",
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
			name: "promote stable from prerelease history when unreleased is empty",
			content: `# Changelog

## [Unreleased]

## [1.0.0-preview.2] - 2024-01-02

### Fixed

- Critical bugfix

## [1.0.0-preview.1] - 2024-01-01

### Added

- First stable feature
`,
			version: "1.0.0",
			contains: []string{
				"## [1.0.0] - 2024-02-01",
				"### Added\n\n- First stable feature",
				"### Fixed\n\n- Critical bugfix",
			},
		},
		{
			name: "promote stable from prerelease history and unreleased entries",
			content: `# Changelog

## [Unreleased]

### Added

- Final release polish

## [1.1.0-preview.2] - 2024-01-02

### Added

- Feature B

## [1.1.0-preview.1] - 2024-01-01

### Added

- Feature A
`,
			version: "1.1.0",
			contains: []string{
				"## [1.1.0] - 2024-02-01",
				"### Added\n\n- Feature A\n- Feature B\n- Final release polish",
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
				"### Added\n\n- New feature",
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

func TestPromote_MaintainsSemverOrder(t *testing.T) {
	fixedDate := time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC)

	tests := []struct {
		name         string
		content      string
		version      string
		wantVersions []string
	}{
		{
			name: "inserts stable in middle",
			content: `# Changelog

## [Unreleased]

### Added

- Upcoming

## [2.0.0] - 2024-01-10

### Added

- A

## [1.5.0] - 2024-01-09

### Added

- B

## [1.1.0] - 2024-01-08

### Added

- C
`,
			version:      "1.6.0",
			wantVersions: []string{"2.0.0", "1.6.0", "1.5.0", "1.1.0"},
		},
		{
			name: "appends oldest stable",
			content: `# Changelog

## [Unreleased]

### Added

- Upcoming

## [2.0.0] - 2024-01-10

### Added

- A

## [1.5.0] - 2024-01-09

### Added

- B
`,
			version:      "1.4.9",
			wantVersions: []string{"2.0.0", "1.5.0", "1.4.9"},
		},
		{
			name: "inserts prerelease below stable for same core",
			content: `# Changelog

## [Unreleased]

### Added

- Upcoming

## [1.2.0] - 2024-01-10

### Added

- Stable

## [1.2.0-preview.2] - 2024-01-09

### Added

- Preview

## [1.1.9] - 2024-01-08

### Added

- Older
`,
			version:      "1.2.0-preview.10",
			wantVersions: []string{"1.2.0", "1.2.0-preview.10", "1.2.0-preview.2", "1.1.9"},
		},
		{
			name: "inserts patch below newer previews and above prior stable",
			content: `# Changelog

## [Unreleased]

### Fixed

- Bugfix

## [1.1.0-preview.2] - 2024-01-10

### Added

- Preview 2

## [1.1.0-preview.1] - 2024-01-09

### Added

- Preview 1

## [1.0.0] - 2024-01-08

### Added

- Stable
`,
			version:      "1.0.1",
			wantVersions: []string{"1.1.0-preview.2", "1.1.0-preview.1", "1.0.1", "1.0.0"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cl, err := changelog.Parse(tt.content)
			if err != nil {
				t.Fatalf("Parse() error = %v", err)
			}

			promoted, err := cl.Promote(tt.version, fixedDate)
			if err != nil {
				t.Fatalf("Promote() error = %v", err)
			}

			gotVersions := make([]string, 0, len(promoted.Versions))
			for _, section := range promoted.Versions {
				gotVersions = append(gotVersions, section.Version.Num)
			}
			if !slices.Equal(gotVersions, tt.wantVersions) {
				t.Fatalf("Promote() versions = %v, want %v", gotVersions, tt.wantVersions)
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

// Edited entries, and another copy of an entry already in base, count as new.
func TestNewEntries(t *testing.T) {
	base, err := changelog.Parse(`# Changelog

## [Unreleased]

### Added

- Kept entry
- Entry that is edited

## [1.0.0] - 2024-01-01

### Fixed

- Released fix
`)
	if err != nil {
		t.Fatalf("Parse(base) error = %v", err)
	}
	head, err := changelog.Parse(`# Changelog

## [Unreleased]

### Added

- Kept entry
- Entry that is edited, now longer
- Entry with parts:
  - first part

### Fixed

- Released fix

## [1.0.0] - 2024-01-01

### Fixed

- Released fix
`)
	if err != nil {
		t.Fatalf("Parse(head) error = %v", err)
	}

	got := changelog.NewEntries(base.Entries(), head.Entries())
	want := []changelog.Entry{
		{Category: "Added", Text: "Entry that is edited, now longer"},
		{Category: "Added", Text: "Entry with parts:\n  - first part"},
		{Category: "Fixed", Text: "Released fix"},
	}
	if !slices.Equal(got, want) {
		t.Fatalf("NewEntries() = %q, want %q", got, want)
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
				"### Fixed\n\n- New bugfix\n- Bug in Y",
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
				"### Fixed\n\n- A bugfix",
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
				"### Fixed\n\n- Bugfix one\n- Bugfix two",
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
				"### Added\n\n- New feature",
				"### Fixed\n\n- Bugfix",
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
				"### Changed\n\n- Backport change",
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

func TestParse_InvalidCategory(t *testing.T) {
	tests := []struct {
		name          string
		content       string
		wantCategory  string
		wantValidList string
	}{
		{
			name: "invalid category in unreleased",
			content: `# Changelog

## [Unreleased]

### Invalid

- Some entry`,
			wantCategory:  "Invalid",
			wantValidList: "Added, Changed, Fixed, Removed, Security, Deprecated",
		},
		{
			name: "invalid category in version",
			content: `# Changelog

## [1.0.0] - 2024-01-01

### Breaking

- Breaking change`,
			wantCategory:  "Breaking",
			wantValidList: "Added, Changed, Fixed, Removed, Security, Deprecated",
		},
		{
			name: "typo in category",
			content: `# Changelog

## [Unreleased]

### Adedd

- Feature`,
			wantCategory:  "Adedd",
			wantValidList: "Added, Changed, Fixed, Removed, Security, Deprecated",
		},
		{
			name: "lowercase category",
			content: `# Changelog

## [Unreleased]

### added

- Feature`,
			wantCategory:  "added",
			wantValidList: "Added, Changed, Fixed, Removed, Security, Deprecated",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := changelog.Parse(tt.content)
			if err == nil {
				t.Fatal("Parse() error = nil, want error")
			}
			if !errors.Is(err, changelog.ErrInvalidCategory) {
				t.Errorf("Parse() error = %v, want error wrapping ErrInvalidCategory", err)
			}
			errMsg := err.Error()
			if !strings.Contains(errMsg, tt.wantCategory) {
				t.Errorf("error message %q does not contain invalid category %q", errMsg, tt.wantCategory)
			}
			if !strings.Contains(errMsg, tt.wantValidList) {
				t.Errorf("error message %q does not contain valid categories list %q", errMsg, tt.wantValidList)
			}
		})
	}
}

func TestParse_CategoryOrder(t *testing.T) {
	tests := []struct {
		wantErrType  error
		name         string
		content      string
		wantInErrMsg string
		wantErr      bool
	}{
		{
			name: "correct order",
			content: `# Changelog

## [Unreleased]

### Added

- New feature

### Changed

- Updated something

### Fixed

- Bug fix`,
			wantErr: false,
		},
		{
			name: "wrong order - Fixed before Changed",
			content: `# Changelog

## [Unreleased]

### Added

- New feature

### Fixed

- Bug fix

### Changed

- Updated something`,
			wantErr:      true,
			wantErrType:  changelog.ErrCategoryOrder,
			wantInErrMsg: "Changed",
		},
		{
			name: "wrong order - Removed before Fixed",
			content: `# Changelog

## [Unreleased]

### Added

- New feature

### Removed

- Removed feature

### Fixed

- Bug fix`,
			wantErr:      true,
			wantErrType:  changelog.ErrCategoryOrder,
			wantInErrMsg: "Fixed",
		},
		{
			name: "single category",
			content: `# Changelog

## [Unreleased]

### Fixed

- Bug fix`,
			wantErr: false,
		},
		{
			name: "subset in correct order",
			content: `# Changelog

## [Unreleased]

### Added

- New feature

### Fixed

- Bug fix

### Security

- Security fix`,
			wantErr: false,
		},
		{
			name: "wrong order in version section",
			content: `# Changelog

## [1.0.0] - 2024-01-01

### Fixed

- Bug fix

### Added

- New feature`,
			wantErr:      true,
			wantErrType:  changelog.ErrCategoryOrder,
			wantInErrMsg: "Added",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := changelog.Parse(tt.content)
			if (err != nil) != tt.wantErr {
				t.Errorf("Parse() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if tt.wantErr && err != nil {
				if !errors.Is(err, tt.wantErrType) {
					t.Errorf("Parse() error = %v, want error wrapping %v", err, tt.wantErrType)
				}
				if tt.wantInErrMsg != "" && !strings.Contains(err.Error(), tt.wantInErrMsg) {
					t.Errorf("Parse() error message %q does not contain %q", err.Error(), tt.wantInErrMsg)
				}
			}
		})
	}
}

func TestParse_VersionSectionValidation(t *testing.T) {
	tests := []struct {
		wantErrType error
		name        string
		content     string
		wantErr     bool
	}{
		{
			name: "released versions in descending order",
			content: `# Changelog

## [Unreleased]

### Added

- New feature

## [1.2.0] - 2024-01-02

### Added

- Stable release

## [1.2.0-preview.1] - 2024-01-01

### Added

- Preview release

## [1.1.0] - 2023-12-01

### Added

- Older release`,
		},
		{
			name: "historical prerelease lines below latest stable are allowed",
			content: `# Changelog

## [Unreleased]

### Added

- New feature

## [1.3.0-preview.1] - 2024-01-03

### Added

- Active preview

## [1.2.0] - 2024-01-02

### Added

- Latest stable

## [1.2.0-preview.2] - 2024-01-01

### Added

- Historical preview`,
		},
		{
			name: "duplicate released version",
			content: `# Changelog

## [Unreleased]

### Added

- New feature

## [1.2.0] - 2024-01-02

### Added

- Stable release

## [1.2.0] - 2024-01-01

### Fixed

- Duplicate section`,
			wantErr:     true,
			wantErrType: changelog.ErrDuplicateVersion,
		},
		{
			name: "released versions not descending",
			content: `# Changelog

## [Unreleased]

### Added

- New feature

## [1.1.0] - 2024-01-02

### Added

- Older release

## [1.2.0] - 2024-01-01

### Added

- Newer release`,
			wantErr:     true,
			wantErrType: changelog.ErrVersionOrder,
		},
		{
			name: "stable must come before prerelease for same core",
			content: `# Changelog

## [Unreleased]

### Added

- New feature

## [1.2.0-preview.1] - 2024-01-02

### Added

- Preview release

## [1.2.0] - 2024-01-01

### Added

- Stable release`,
			wantErr:     true,
			wantErrType: changelog.ErrVersionOrder,
		},
		{
			name: "historical prerelease line without stable section is allowed",
			content: `# Changelog

## [Unreleased]

### Added

- New feature

## [1.3.0-preview.1] - 2024-01-03

### Added

- Preview line A

## [1.2.0-preview.4] - 2024-01-02

### Added

- Preview line B

## [1.1.0] - 2024-01-01

### Added

- Stable release`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := changelog.Parse(tt.content)
			if (err != nil) != tt.wantErr {
				t.Errorf("Parse() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if tt.wantErr && !errors.Is(err, tt.wantErrType) {
				t.Errorf("Parse() error = %v, want error wrapping %v", err, tt.wantErrType)
			}
		})
	}
}
