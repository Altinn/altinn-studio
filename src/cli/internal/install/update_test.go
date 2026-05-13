//nolint:testpackage // Tests package-private release parsing and checksum helpers.
package install

import (
	"errors"
	"os"
	"path/filepath"
	"testing"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/osutil"
)

func TestNormalizeReleaseVersion(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		input   string
		want    string
		wantErr bool
	}{
		{name: "empty means auto-resolve", input: "", want: ""},
		{name: "latest is rejected", input: "latest", wantErr: true},
		{name: "plain semver normalized", input: "v1.2.3", want: "studioctl/v1.2.3"},
		{name: "prefixed version passes through", input: "studioctl/v1.2.3", want: "studioctl/v1.2.3"},
		{name: "invalid format errors", input: "1.2.3", wantErr: true},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			got, err := normalizeReleaseVersion(tc.input)
			if (err != nil) != tc.wantErr {
				t.Fatalf("normalizeReleaseVersion() error = %v, wantErr %v", err, tc.wantErr)
			}
			if got != tc.want {
				t.Fatalf("normalizeReleaseVersion() = %q, want %q", got, tc.want)
			}
		})
	}
}

func TestStudioctlReleaseTag(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		input   string
		want    string
		wantErr bool
	}{
		{name: "plain v tag", input: "v1.2.3", want: "studioctl/v1.2.3"},
		{name: "prefixed tag", input: "studioctl/v1.2.3", want: "studioctl/v1.2.3"},
		{name: "preview tag", input: "v1.2.3-preview.4", want: "studioctl/v1.2.3-preview.4"},
		{name: "missing v prefix", input: "1.2.3", wantErr: true},
		{name: "invalid v tag", input: "vnext", wantErr: true},
		{name: "empty", input: "", wantErr: true},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			got, err := studioctlReleaseTag(tc.input)
			if (err != nil) != tc.wantErr {
				t.Fatalf("studioctlReleaseTag() error = %v, wantErr %v", err, tc.wantErr)
			}
			if got != tc.want {
				t.Fatalf("studioctlReleaseTag() = %q, want %q", got, tc.want)
			}
		})
	}
}

func TestDefaultAssetName(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		wantErrType error
		goos        string
		goarch      string
		want        string
	}{
		{name: "linux amd64", goos: osutil.OSLinux, goarch: "amd64", want: "studioctl-linux-amd64"},
		{name: "darwin arm64", goos: osutil.OSDarwin, goarch: "arm64", want: "studioctl-darwin-arm64"},
		{name: "windows amd64", goos: osutil.OSWindows, goarch: "amd64", want: "studioctl-windows-amd64.exe"},
		{name: "unsupported os", goos: "plan9", goarch: "amd64", wantErrType: errUnsupportedPlatform},
		{name: "unsupported arch", goos: osutil.OSLinux, goarch: "386", wantErrType: errUnsupportedArchitecture},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			got, err := defaultAssetName(tc.goos, tc.goarch)
			if tc.wantErrType != nil {
				if !errors.Is(err, tc.wantErrType) {
					t.Fatalf("defaultAssetName() error = %v, want %v", err, tc.wantErrType)
				}
				return
			}
			if err != nil {
				t.Fatalf("defaultAssetName() unexpected error: %v", err)
			}
			if got != tc.want {
				t.Fatalf("defaultAssetName() = %q, want %q", got, tc.want)
			}
		})
	}
}

func TestResourcesArchiveAssetName(t *testing.T) {
	t.Parallel()

	got, err := resourcesArchiveAssetName(osutil.OSWindows, "amd64")
	if err != nil {
		t.Fatalf("resourcesArchiveAssetName() unexpected error: %v", err)
	}
	if got != "studioctl-resources-windows-amd64.tar.gz" {
		t.Fatalf("resourcesArchiveAssetName() = %q, want %q", got, "studioctl-resources-windows-amd64.tar.gz")
	}
}

func TestChecksumForAsset(t *testing.T) {
	t.Parallel()

	const hash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

	checksums := []byte(hash + "  *studioctl-linux-amd64\n" + hash + "  *other-asset\n")
	got, err := checksumForAsset(checksums, "studioctl-linux-amd64")
	if err != nil {
		t.Fatalf("checksumForAsset() unexpected error: %v", err)
	}
	if got != hash {
		t.Fatalf("checksumForAsset() = %q, want %q", got, hash)
	}

	_, err = checksumForAsset(checksums, "missing")
	if !errors.Is(err, errChecksumAssetNotFound) {
		t.Fatalf("checksumForAsset() error = %v, want %v", err, errChecksumAssetNotFound)
	}
}

func TestRemoveHomeRemovesConfiguredHome(t *testing.T) {
	t.Parallel()

	home := filepath.Join(t.TempDir(), "studioctl-home")
	cfg, err := config.New(config.Flags{Home: home}, "test-version")
	if err != nil {
		t.Fatalf("config.New() error = %v", err)
	}
	if writeErr := os.WriteFile(filepath.Join(cfg.Home, "config.yaml"), []byte("test"), 0o600); writeErr != nil {
		t.Fatalf("write config: %v", writeErr)
	}

	removed, err := NewService(cfg).RemoveHome()
	if err != nil {
		t.Fatalf("RemoveHome() error = %v", err)
	}
	if removed != home {
		t.Fatalf("RemoveHome() = %q, want %q", removed, home)
	}
	if _, err := os.Stat(home); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("home still exists after RemoveHome(): %v", err)
	}
}

func TestRemoveHomeRejectsUserHome(t *testing.T) {
	t.Parallel()

	home, err := os.UserHomeDir()
	if err != nil {
		t.Skipf("user home unavailable: %v", err)
	}

	err = NewService(&config.Config{Home: home}).ValidateHomeRemoval()
	if !errors.Is(err, errUnsafeHomeRemoval) {
		t.Fatalf("ValidateHomeRemoval() error = %v, want errUnsafeHomeRemoval", err)
	}
}

func TestRemoveHomeRejectsCurrentDirectory(t *testing.T) {
	t.Parallel()

	cwd, err := os.Getwd()
	if err != nil {
		t.Fatalf("get cwd: %v", err)
	}

	err = NewService(&config.Config{Home: cwd}).ValidateHomeRemoval()
	if !errors.Is(err, errUnsafeHomeRemoval) {
		t.Fatalf("ValidateHomeRemoval() error = %v, want errUnsafeHomeRemoval", err)
	}
}

func TestReleaseURLs(t *testing.T) {
	t.Parallel()

	base, sums := releaseURLs("Altinn/altinn-studio", "studioctl/v1.2.3")
	if base != "https://github.com/Altinn/altinn-studio/releases/download/studioctl/v1.2.3" {
		t.Fatalf("releaseURLs(version) base = %q", base)
	}
	if sums != "https://github.com/Altinn/altinn-studio/releases/download/studioctl/v1.2.3/SHA256SUMS" {
		t.Fatalf("releaseURLs(version) sums = %q", sums)
	}
}
