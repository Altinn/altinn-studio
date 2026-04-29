package self_test

import (
	"context"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"

	self "altinn.studio/studioctl/internal/cmd/self"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/ui"
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

			got, err := self.NormalizeReleaseVersion(tc.input)
			if (err != nil) != tc.wantErr {
				t.Fatalf("NormalizeReleaseVersion() error = %v, wantErr %v", err, tc.wantErr)
			}
			if got != tc.want {
				t.Fatalf("NormalizeReleaseVersion() = %q, want %q", got, tc.want)
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
		{name: "linux amd64", goos: "linux", goarch: "amd64", want: "studioctl-linux-amd64"},
		{name: "darwin arm64", goos: "darwin", goarch: "arm64", want: "studioctl-darwin-arm64"},
		{name: "windows amd64", goos: "windows", goarch: "amd64", want: "studioctl-windows-amd64.exe"},
		{name: "unsupported os", goos: "plan9", goarch: "amd64", wantErrType: self.ErrUnsupportedPlatform},
		{name: "unsupported arch", goos: "linux", goarch: "386", wantErrType: self.ErrUnsupportedArchitecture},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			got, err := self.DefaultAssetName(tc.goos, tc.goarch)
			if tc.wantErrType != nil {
				if !errors.Is(err, tc.wantErrType) {
					t.Fatalf("DefaultAssetName() error = %v, want %v", err, tc.wantErrType)
				}
				return
			}
			if err != nil {
				t.Fatalf("DefaultAssetName() unexpected error: %v", err)
			}
			if got != tc.want {
				t.Fatalf("DefaultAssetName() = %q, want %q", got, tc.want)
			}
		})
	}
}

func TestAppManagerAssetName(t *testing.T) {
	t.Parallel()

	got, err := self.AppManagerAssetName("windows", "amd64")
	if err != nil {
		t.Fatalf("AppManagerAssetName() unexpected error: %v", err)
	}
	if got != "app-manager-windows-amd64.tar.gz" {
		t.Fatalf("AppManagerAssetName() = %q, want %q", got, "app-manager-windows-amd64.tar.gz")
	}
}

func TestPickerUsesProvidedInput(t *testing.T) {
	t.Parallel()

	const installDir = "/tmp/studioctl-bin"
	out := ui.NewOutput(io.Discard, io.Discard, false)
	picker := self.NewPicker(
		out,
		strings.NewReader("\n"),
		[]self.Candidate{
			{
				Path:        installDir,
				Writable:    true,
				Recommended: true,
			},
		},
	)

	got, err := picker.Run(context.Background())
	if err != nil {
		t.Fatalf("Picker.Run() error = %v", err)
	}
	if got != installDir {
		t.Fatalf("Picker.Run() = %q, want %q", got, installDir)
	}
}

func TestDefaultInstallLocation(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		want       string
		candidates []self.Candidate
		wantOK     bool
	}{
		{
			name: "uses recommended writable candidate",
			candidates: []self.Candidate{
				{Path: "/not-selected", Writable: true},
				{Path: "/selected", Writable: true, Recommended: true},
			},
			want:   "/selected",
			wantOK: true,
		},
		{
			name: "falls back to first writable candidate",
			candidates: []self.Candidate{
				{Path: "/not-writable", Writable: false, Recommended: true},
				{Path: "/selected", Writable: true},
			},
			want:   "/selected",
			wantOK: true,
		},
		{
			name: "returns false when no writable candidates exist",
			candidates: []self.Candidate{
				{Path: "/not-writable", Writable: false, Recommended: true},
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			got, ok := self.DefaultInstallLocation(tc.candidates)
			if ok != tc.wantOK {
				t.Fatalf("DefaultInstallLocation() ok = %v, want %v", ok, tc.wantOK)
			}
			if got != tc.want {
				t.Fatalf("DefaultInstallLocation() = %q, want %q", got, tc.want)
			}
		})
	}
}

func TestChecksumForAsset(t *testing.T) {
	t.Parallel()

	const hash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

	checksums := []byte(hash + "  *studioctl-linux-amd64\n" + hash + "  *other-asset\n")
	got, err := self.ChecksumForAsset(checksums, "studioctl-linux-amd64")
	if err != nil {
		t.Fatalf("ChecksumForAsset() unexpected error: %v", err)
	}
	if got != hash {
		t.Fatalf("ChecksumForAsset() = %q, want %q", got, hash)
	}

	_, err = self.ChecksumForAsset(checksums, "missing")
	if !errors.Is(err, self.ErrChecksumAssetNotFound) {
		t.Fatalf("ChecksumForAsset() error = %v, want %v", err, self.ErrChecksumAssetNotFound)
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

	removed, err := self.NewService(cfg).RemoveHome()
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

	err = self.NewService(&config.Config{Home: home}).ValidateHomeRemoval()
	if !errors.Is(err, self.ErrUnsafeHomeRemoval) {
		t.Fatalf("ValidateHomeRemoval() error = %v, want ErrUnsafeHomeRemoval", err)
	}
}

func TestRemoveHomeRejectsCurrentDirectory(t *testing.T) {
	t.Parallel()

	cwd, err := os.Getwd()
	if err != nil {
		t.Fatalf("get cwd: %v", err)
	}

	err = self.NewService(&config.Config{Home: cwd}).ValidateHomeRemoval()
	if !errors.Is(err, self.ErrUnsafeHomeRemoval) {
		t.Fatalf("ValidateHomeRemoval() error = %v, want ErrUnsafeHomeRemoval", err)
	}
}

func TestReleaseURLs(t *testing.T) {
	t.Parallel()

	base, sums := self.ReleaseURLs("Altinn/altinn-studio", "studioctl/v1.2.3")
	if base != "https://github.com/Altinn/altinn-studio/releases/download/studioctl/v1.2.3" {
		t.Fatalf("ReleaseURLs(version) base = %q", base)
	}
	if sums != "https://github.com/Altinn/altinn-studio/releases/download/studioctl/v1.2.3/SHA256SUMS" {
		t.Fatalf("ReleaseURLs(version) sums = %q", sums)
	}
}
