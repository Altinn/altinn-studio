package container

import (
	"context"
	"errors"
	"os/exec"
	"strings"
	"testing"
	"time"

	containermock "altinn.studio/devenv/pkg/container/mock"
)

const testImage = "alpine:latest@sha256:865b95f46d98cf867a156fe4a135ad3fe50d2056aa3f25ed31662dff6da4eb62"

func detectClient(t *testing.T) ContainerClient {
	t.Helper()
	cli, err := Detect(t.Context())
	if err != nil {
		t.Fatalf("no container runtime available: %v\n\nThis test suite requires either Docker or Podman to be installed and running.", err)
	}
	return cli
}

func cliName() string {
	// Check which CLI is available - can't rely on runtime name since
	// Docker Engine API may be connected to Podman's compatible socket
	if _, err := exec.LookPath("docker"); err == nil {
		return "docker"
	}
	if _, err := exec.LookPath("podman"); err == nil {
		return "podman"
	}
	return "docker"
}

func removeContainer(ctx context.Context, name string) {
	_ = exec.CommandContext(ctx, cliName(), "rm", "-f", name).Run()
}

func pullImage(ctx context.Context, t *testing.T) {
	t.Helper()
	cmd := exec.CommandContext(ctx, cliName(), "pull", testImage)
	if output, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("failed to pull test image: %v\n%s", err, output)
	}
}

func TestDetect(t *testing.T) {
	cli := detectClient(t)
	defer func() { _ = cli.Close() }()

	name := cli.Name()
	if name != RuntimeNameDockerEngineAPI && name != RuntimeNamePodmanCLI {
		t.Errorf("unexpected runtime name: %q", name)
	}

	t.Logf("using container runtime: %s", name)
}

func TestDetect_RetriesAfterTransientFailure(t *testing.T) {
	detectMu.Lock()
	origDetectRuntimeFn := detectRuntimeFn
	origNewClientForTypeFn := newClientForTypeFn
	origDetectionSucceeded := detectionSucceeded
	origDetectedType := detectedType
	origDetectedSocketPath := detectedSocketPath
	detectMu.Unlock()

	t.Cleanup(func() {
		detectMu.Lock()
		detectRuntimeFn = origDetectRuntimeFn
		newClientForTypeFn = origNewClientForTypeFn
		detectionSucceeded = origDetectionSucceeded
		detectedType = origDetectedType
		detectedSocketPath = origDetectedSocketPath
		detectMu.Unlock()
	})

	detectMu.Lock()
	detectionSucceeded = false
	detectedType = runtimeUnknown
	detectedSocketPath = ""
	detectMu.Unlock()

	calls := 0
	detectRuntimeFn = func(context.Context) (runtimeType, string, error) {
		calls++
		if calls == 1 {
			return runtimeUnknown, "", errors.New("transient failure")
		}
		return runtimePodmanCLI, "", nil
	}
	newClientForTypeFn = func(context.Context, runtimeType) (ContainerClient, error) {
		return containermock.New(), nil
	}

	if _, err := Detect(t.Context()); err == nil {
		t.Fatal("Detect() expected transient error, got nil")
	}

	if _, err := Detect(t.Context()); err != nil {
		t.Fatalf("Detect() on retry error = %v", err)
	}

	if calls != 2 {
		t.Fatalf("detectRuntime calls = %d, want 2", calls)
	}
}

func TestContainerLifecycle(t *testing.T) {
	cli := detectClient(t)
	defer func() { _ = cli.Close() }()

	ctx := t.Context()
	pullImage(ctx, t)

	containerName := "devenv-test-" + time.Now().Format("20060102150405")
	defer removeContainer(ctx, containerName)

	// Create container
	id, err := cli.CreateContainer(ctx, ContainerConfig{
		Name:    containerName,
		Image:   testImage,
		Detach:  true,
		Command: []string{"sleep", "30"},
	})
	if err != nil {
		t.Fatalf("CreateContainer failed: %v", err)
	}
	if id == "" {
		t.Fatal("expected non-empty container ID")
	}

	// Check state
	state, err := cli.ContainerState(ctx, containerName)
	if err != nil {
		t.Fatalf("ContainerState failed: %v", err)
	}
	if !state.Running {
		t.Error("expected container to be running")
	}

	// Exec
	err = cli.Exec(ctx, containerName, []string{"echo", "test"})
	if err != nil {
		t.Fatalf("Exec failed: %v", err)
	}
}

func TestContainerState_NotExists(t *testing.T) {
	cli := detectClient(t)
	defer func() { _ = cli.Close() }()

	_, err := cli.ContainerState(t.Context(), "nonexistent-container-xyz123")
	if !errors.Is(err, ErrContainerNotFound) {
		t.Errorf("expected ErrContainerNotFound, got: %v", err)
	}
}

func TestContainerNetworks(t *testing.T) {
	cli := detectClient(t)
	defer func() { _ = cli.Close() }()

	ctx := t.Context()
	pullImage(ctx, t)

	containerName := "devenv-test-net-" + time.Now().Format("20060102150405")
	defer removeContainer(ctx, containerName)

	_, err := cli.CreateContainer(ctx, ContainerConfig{
		Name:     containerName,
		Image:    testImage,
		Detach:   true,
		Command:  []string{"sleep", "30"},
		Networks: []string{"bridge"},
	})
	if err != nil {
		t.Fatalf("CreateContainer failed: %v", err)
	}

	networks, err := cli.ContainerNetworks(ctx, containerName)
	if err != nil {
		t.Fatalf("ContainerNetworks failed: %v", err)
	}
	// Podman may report networks differently than Docker, but we expect at least one attachment.
	if len(networks) == 0 {
		t.Fatal("expected at least one network, got none")
	}
}

func TestImageInspect(t *testing.T) {
	cli := detectClient(t)
	defer func() { _ = cli.Close() }()

	ctx := t.Context()
	pullImage(ctx, t)

	info, err := cli.ImageInspect(ctx, testImage)
	if err != nil {
		t.Fatalf("ImageInspect failed: %v", err)
	}
	if info.ID == "" {
		t.Error("expected non-empty image ID")
	}
	if info.Size <= 0 {
		t.Error("expected positive image size")
	}
}

func TestExecWithIO(t *testing.T) {
	cli := detectClient(t)
	defer func() { _ = cli.Close() }()

	ctx := t.Context()
	pullImage(ctx, t)

	containerName := "devenv-test-io-" + time.Now().Format("20060102150405")
	defer removeContainer(ctx, containerName)

	_, err := cli.CreateContainer(ctx, ContainerConfig{
		Name:    containerName,
		Image:   testImage,
		Detach:  true,
		Command: []string{"sleep", "30"},
	})
	if err != nil {
		t.Fatalf("CreateContainer failed: %v", err)
	}

	var stdout strings.Builder
	err = cli.ExecWithIO(ctx, containerName, []string{"echo", "hello"}, nil, &stdout, nil)
	if err != nil {
		t.Fatalf("ExecWithIO failed: %v", err)
	}
	if !strings.Contains(stdout.String(), "hello") {
		t.Errorf("expected output to contain 'hello', got %q", stdout.String())
	}
}

func TestCreateContainer_WithOptions(t *testing.T) {
	cli := detectClient(t)
	defer func() { _ = cli.Close() }()

	ctx := t.Context()
	pullImage(ctx, t)

	containerName := "devenv-test-opts-" + time.Now().Format("20060102150405")
	defer removeContainer(ctx, containerName)

	id, err := cli.CreateContainer(ctx, ContainerConfig{
		Name:    containerName,
		Image:   testImage,
		Detach:  true,
		Command: []string{"sleep", "30"},
		Env:     []string{"FOO=bar", "BAZ=qux"},
		Labels:  map[string]string{"test": "value"},
		Ports: []PortMapping{
			{HostPort: "18080", ContainerPort: "80"},
		},
	})
	if err != nil {
		t.Fatalf("CreateContainer with options failed: %v", err)
	}
	if id == "" {
		t.Fatal("expected non-empty container ID")
	}
}
