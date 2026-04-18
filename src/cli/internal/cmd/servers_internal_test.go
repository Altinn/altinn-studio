package cmd

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"strings"
	"testing"

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
