package cmd

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	authstore "altinn.studio/studioctl/internal/auth"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/studio"
	"altinn.studio/studioctl/internal/ui"
)

const appsSearchTestQuery = "apps"

func TestAppsSearchCommandPrintsResults(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/designer/api/repos/search" {
			t.Fatalf("path = %s, want /designer/api/repos/search", r.URL.Path)
		}
		query := r.URL.Query()
		if got := query.Get("keyword"); got != appsSearchTestQuery {
			t.Fatalf("keyword = %q, want %s", got, appsSearchTestQuery)
		}
		if got := query.Get("limit"); got != "1" {
			t.Fatalf("limit = %q, want 1", got)
		}
		if got := query.Get("page"); got != "1" {
			t.Fatalf("page = %q, want 1", got)
		}

		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Total-Count", "1")
		if err := json.NewEncoder(w).Encode(studio.SearchAppsResult{
			Ok:         true,
			TotalCount: 1,
			TotalPages: 1,
			Data: []studio.Repository{
				{
					Name:        "apps-test",
					FullName:    "ttd/apps-test",
					Description: "Test app",
				},
			},
		}); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	}))
	defer server.Close()

	cfg := appsSearchTestConfig(t, server)
	var out bytes.Buffer
	command := NewAppsCommand(cfg, ui.NewOutput(&out, io.Discard, false))

	if err := command.Run(
		t.Context(),
		[]string{"search", "--env", "dev", "--limit", "1", appsSearchTestQuery},
	); err != nil {
		t.Fatalf("Run() error = %v", err)
	}

	got := out.String()
	if !strings.Contains(got, "APP ID") || !strings.Contains(got, "DESCRIPTION") {
		t.Fatalf("output = %q, want table headers", got)
	}
	if !strings.Contains(got, "ttd/apps-test") || !strings.Contains(got, "Test app") {
		t.Fatalf("output = %q, want app row", got)
	}
}

func TestAppsSearchCommandPrintsJSON(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(studio.SearchAppsResult{
			Ok:         true,
			TotalCount: 1,
			TotalPages: 1,
			Data: []studio.Repository{
				{
					Name:     "apps-test",
					FullName: "ttd/apps-test",
					CloneURL: "https://altinn.studio/repos/ttd/apps-test.git",
					HTMLURL:  "https://altinn.studio/repos/ttd/apps-test",
				},
			},
		}); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	}))
	defer server.Close()

	cfg := appsSearchTestConfig(t, server)
	var out bytes.Buffer
	command := NewAppsCommand(cfg, ui.NewOutput(&out, io.Discard, false))

	if err := command.Run(t.Context(), []string{"search", "--env", "dev", "--json", appsSearchTestQuery}); err != nil {
		t.Fatalf("Run() error = %v", err)
	}

	var got appsSearchOutput
	if err := json.Unmarshal([]byte(strings.TrimSpace(out.String())), &got); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if got.Query != appsSearchTestQuery {
		t.Fatalf("Query = %q, want %s", got.Query, appsSearchTestQuery)
	}
	if len(got.Apps) != 1 || got.Apps[0].AppID != "ttd/apps-test" {
		t.Fatalf("Apps = %+v, want one ttd/apps-test app", got.Apps)
	}
	if got.TotalCount != 1 {
		t.Fatalf("TotalCount = %d, want 1", got.TotalCount)
	}
}

func TestAppsSearchCommandRequiresQuery(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{}
	command := NewAppsCommand(cfg, ui.NewOutput(io.Discard, io.Discard, false))

	err := command.Run(t.Context(), []string{"search"})
	if err == nil {
		t.Fatal("Run() error = nil, want missing argument")
	}
	if !strings.Contains(err.Error(), ErrMissingArgument.Error()) {
		t.Fatalf("Run() error = %v, want missing argument", err)
	}
}

func appsSearchTestConfig(t *testing.T, server *httptest.Server) *config.Config {
	t.Helper()

	cfg, err := config.New(config.Flags{Home: t.TempDir()}, "test-version")
	if err != nil {
		t.Fatalf("config.New() error = %v", err)
	}
	if err := authstore.SaveCredentials(cfg.Home, &authstore.Credentials{
		Envs: map[string]authstore.EnvCredentials{
			"dev": {
				Host:   strings.TrimPrefix(server.URL, "http://"),
				Scheme: "http",
				ApiKey: "test-api-key",
			},
		},
	}); err != nil {
		t.Fatalf("SaveCredentials() error = %v", err)
	}
	return cfg
}
