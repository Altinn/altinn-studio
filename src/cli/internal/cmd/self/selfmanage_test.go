package self_test

import (
	"errors"
	"testing"

	self "altinn.studio/studioctl/internal/cmd/self"
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
