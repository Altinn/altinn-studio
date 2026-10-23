package localtest_test

import (
	"bytes"
	"context"
	"errors"
	"io"
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/container/mock"
	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/studioctl/internal/cmd/env/localtest"
	"altinn.studio/studioctl/internal/ui"
)

var errNoSuchContainer = errors.New("no such container")

func stoppedClient(stopped string) *mock.Client {
	client := mock.New()
	client.ContainerStateFunc = func(_ context.Context, name string) (types.ContainerState, error) {
		if name == stopped {
			return types.ContainerState{Status: "exited", Running: false}, nil
		}
		return types.ContainerState{Status: "running", Running: true}, nil
	}
	client.ContainerLogsFunc = func(_ context.Context, name string, _ bool, _ string) (io.ReadCloser, error) {
		return io.NopCloser(strings.NewReader("last words of " + name + "\n")), nil
	}
	return client
}

func TestANamedStoppedContainerStillShowsItsLog(t *testing.T) {
	t.Parallel()
	var out bytes.Buffer
	streamer := localtest.NewLogStreamer(
		stoppedClient("app-receipt"),
		ui.NewOutput(&out, io.Discard, false),
		[]string{"app-storage", "app-receipt"},
	)

	if err := streamer.Stream(context.Background(), "app-receipt", false, false); err != nil {
		t.Fatalf("Stream: %v", err)
	}
	if !strings.Contains(out.String(), "last words of app-receipt") {
		t.Errorf("output = %q, want the stopped container's log", out.String())
	}
}

func TestAllLogsLeaveOutStoppedContainers(t *testing.T) {
	t.Parallel()
	var out bytes.Buffer
	streamer := localtest.NewLogStreamer(
		stoppedClient("app-receipt"),
		ui.NewOutput(&out, io.Discard, false),
		[]string{"app-storage", "app-receipt"},
	)

	if err := streamer.Stream(context.Background(), "", false, false); err != nil {
		t.Fatalf("Stream: %v", err)
	}
	if strings.Contains(out.String(), "app-receipt") || !strings.Contains(out.String(), "last words of app-storage") {
		t.Errorf("output = %q, want only the running container", out.String())
	}
}

func TestANamedMissingContainerIsNotRunning(t *testing.T) {
	t.Parallel()
	client := mock.New()
	client.ContainerStateFunc = func(context.Context, string) (types.ContainerState, error) {
		return types.ContainerState{}, errNoSuchContainer
	}
	streamer := localtest.NewLogStreamer(client, ui.NewOutput(io.Discard, io.Discard, false), []string{"app-receipt"})

	err := streamer.Stream(context.Background(), "app-receipt", false, false)
	if !errors.Is(err, localtest.ErrNotRunning) {
		t.Errorf("Stream = %v, want ErrNotRunning", err)
	}
}
