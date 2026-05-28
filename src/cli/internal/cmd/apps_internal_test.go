package cmd

import (
	"bytes"
	"encoding/json"
	"fmt"
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

	server, reqErrCh := newAppsSearchTestServer(t, studio.SearchAppsResult{
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
	}, func(r *http.Request) error {
		if r.URL.Path != "/designer/api/repos/search" {
			return fmt.Errorf("path = %s, want /designer/api/repos/search", r.URL.Path)
		}
		query := r.URL.Query()
		if got := query.Get("keyword"); got != appsSearchTestQuery {
			return fmt.Errorf("keyword = %q, want %s", got, appsSearchTestQuery)
		}
		if got := query.Get("limit"); got != "1" {
			return fmt.Errorf("limit = %q, want 1", got)
		}
		if got := query.Get("page"); got != "1" {
			return fmt.Errorf("page = %q, want 1", got)
		}
		return nil
	})

	cfg := appsSearchTestConfig(t, server)
	var out bytes.Buffer
	command := NewAppsCommand(cfg, ui.NewOutput(&out, io.Discard, false))

	err := command.Run(
		t.Context(),
		[]string{"search", "--env", "dev", "--limit", "1", appsSearchTestQuery},
	)
	assertNoAppsSearchRequestError(t, reqErrCh)
	if err != nil {
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

	server, reqErrCh := newAppsSearchTestServer(t, studio.SearchAppsResult{
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
	}, nil)

	cfg := appsSearchTestConfig(t, server)
	var out bytes.Buffer
	command := NewAppsCommand(cfg, ui.NewOutput(&out, io.Discard, false))

	if err := command.Run(t.Context(), []string{"search", "--env", "dev", "--json", appsSearchTestQuery}); err != nil {
		t.Fatalf("Run() error = %v", err)
	}
	assertNoAppsSearchRequestError(t, reqErrCh)

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

func newAppsSearchTestServer(
	t *testing.T,
	result studio.SearchAppsResult,
	validateRequest func(*http.Request) error,
) (*httptest.Server, <-chan error) {
	t.Helper()

	reqErrCh := make(chan error, 1)
	recordRequestError := func(w http.ResponseWriter, err error) {
		select {
		case reqErrCh <- err:
		default:
		}
		http.Error(w, "unexpected request", http.StatusBadRequest)
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if validateRequest != nil {
			if err := validateRequest(r); err != nil {
				recordRequestError(w, err)
				return
			}
		}

		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Total-Count", "1")
		if err := json.NewEncoder(w).Encode(result); err != nil {
			recordRequestError(w, fmt.Errorf("encode response: %w", err))
		}
	}))
	t.Cleanup(server.Close)

	return server, reqErrCh
}

func assertNoAppsSearchRequestError(t *testing.T, reqErrCh <-chan error) {
	t.Helper()

	select {
	case reqErr := <-reqErrCh:
		t.Fatal(reqErr)
	default:
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
