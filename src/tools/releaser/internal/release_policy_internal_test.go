package internal

import (
	"errors"
	"testing"

	"altinn.studio/releaser/internal/version"
)

func TestResolveReleaseEnvironment(t *testing.T) {
	t.Parallel()

	tests := []struct {
		wantErr error
		name    string
		version string
		want    ReleaseEnvironment
	}{
		{
			name:    "stable",
			version: "v1.2.3",
			want:    ReleaseEnvironmentProd,
		},
		{
			name:    "preview",
			version: "1.2.3-preview.4",
			want:    ReleaseEnvironmentDev,
		},
		{
			name:    "release candidate",
			version: "v1.2.3-rc.2",
			want:    ReleaseEnvironmentStaging,
		},
		{
			name:    "unsupported prerelease channel",
			version: "v1.2.3-alpha.1",
			wantErr: errReleaseChannelUnsupported,
		},
		{
			name:    "invalid version",
			version: "not-a-version",
			wantErr: version.ErrInvalidFormat,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got, err := resolveReleaseEnvironment(tc.version)
			if tc.wantErr != nil {
				if !errors.Is(err, tc.wantErr) {
					t.Fatalf("resolveReleaseEnvironment() error = %v, want %v", err, tc.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("resolveReleaseEnvironment() error = %v", err)
			}
			if got != tc.want {
				t.Fatalf("resolveReleaseEnvironment() = %q, want %q", got, tc.want)
			}
		})
	}
}
