package internal

import "testing"

func TestParseBackportConfig_StrictBranchVersion(t *testing.T) {
	t.Parallel()

	comp, err := GetComponent("studioctl")
	if err != nil {
		t.Fatalf("GetComponent() error: %v", err)
	}

	tests := []struct {
		name      string
		branch    string
		shouldErr bool
	}{
		{name: "valid release line", branch: "v1.2"},
		{name: "missing v prefix", branch: "1.2", shouldErr: true},
		{name: "patch version not allowed", branch: "v1.2.3", shouldErr: true},
		{name: "non numeric suffix", branch: "v1.2foo", shouldErr: true},
		{name: "major non numeric", branch: "va.2", shouldErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			_, err := parseBackportConfig(BackportRequest{
				Component: "studioctl",
				Commit:    "0123456789abcdef",
				Branch:    tt.branch,
			}, comp)
			if tt.shouldErr && err == nil {
				t.Fatalf("parseBackportConfig() expected error for %q", tt.branch)
			}
			if !tt.shouldErr && err != nil {
				t.Fatalf("parseBackportConfig() error for %q: %v", tt.branch, err)
			}
		})
	}
}
