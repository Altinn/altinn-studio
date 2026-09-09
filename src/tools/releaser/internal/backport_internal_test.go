package internal

import "testing"

func TestParseBackportConfig_StrictReleaseLine(t *testing.T) {
	t.Parallel()

	comp, err := GetComponent("studioctl")
	if err != nil {
		t.Fatalf("GetComponent() error: %v", err)
	}

	tests := []struct {
		name      string
		line      string
		shouldErr bool
	}{
		{name: "valid release line", line: "v1.2"},
		{name: "missing v prefix", line: "1.2", shouldErr: true},
		{name: "patch version not allowed", line: "v1.2.3", shouldErr: true},
		{name: "non numeric suffix", line: "v1.2foo", shouldErr: true},
		{name: "major non numeric", line: "va.2", shouldErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			_, err := parseBackportConfig(BackportRequest{
				Component: "studioctl",
				Commit:    "0123456789abcdef",
				Line:      tt.line,
			}, comp)
			if tt.shouldErr && err == nil {
				t.Fatalf("parseBackportConfig() expected error for %q", tt.line)
			}
			if !tt.shouldErr && err != nil {
				t.Fatalf("parseBackportConfig() error for %q: %v", tt.line, err)
			}
		})
	}
}

func TestParseBackportConfig_Line(t *testing.T) {
	t.Parallel()

	comp, err := GetComponent("studioctl")
	if err != nil {
		t.Fatalf("GetComponent() error: %v", err)
	}

	cfg, err := parseBackportConfig(BackportRequest{
		Component: "studioctl",
		Commit:    "0123456789abcdef",
		Line:      "v1.2",
	}, comp)
	if err != nil {
		t.Fatalf("parseBackportConfig() error: %v", err)
	}
	if cfg.releaseBranch != "release/studioctl/v1.2" {
		t.Fatalf("releaseBranch = %q, want release/studioctl/v1.2", cfg.releaseBranch)
	}
}
