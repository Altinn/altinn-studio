package version_test

import (
	"errors"
	"testing"

	"altinn.studio/releaser/internal/version"
)

func TestParse(t *testing.T) {
	tests := []struct {
		wantErr          error
		name             string
		version          string
		wantFull         string
		wantNum          string
		wantPrerelease   string
		wantMajor        int
		wantMinor        int
		wantPatch        int
		wantIsPrerelease bool
		wantIsPatch      bool
	}{
		{
			name:             "stable release v1.0.0",
			version:          "v1.0.0",
			wantFull:         "v1.0.0",
			wantNum:          "1.0.0",
			wantMajor:        1,
			wantMinor:        0,
			wantPatch:        0,
			wantIsPrerelease: false,
			wantIsPatch:      false,
		},
		{
			name:             "stable release v1.2.3",
			version:          "v1.2.3",
			wantFull:         "v1.2.3",
			wantNum:          "1.2.3",
			wantMajor:        1,
			wantMinor:        2,
			wantPatch:        3,
			wantIsPrerelease: false,
			wantIsPatch:      true,
		},
		{
			name:             "preview release",
			version:          "v1.0.0-preview.1",
			wantFull:         "v1.0.0-preview.1",
			wantNum:          "1.0.0-preview.1",
			wantMajor:        1,
			wantMinor:        0,
			wantPatch:        0,
			wantPrerelease:   "preview.1",
			wantIsPrerelease: true,
			wantIsPatch:      false,
		},
		{
			name:             "preview release with higher numbers",
			version:          "v2.5.3-preview.12",
			wantFull:         "v2.5.3-preview.12",
			wantNum:          "2.5.3-preview.12",
			wantMajor:        2,
			wantMinor:        5,
			wantPatch:        3,
			wantPrerelease:   "preview.12",
			wantIsPrerelease: true,
			wantIsPatch:      false, // prerelease versions are never patch releases
		},
		{
			name:             "alpha prerelease",
			version:          "v1.0.0-alpha",
			wantFull:         "v1.0.0-alpha",
			wantNum:          "1.0.0-alpha",
			wantMajor:        1,
			wantMinor:        0,
			wantPatch:        0,
			wantPrerelease:   "alpha",
			wantIsPrerelease: true,
			wantIsPatch:      false,
		},
		{
			name:             "beta prerelease with number",
			version:          "v1.0.0-beta.2",
			wantFull:         "v1.0.0-beta.2",
			wantNum:          "1.0.0-beta.2",
			wantMajor:        1,
			wantMinor:        0,
			wantPatch:        0,
			wantPrerelease:   "beta.2",
			wantIsPrerelease: true,
			wantIsPatch:      false,
		},
		{
			name:             "rc prerelease",
			version:          "v2.0.0-rc.1",
			wantFull:         "v2.0.0-rc.1",
			wantNum:          "2.0.0-rc.1",
			wantMajor:        2,
			wantMinor:        0,
			wantPatch:        0,
			wantPrerelease:   "rc.1",
			wantIsPrerelease: true,
			wantIsPatch:      false,
		},
		{
			name:             "complex prerelease identifier",
			version:          "v1.0.0-alpha.1.beta.2",
			wantFull:         "v1.0.0-alpha.1.beta.2",
			wantNum:          "1.0.0-alpha.1.beta.2",
			wantMajor:        1,
			wantMinor:        0,
			wantPatch:        0,
			wantPrerelease:   "alpha.1.beta.2",
			wantIsPrerelease: true,
			wantIsPatch:      false,
		},
		{
			name:             "version with whitespace",
			version:          "  v1.0.0  ",
			wantFull:         "v1.0.0",
			wantNum:          "1.0.0",
			wantMajor:        1,
			wantMinor:        0,
			wantPatch:        0,
			wantIsPrerelease: false,
			wantIsPatch:      false,
		},
		{
			name:    "missing v prefix",
			version: "1.0.0",
			wantErr: version.ErrInvalidFormat,
		},
		{
			name:    "invalid version format",
			version: "v1.0",
			wantErr: version.ErrInvalidFormat,
		},
		{
			name:    "empty string",
			version: "",
			wantErr: version.ErrInvalidFormat,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ver, err := version.Parse(tt.version)

			if tt.wantErr != nil {
				if err == nil {
					t.Fatalf("Parse() expected error, got nil")
				}
				if !errors.Is(err, tt.wantErr) {
					t.Errorf("Parse() error = %v, want %v", err, tt.wantErr)
				}
				return
			}

			if err != nil {
				t.Fatalf("Parse() unexpected error: %v", err)
			}

			if ver.Full != tt.wantFull {
				t.Errorf("Full = %q, want %q", ver.Full, tt.wantFull)
			}
			if ver.Num != tt.wantNum {
				t.Errorf("Num = %q, want %q", ver.Num, tt.wantNum)
			}
			if ver.Major != tt.wantMajor {
				t.Errorf("Major = %d, want %d", ver.Major, tt.wantMajor)
			}
			if ver.Minor != tt.wantMinor {
				t.Errorf("Minor = %d, want %d", ver.Minor, tt.wantMinor)
			}
			if ver.Patch != tt.wantPatch {
				t.Errorf("Patch = %d, want %d", ver.Patch, tt.wantPatch)
			}
			if ver.Prerelease != tt.wantPrerelease {
				t.Errorf("Prerelease = %q, want %q", ver.Prerelease, tt.wantPrerelease)
			}
			if ver.IsPrerelease != tt.wantIsPrerelease {
				t.Errorf("IsPrerelease = %v, want %v", ver.IsPrerelease, tt.wantIsPrerelease)
			}
			if ver.IsPatchRelease() != tt.wantIsPatch {
				t.Errorf("IsPatchRelease() = %v, want %v", ver.IsPatchRelease(), tt.wantIsPatch)
			}
		})
	}
}

func TestVersionFields(t *testing.T) {
	ver, err := version.Parse("v1.2.3")
	if err != nil {
		t.Fatalf("Parse() error: %v", err)
	}

	if ver.Full != "v1.2.3" {
		t.Errorf("Full = %q, want %q", ver.Full, "v1.2.3")
	}
	if ver.Num != "1.2.3" {
		t.Errorf("Num = %q, want %q", ver.Num, "1.2.3")
	}
	if ver.Major != 1 {
		t.Errorf("Major = %d, want %d", ver.Major, 1)
	}
	if ver.Minor != 2 {
		t.Errorf("Minor = %d, want %d", ver.Minor, 2)
	}
	if ver.Patch != 3 {
		t.Errorf("Patch = %d, want %d", ver.Patch, 3)
	}
	if ver.String() != "v1.2.3" {
		t.Errorf("String() = %q, want %q", ver.String(), "v1.2.3")
	}
}

func TestPrereleaseVersionFields(t *testing.T) {
	ver, err := version.Parse("v1.2.3-preview.5")
	if err != nil {
		t.Fatalf("Parse() error: %v", err)
	}

	if ver.Num != "1.2.3-preview.5" {
		t.Errorf("Num = %q, want %q", ver.Num, "1.2.3-preview.5")
	}
	if ver.Prerelease != "preview.5" {
		t.Errorf("Prerelease = %q, want %q", ver.Prerelease, "preview.5")
	}
	if !ver.IsPrerelease {
		t.Error("IsPrerelease = false, want true")
	}
}
