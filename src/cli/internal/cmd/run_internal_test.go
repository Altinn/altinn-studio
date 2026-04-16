package cmd

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
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

func TestWaitForLocaltestApp_ContextCancelledReturnsRunStopped(t *testing.T) {
	t.Parallel()

	ctx, cancel := context.WithCancel(t.Context())
	cancel()

	monitorCalled := false
	err := waitForLocaltestApp(
		ctx,
		"ttd/test-app",
		"http://local.altinn.cloud:8000/ttd/test-app/api/v1/applicationmetadata",
		func(context.Context) error {
			monitorCalled = true
			return nil
		},
	)
	if !errors.Is(err, errAppRunStopped) {
		t.Fatalf("waitForLocaltestApp() error = %v, want errAppRunStopped", err)
	}
	if monitorCalled {
		t.Fatal("waitForLocaltestApp() called monitor after context cancellation")
	}
}

func TestProbeLocaltestApp_Ready(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		if _, err := w.Write([]byte(`{"id":"ttd/test-app"}`)); err != nil {
			t.Errorf("Write() error = %v", err)
		}
	}))
	defer server.Close()

	status, ready := probeLocaltestApp(t.Context(), server.Client(), "ttd/test-app", server.URL)
	if !ready {
		t.Fatalf("probeLocaltestApp() ready = false, status = %q", status)
	}
}

func TestProbeLocaltestApp_WrongAppID(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		if _, err := w.Write([]byte(`{"id":"ttd/other-app"}`)); err != nil {
			t.Errorf("Write() error = %v", err)
		}
	}))
	defer server.Close()

	status, ready := probeLocaltestApp(t.Context(), server.Client(), "ttd/test-app", server.URL)
	if ready {
		t.Fatal("probeLocaltestApp() ready = true, want false")
	}
	if !strings.Contains(status, "ttd/other-app") {
		t.Fatalf("probeLocaltestApp() status = %q, want wrong app id", status)
	}
}
