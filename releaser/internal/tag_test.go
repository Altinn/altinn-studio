package internal_test

import (
	"errors"
	"testing"

	"altinn.studio/releaser/internal"
	"altinn.studio/releaser/internal/version"
)

func TestTagWithComponent(t *testing.T) {
	comp, err := internal.GetComponent("studioctl")
	if err != nil {
		t.Fatalf("GetComponent() error: %v", err)
	}
	ver, err := version.Parse("v1.2.3")
	if err != nil {
		t.Fatalf("ParseVersion() error: %v", err)
	}

	tag := internal.NewTag(comp, ver)

	if tag.Full() != "studioctl/v1.2.3" {
		t.Errorf("Full() = %q, want %q", tag.Full(), "studioctl/v1.2.3")
	}
	if tag.ReleaseBranch() != "release/studioctl/v1.2" {
		t.Errorf("ReleaseBranch() = %q, want %q", tag.ReleaseBranch(), "release/studioctl/v1.2")
	}
}

func TestComponentDerivedNames(t *testing.T) {
	tests := []struct {
		name       string
		compName   string
		version    string
		wantTag    string
		wantBranch string
		wantPrepBr string
		wantLabel  string
		wantTitle  string
	}{
		{
			name:       "studioctl",
			compName:   "studioctl",
			version:    "v1.2.3",
			wantTag:    "studioctl/v1.2.3",
			wantBranch: "release/studioctl/v1.2",
			wantPrepBr: "release-prep/studioctl-v1.2.3",
			wantLabel:  "studioctl-release",
			wantTitle:  "studioctl v1.2.3",
		},
		{
			name:       "fileanalyzers",
			compName:   "fileanalyzers",
			version:    "v2.0.0",
			wantTag:    "fileanalyzers/v2.0.0",
			wantBranch: "release/fileanalyzers/v2.0",
			wantPrepBr: "release-prep/fileanalyzers-v2.0.0",
			wantLabel:  "fileanalyzers-release",
			wantTitle:  "fileanalyzers v2.0.0",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			comp, err := internal.GetComponent(tt.compName)
			if err != nil {
				t.Fatalf("GetComponent() error: %v", err)
			}
			ver, err := version.Parse(tt.version)
			if err != nil {
				t.Fatalf("ParseVersion() error: %v", err)
			}

			if got := comp.Tag(tt.version); got != tt.wantTag {
				t.Errorf("Tag() = %q, want %q", got, tt.wantTag)
			}
			if got := comp.ReleaseBranch(ver.Major, ver.Minor); got != tt.wantBranch {
				t.Errorf("ReleaseBranch() = %q, want %q", got, tt.wantBranch)
			}
			if got := comp.PrepBranch(tt.version); got != tt.wantPrepBr {
				t.Errorf("PrepBranch() = %q, want %q", got, tt.wantPrepBr)
			}
			if got := comp.ReleaseLabel(); got != tt.wantLabel {
				t.Errorf("ReleaseLabel() = %q, want %q", got, tt.wantLabel)
			}
			if got := comp.ReleaseTitle(tt.version); got != tt.wantTitle {
				t.Errorf("ReleaseTitle() = %q, want %q", got, tt.wantTitle)
			}
		})
	}
}

func TestComponentBackportBranch(t *testing.T) {
	comp, err := internal.GetComponent("studioctl")
	if err != nil {
		t.Fatalf("GetComponent() error: %v", err)
	}

	// SHA gets truncated to 8 chars
	got := comp.BackportBranch("v1.0", "abcdefghijklmnop")
	want := "backport/studioctl-v1.0-abcdefgh"
	if got != want {
		t.Errorf("BackportBranch() = %q, want %q", got, want)
	}

	// Short SHA used as-is
	got = comp.BackportBranch("v1.0", "abc")
	want = "backport/studioctl-v1.0-abc"
	if got != want {
		t.Errorf("BackportBranch() = %q, want %q", got, want)
	}
}

func TestGetComponent(t *testing.T) {
	tests := []struct {
		name    string
		compID  string
		wantErr bool
	}{
		{name: "studioctl exists", compID: "studioctl", wantErr: false},
		{name: "fileanalyzers exists", compID: "fileanalyzers", wantErr: false},
		{name: "unknown fails", compID: "unknown", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			comp, err := internal.GetComponent(tt.compID)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("GetComponent() expected error, got nil")
				}
				if !errors.Is(err, internal.ErrComponentNotFound) {
					t.Errorf("error = %v, want ErrComponentNotFound", err)
				}
				return
			}
			if err != nil {
				t.Fatalf("GetComponent() unexpected error: %v", err)
			}
			if comp.Name != tt.compID {
				t.Errorf("Name = %q, want %q", comp.Name, tt.compID)
			}
		})
	}
}
