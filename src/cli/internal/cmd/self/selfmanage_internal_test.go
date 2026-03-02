package self

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
)

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
					if _, err := w.Write([]byte(tc.body)); err != nil {
						t.Fatalf("write response: %v", err)
					}
				}),
			)
			defer server.Close()

			got, err := resolveLatestStudioctlVersionFromBase(
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

func TestResolveLatestStudioctlVersion_Paginates(t *testing.T) {
	requests := 0
	server := httptest.NewServer(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			requests++
			if r.URL.Path != "/repos/Altinn/altinn-studio/releases" {
				t.Fatalf("unexpected path: %s", r.URL.Path)
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

	got, err := resolveLatestStudioctlVersionFromBase(
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
