package cmd

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"altinn.studio/studioctl/internal/appmanager"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/ui"
)

var errShutdownWaitFailed = errors.New("wait failed")

func TestServersStatusJSON_Running(t *testing.T) {
	t.Parallel()

	processID := 1234
	var out bytes.Buffer
	command := &ServersCommand{
		out: ui.NewOutput(&out, io.Discard, false),
		client: fakeServersClient{
			status: &appmanager.Status{
				ProcessID:         42,
				AppManagerVersion: "1.2.3",
				DotnetVersion:     "10.0.0",
				StudioctlPath:     "/tmp/studioctl",
				InternalDev:       true,
				Tunnel: appmanager.TunnelStatus{
					Enabled:   true,
					Connected: true,
					URL:       "https://example.test",
				},
				Apps: []appmanager.DiscoveredApp{
					{
						ProcessID:   &processID,
						AppID:       "ttd/app",
						BaseURL:     "http://localhost:5000",
						Source:      "registered",
						Description: "test app",
					},
				},
			},
		},
	}

	if err := command.Run(context.Background(), []string{"status", "--json"}); err != nil {
		t.Fatalf("Run() error = %v", err)
	}

	var got serversStatusOutput
	if err := json.Unmarshal([]byte(strings.TrimSpace(out.String())), &got); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}

	if !got.Running {
		t.Fatal("running = false, want true")
	}
	if got.Status == nil {
		t.Fatal("status = nil, want value")
	}
	if got.Status.ProcessID != 42 {
		t.Fatalf("status.processId = %d, want 42", got.Status.ProcessID)
	}
	if len(got.Status.Apps) != 1 || got.Status.Apps[0].AppID != "ttd/app" {
		t.Fatalf("status.apps = %+v, want one app with appId ttd/app", got.Status.Apps)
	}
}

func TestServersUpJSON_AlreadyRunning(t *testing.T) {
	t.Parallel()

	var out bytes.Buffer
	command := &ServersCommand{
		out:    ui.NewOutput(&out, io.Discard, false),
		client: fakeServersClient{},
		ensureStarted: func(context.Context, *config.Config, string) error {
			return nil
		},
	}

	if err := command.Run(context.Background(), []string{"up", "--json"}); err != nil {
		t.Fatalf("Run() error = %v", err)
	}

	var got serversUpOutput
	if err := json.Unmarshal([]byte(strings.TrimSpace(out.String())), &got); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if !got.Running || got.Started {
		t.Fatalf("output = %+v, want running true and started false", got)
	}
}

func TestServersUpJSON_ReconcilesWhenAlreadyRunning(t *testing.T) {
	t.Parallel()

	var ensured bool
	var out bytes.Buffer
	command := &ServersCommand{
		out:    ui.NewOutput(&out, io.Discard, false),
		client: fakeServersClient{},
		ensureStarted: func(context.Context, *config.Config, string) error {
			ensured = true
			return nil
		},
	}

	if err := command.Run(context.Background(), []string{"up", "--json"}); err != nil {
		t.Fatalf("Run() error = %v", err)
	}
	if !ensured {
		t.Fatal("ensureStarted was not called")
	}
}

func TestServersUpJSON_Started(t *testing.T) {
	t.Parallel()

	var out bytes.Buffer
	command := &ServersCommand{
		out:    ui.NewOutput(&out, io.Discard, false),
		client: fakeServersClient{healthErr: appmanager.ErrNotRunning},
		ensureStarted: func(context.Context, *config.Config, string) error {
			return nil
		},
	}

	if err := command.Run(context.Background(), []string{"up", "--json"}); err != nil {
		t.Fatalf("Run() error = %v", err)
	}

	var got serversUpOutput
	if err := json.Unmarshal([]byte(strings.TrimSpace(out.String())), &got); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if !got.Running || !got.Started {
		t.Fatalf("output = %+v, want running true and started true", got)
	}
}

func TestServersStatusJSON_NotRunning(t *testing.T) {
	t.Parallel()

	var out bytes.Buffer
	command := &ServersCommand{
		out:    ui.NewOutput(&out, io.Discard, false),
		client: fakeServersClient{statusErr: appmanager.ErrNotRunning},
	}

	if err := command.Run(context.Background(), []string{"status", "--json"}); err != nil {
		t.Fatalf("Run() error = %v", err)
	}

	got := strings.TrimSpace(out.String())
	if got != `{"running":false}` {
		t.Fatalf("output = %s, want {\"running\":false}", got)
	}
}

func TestServersDownJSON_NotRunning(t *testing.T) {
	t.Parallel()

	var out bytes.Buffer
	command := &ServersCommand{
		out: ui.NewOutput(&out, io.Discard, false),
		shutdown: func(context.Context, *config.Config) (<-chan error, error) {
			return nil, appmanager.ErrNotRunning
		},
	}

	if err := command.Run(context.Background(), []string{"down", "--json"}); err != nil {
		t.Fatalf("Run() error = %v", err)
	}

	var got serversDownOutput
	if err := json.Unmarshal([]byte(strings.TrimSpace(out.String())), &got); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if got.WasRunning || got.ShutdownRequested {
		t.Fatalf("output = %+v, want wasRunning false and shutdownRequested false", got)
	}
}

func TestServersDownJSON_ShutdownRequested(t *testing.T) {
	t.Parallel()

	done := make(chan error)
	close(done)

	var out bytes.Buffer
	command := &ServersCommand{
		out: ui.NewOutput(&out, io.Discard, false),
		shutdown: func(context.Context, *config.Config) (<-chan error, error) {
			return done, nil
		},
	}

	if err := command.Run(context.Background(), []string{"down", "--json"}); err != nil {
		t.Fatalf("Run() error = %v", err)
	}

	var got serversDownOutput
	if err := json.Unmarshal([]byte(strings.TrimSpace(out.String())), &got); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if !got.WasRunning || !got.ShutdownRequested {
		t.Fatalf("output = %+v, want wasRunning true and shutdownRequested true", got)
	}
}

func TestServersDownJSON_ShutdownFailure(t *testing.T) {
	t.Parallel()

	done := make(chan error, 1)
	done <- errShutdownWaitFailed
	close(done)

	var out bytes.Buffer
	command := &ServersCommand{
		out: ui.NewOutput(&out, io.Discard, false),
		shutdown: func(context.Context, *config.Config) (<-chan error, error) {
			return done, nil
		},
	}

	err := command.Run(context.Background(), []string{"down", "--json"})
	if !errors.Is(err, errShutdownWaitFailed) {
		t.Fatalf("Run() error = %v, want %v", err, errShutdownWaitFailed)
	}
	if out.String() != "" {
		t.Fatalf("output = %q, want empty output on failure", out.String())
	}
}

func TestServersDownJSON_ContextCancelledWhileWaiting(t *testing.T) {
	t.Parallel()

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	var out bytes.Buffer
	command := &ServersCommand{
		out: ui.NewOutput(&out, io.Discard, false),
		shutdown: func(context.Context, *config.Config) (<-chan error, error) {
			return make(chan error), nil
		},
	}

	err := command.Run(ctx, []string{"down", "--json"})
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("Run() error = %v, want %v", err, context.Canceled)
	}
	if out.String() != "" {
		t.Fatalf("output = %q, want empty output on failure", out.String())
	}
}

func TestServersLogsJSON_TailsMatchingPIDAcrossFiles(t *testing.T) {
	t.Parallel()

	logDir := t.TempDir()
	appManagerLogDir := filepath.Join(logDir, "app-manager")
	oldPath := writeServerLog(t, appManagerLogDir, "2026-04-18-1.log", "one\n")
	newPath := writeServerLog(t, appManagerLogDir, "2026-04-19-1.log", "two\nthree\n")
	otherPath := writeServerLog(t, appManagerLogDir, "2026-04-19-2.log", "other\n")
	setServerLogModTime(t, oldPath, time.Date(2026, 4, 18, 1, 0, 0, 0, time.UTC))
	setServerLogModTime(t, newPath, time.Date(2026, 4, 19, 2, 0, 0, 0, time.UTC))
	setServerLogModTime(t, otherPath, time.Date(2026, 4, 19, 1, 0, 0, 0, time.UTC))

	var out bytes.Buffer
	command := &ServersCommand{
		cfg: &config.Config{LogDir: logDir},
		out: ui.NewOutput(&out, io.Discard, false),
	}

	if err := command.Run(
		context.Background(),
		[]string{"logs", "--follow=false", "--tail", "2", "--json"},
	); err != nil {
		t.Fatalf("Run() error = %v", err)
	}

	lines := strings.Split(strings.TrimSpace(out.String()), "\n")
	if len(lines) != 2 {
		t.Fatalf("output lines = %d, want 2: %q", len(lines), out.String())
	}
	want := []string{"two", "three"}
	for i, line := range lines {
		var got struct {
			Server string `json:"server"`
			Line   string `json:"line"`
		}
		if err := json.Unmarshal([]byte(line), &got); err != nil {
			t.Fatalf("json.Unmarshal(line %d) error = %v", i, err)
		}
		if got.Server != "app-manager" {
			t.Fatalf("line %d server = %q, want app-manager", i, got.Server)
		}
		if got.Line != want[i] {
			t.Fatalf("line %d = %q, want %q", i, got.Line, want[i])
		}
	}
}

func TestServersLogs_MissingLogFile(t *testing.T) {
	t.Parallel()

	var out bytes.Buffer
	command := &ServersCommand{
		cfg: &config.Config{LogDir: t.TempDir()},
		out: ui.NewOutput(&out, io.Discard, false),
	}

	err := command.Run(context.Background(), []string{"logs", "--follow=false"})
	if err == nil || !strings.Contains(err.Error(), "app-manager logs not found") {
		t.Fatalf("Run() error = %v, want app-manager logs not found", err)
	}
	if out.String() != "" {
		t.Fatalf("output = %q, want empty", out.String())
	}
}

func TestServersLogs_InvalidTail(t *testing.T) {
	t.Parallel()

	tests := map[string][]string{
		"negative":  {"logs", "--tail", "-1"},
		"too large": {"logs", "--tail", "10001"},
	}

	for name, args := range tests {
		t.Run(name, func(t *testing.T) {
			t.Parallel()

			var out bytes.Buffer
			command := &ServersCommand{
				cfg: &config.Config{LogDir: t.TempDir()},
				out: ui.NewOutput(&out, io.Discard, false),
			}

			err := command.Run(context.Background(), args)
			if !errors.Is(err, ErrInvalidFlagValue) {
				t.Fatalf("Run() error = %v, want %v", err, ErrInvalidFlagValue)
			}
		})
	}
}

func TestServersLogs_ReadsLatestLogWithoutStatus(t *testing.T) {
	t.Parallel()

	logDir := t.TempDir()
	appManagerLogDir := filepath.Join(logDir, "app-manager")
	oldPath := writeServerLog(t, appManagerLogDir, "2026-04-18-1.log", "old\n")
	newPath := writeServerLog(t, appManagerLogDir, "2026-04-19-2.log", "new\n")
	setServerLogModTime(t, oldPath, time.Date(2026, 4, 18, 1, 0, 0, 0, time.UTC))
	setServerLogModTime(t, newPath, time.Date(2026, 4, 19, 1, 0, 0, 0, time.UTC))

	var out bytes.Buffer
	command := &ServersCommand{
		cfg: &config.Config{LogDir: logDir},
		out: ui.NewOutput(&out, io.Discard, false),
	}

	if err := command.Run(context.Background(), []string{"logs", "--follow=false", "--tail", "1"}); err != nil {
		t.Fatalf("Run() error = %v", err)
	}
	if strings.TrimSpace(out.String()) != "new" {
		t.Fatalf("output = %q, want latest log line", out.String())
	}
}

type fakeServersClient struct {
	status    *appmanager.Status
	statusErr error
	healthErr error
}

func (f fakeServersClient) Health(context.Context) error {
	return f.healthErr
}

func (f fakeServersClient) Status(context.Context) (*appmanager.Status, error) {
	return f.status, f.statusErr
}

func writeServerLog(t *testing.T, dir, name, content string) string {
	t.Helper()

	path := filepath.Join(dir, name)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		t.Fatalf("create server log dir %q: %v", dir, err)
	}
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatalf("write server log %q: %v", path, err)
	}
	return path
}

func setServerLogModTime(t *testing.T, path string, modTime time.Time) {
	t.Helper()

	if err := os.Chtimes(path, modTime, modTime); err != nil {
		t.Fatalf("set server log modtime %q: %v", path, err)
	}
}
