package install

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"altinn.studio/studioctl/internal/config"
)

const testUserAgent = "studioctl/v1.2.3"

func TestResolveLatestStudioctlVersion(t *testing.T) {
	tests := []struct {
		name    string
		body    string
		want    string
		wantErr bool
	}{
		{
			name: "returns highest stable semver when present",
			body: `[
				{"tag_name":"studioctl/v2.0.0-preview.1","draft":false,"prerelease":true},
				{"tag_name":"studioctl/v1.9.0","draft":false,"prerelease":false},
				{"tag_name":"studioctl/v1.10.2","draft":false,"prerelease":false}
			]`,
			want: "studioctl/v1.10.2",
		},
		{
			name: "ignores prerelease flagged stable-looking tag",
			body: `[
				{"tag_name":"studioctl/v2.0.0","draft":false,"prerelease":true},
				{"tag_name":"studioctl/v1.10.2","draft":false,"prerelease":false}
			]`,
			want: "studioctl/v1.10.2",
		},
		{
			name: "falls back to highest preview semver when no stable",
			body: `[
				{"tag_name":"studioctl/v2.0.0-preview.3","draft":false,"prerelease":true},
				{"tag_name":"studioctl/v2.0.0-preview.10","draft":false,"prerelease":true},
				{"tag_name":"studioctl/v2.1.0-preview.1","draft":false,"prerelease":true}
			]`,
			want: "studioctl/v2.1.0-preview.1",
		},
		{
			name: "errors when no studioctl releases",
			body: `[
				{"tag_name":"v2026.3","draft":false,"prerelease":false}
			]`,
			wantErr: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			server := httptest.NewServer(
				http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					if r.URL.Path != "/repos/Altinn/altinn-studio/releases" {
						t.Fatalf("unexpected path: %s", r.URL.Path)
					}
					if got := r.Header.Get("User-Agent"); got != testUserAgent {
						t.Fatalf("User-Agent = %q, want %s", got, testUserAgent)
					}
					if _, err := w.Write([]byte(tc.body)); err != nil {
						t.Fatalf("write response: %v", err)
					}
				}),
			)
			defer server.Close()

			got, err := newHTTPDownloader(config.NewVersion("studioctl/v1.2.3")).resolveLatestStudioctlVersionFromBase(
				context.Background(),
				"Altinn/altinn-studio",
				server.URL+"/repos",
			)
			if (err != nil) != tc.wantErr {
				t.Fatalf("resolveLatestStudioctlVersion() error = %v, wantErr %v", err, tc.wantErr)
			}
			if got != tc.want {
				t.Fatalf("resolveLatestStudioctlVersion() = %q, want %q", got, tc.want)
			}
		})
	}
}

func TestResolveUpdateVersionExplicitVersionSkipsNetwork(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{Version: config.NewVersion("studioctl/v1.2.3")}
	got, err := NewService(cfg).ResolveUpdateVersion(
		context.Background(),
		UpdateOptions{Version: "v1.5.0"},
	)
	if err != nil {
		t.Fatalf("ResolveUpdateVersion() error = %v", err)
	}
	if got != "v1.5.0" {
		t.Fatalf("ResolveUpdateVersion() = %q, want %q", got, "v1.5.0")
	}
}

func TestResolveUpdateVersionRejectsInvalidVersion(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{Version: config.NewVersion("studioctl/v1.2.3")}
	_, err := NewService(cfg).ResolveUpdateVersion(
		context.Background(),
		UpdateOptions{Version: "1.5.0"},
	)
	if !errors.Is(err, errInvalidReleaseVersion) {
		t.Fatalf("ResolveUpdateVersion() error = %v, want errInvalidReleaseVersion", err)
	}
}

func TestResolveLatestStudioctlVersion_Paginates(t *testing.T) {
	requests := 0
	server := httptest.NewServer(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			requests++
			if r.URL.Path != "/repos/Altinn/altinn-studio/releases" {
				t.Fatalf("unexpected path: %s", r.URL.Path)
			}
			if got := r.Header.Get("User-Agent"); got != testUserAgent {
				t.Fatalf("User-Agent = %q, want %s", got, testUserAgent)
			}

			page := r.URL.Query().Get("page")
			if page == "1" {
				releases := make([]map[string]any, releasePageSize)
				for i := range releases {
					releases[i] = map[string]any{
						"tag_name":   fmt.Sprintf("v2026.%d", i),
						"draft":      false,
						"prerelease": false,
					}
				}
				if err := json.NewEncoder(w).Encode(releases); err != nil {
					t.Fatalf("encode page 1 releases: %v", err)
				}
				return
			}

			if page == "2" {
				if err := json.NewEncoder(w).Encode(
					[]map[string]any{
						{
							"tag_name":   "studioctl/v1.2.3",
							"draft":      false,
							"prerelease": false,
						},
					},
				); err != nil {
					t.Fatalf("encode page 2 releases: %v", err)
				}
				return
			}

			if err := json.NewEncoder(w).Encode([]map[string]any{}); err != nil {
				t.Fatalf("encode empty releases: %v", err)
			}
		}),
	)
	defer server.Close()

	got, err := newHTTPDownloader(config.NewVersion("studioctl/v1.2.3")).resolveLatestStudioctlVersionFromBase(
		context.Background(),
		"Altinn/altinn-studio",
		server.URL+"/repos",
	)
	if err != nil {
		t.Fatalf("resolveLatestStudioctlVersion() error = %v", err)
	}
	if got != "studioctl/v1.2.3" {
		t.Fatalf("resolveLatestStudioctlVersion() = %q, want %q", got, "studioctl/v1.2.3")
	}
	if requests < 2 {
		t.Fatalf("expected at least 2 requests, got %d", requests)
	}
}

func TestResolveLatestStudioctlVersion_MaxPagesBound(t *testing.T) {
	requests := 0
	server := httptest.NewServer(
		http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			requests++
			// Always return a full page so the scan never breaks early; the page
			// budget is the only thing that stops pagination.
			releases := make([]map[string]any, releasePageSize)
			for i := range releases {
				releases[i] = map[string]any{
					"tag_name":   fmt.Sprintf("v2026.%d", i),
					"draft":      false,
					"prerelease": false,
				}
			}
			if err := json.NewEncoder(w).Encode(releases); err != nil {
				t.Fatalf("encode releases: %v", err)
			}
		}),
	)
	defer server.Close()

	downloader := newHTTPDownloader(config.NewVersion("studioctl/v1.2.3"))
	downloader.maxPages = 2
	_, err := downloader.resolveLatestStudioctlVersionFromBase(
		context.Background(),
		"Altinn/altinn-studio",
		server.URL+"/repos",
	)
	if !errors.Is(err, errStudioctlReleaseNotFound) {
		t.Fatalf("resolveLatestStudioctlVersionFromBase() error = %v, want errStudioctlReleaseNotFound", err)
	}
	if requests != 2 {
		t.Fatalf("expected exactly 2 requests with maxPages=2, got %d", requests)
	}
}

func TestIsReleaseVersion(t *testing.T) {
	t.Parallel()

	tests := []struct {
		version string
		want    bool
	}{
		{version: "0.1.0-preview.0", want: true},
		{version: "v0.1.0", want: true},
		{version: "studioctl/v0.1.0-preview.15", want: true},
		{version: "dev", want: false},
		{version: "", want: false},
		{version: "not-a-version", want: false},
	}

	for _, tc := range tests {
		t.Run(tc.version, func(t *testing.T) {
			t.Parallel()
			if got := IsReleaseVersion(tc.version); got != tc.want {
				t.Fatalf("IsReleaseVersion(%q) = %v, want %v", tc.version, got, tc.want)
			}
		})
	}
}

func TestIsNewerReleaseVersion(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		current   string
		candidate string
		want      bool
	}{
		{name: "newer patch", current: "v0.1.0", candidate: "v0.1.1", want: true},
		{name: "newer preview", current: "v0.1.0-preview.14", candidate: "v0.1.0-preview.15", want: true},
		{name: "stable over preview", current: "v0.1.0-preview.15", candidate: "v0.1.0", want: true},
		{name: "bare current version", current: "0.1.0-preview.0", candidate: "v0.1.0-preview.15", want: true},
		{name: "studioctl prefix accepted", current: "studioctl/v0.1.0", candidate: "studioctl/v0.2.0", want: true},
		{name: "same version", current: "v0.1.0", candidate: "v0.1.0", want: false},
		{name: "older candidate", current: "v0.2.0", candidate: "v0.1.0", want: false},
		{name: "older preview candidate", current: "v0.1.0-preview.15", candidate: "v0.1.0-preview.14", want: false},
		{name: "unparsable current", current: "dev", candidate: "v0.1.0", want: false},
		{name: "unparsable candidate", current: "v0.1.0", candidate: "not-a-version", want: false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			if got := IsNewerReleaseVersion(tc.current, tc.candidate); got != tc.want {
				t.Fatalf("IsNewerReleaseVersion(%q, %q) = %v, want %v", tc.current, tc.candidate, got, tc.want)
			}
		})
	}
}
