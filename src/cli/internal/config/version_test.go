package config_test

import (
	"testing"

	"altinn.studio/studioctl/internal/config"
)

func TestNewVersionNormalizesReleaseTag(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		value     string
		want      string
		wantAgent string
	}{
		{
			name:      "bare version",
			value:     "v1.2.3",
			want:      "v1.2.3",
			wantAgent: "studioctl/v1.2.3",
		},
		{
			name:      "release tag",
			value:     "studioctl/v1.2.3",
			want:      "v1.2.3",
			wantAgent: "studioctl/v1.2.3",
		},
		{
			name:      "trimmed release tag",
			value:     " studioctl/v1.2.3 ",
			want:      "v1.2.3",
			wantAgent: "studioctl/v1.2.3",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			version := config.NewVersion(tt.value)
			if got := version.String(); got != tt.want {
				t.Fatalf("String() = %q, want %q", got, tt.want)
			}
			if got := version.UserAgent(); got != tt.wantAgent {
				t.Fatalf("UserAgent() = %q, want %q", got, tt.wantAgent)
			}
		})
	}
}
