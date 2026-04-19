package cmd

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"
	"testing"

	containermock "altinn.studio/devenv/pkg/container/mock"
	"altinn.studio/studioctl/internal/ui"
)

var errRemoveFailed = errors.New("remove failed")

func TestFollowContainer_ContextCancelledReturnsRunStopped(t *testing.T) {
	ctx, cancel := context.WithCancel(t.Context())
	cancel()

	client := containermock.New()
	client.ContainerLogsFunc = func(context.Context, string, bool, string) (io.ReadCloser, error) {
		return io.NopCloser(strings.NewReader("")), nil
	}
	client.ContainerWaitFunc = func(context.Context, string) (int, error) {
		return 0, fmt.Errorf("context cancelled while waiting for container: %w", ctx.Err())
	}

	cmd := &RunCommand{out: ui.NewOutput(io.Discard, io.Discard, false)}
	err := cmd.followContainer(ctx, client, "app-container")
	if !errors.Is(err, errAppRunStopped) {
		t.Fatalf("followContainer() error = %v, want errAppRunStopped", err)
	}
}

func TestRemoveForegroundContainer_ReturnsRemoveError(t *testing.T) {
	client := containermock.New()
	client.ContainerRemoveFunc = func(context.Context, string, bool) error {
		return errRemoveFailed
	}

	cmd := &RunCommand{out: ui.NewOutput(io.Discard, io.Discard, false)}
	err := cmd.removeForegroundContainer(t.Context(), client, "app-container")
	if err == nil {
		t.Fatal("removeForegroundContainer() error = nil, want error")
	}
	if !strings.Contains(err.Error(), "remove app container") {
		t.Fatalf("removeForegroundContainer() error = %v, want remove context", err)
	}
}

func TestStartupOperationError_ContextCancelledReturnsRunStopped(t *testing.T) {
	t.Parallel()

	ctx, cancel := context.WithCancel(t.Context())
	cancel()

	err := startupOperationError(ctx, "start app-manager", context.Canceled)
	if !errors.Is(err, errAppRunStopped) {
		t.Fatalf("startupOperationError() error = %v, want errAppRunStopped", err)
	}
}

func TestStartupMonitorError_ContextCancelledReturnsRunStopped(t *testing.T) {
	t.Parallel()

	ctx, cancel := context.WithCancel(t.Context())
	cancel()

	err := startupMonitorError(ctx, t.Context(), context.Canceled, errAppStartupTimedOut)
	if !errors.Is(err, errAppRunStopped) {
		t.Fatalf("startupMonitorError() error = %v, want errAppRunStopped", err)
	}
}

func TestRunJSONRequiresDetach(t *testing.T) {
	t.Parallel()

	cmd := &RunCommand{out: ui.NewOutput(io.Discard, io.Discard, false)}
	err := cmd.RunWithCommandPath(t.Context(), []string{"--json"}, "run")
	if err == nil {
		t.Fatal("RunWithCommandPath() error = nil, want error")
	}
	if !strings.Contains(err.Error(), "--json requires --detach") {
		t.Fatalf("RunWithCommandPath() error = %v, want detach/json error", err)
	}
}

func TestAppRunJSONRequiresDetach(t *testing.T) {
	t.Parallel()

	cmd := &RunCommand{out: ui.NewOutput(io.Discard, io.Discard, false)}
	err := cmd.RunWithCommandPath(t.Context(), []string{"--json"}, "app run")
	if err == nil {
		t.Fatal("RunWithCommandPath() error = nil, want error")
	}
	if !strings.Contains(err.Error(), "--json requires --detach") {
		t.Fatalf("RunWithCommandPath() error = %v, want detach/json error", err)
	}
}

func TestRunDetachedOutputPrintJSON(t *testing.T) {
	t.Parallel()

	var out bytes.Buffer
	result := runDetachedOutput{
		AppID:      "ttd/app",
		Mode:       runModeNative,
		URL:        "http://localtest.localhost/app",
		LogPath:    "/tmp/app.log",
		ProcessID:  123,
		JSONOutput: true,
	}
	if err := result.Print(ui.NewOutput(&out, io.Discard, false)); err != nil {
		t.Fatalf("Print() error = %v", err)
	}

	var got runDetachedOutput
	if err := json.Unmarshal([]byte(strings.TrimSpace(out.String())), &got); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if got.AppID != result.AppID || got.Mode != result.Mode || got.URL != result.URL ||
		got.LogPath != result.LogPath || got.ProcessID != result.ProcessID {
		t.Fatalf("output = %+v, want %+v", got, result)
	}
}
