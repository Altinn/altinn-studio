package container_e2e

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"os"
	"os/exec"
	"slices"
	"strconv"
	"strings"
	"testing"
	"time"

	"altinn.studio/devenv/pkg/container"
)

const testImage = "alpine:latest@sha256:865b95f46d98cf867a156fe4a135ad3fe50d2056aa3f25ed31662dff6da4eb62"

func detectClient(t *testing.T) container.ContainerClient {
	t.Helper()
	cli, err := container.Detect(t.Context())
	if err != nil {
		t.Fatalf(
			"no container runtime available: %v\n\nThis test suite requires either Docker or Podman to be installed and running.",
			err,
		)
	}
	t.Cleanup(func() {
		if err := cli.Close(); err != nil {
			t.Fatalf("Close() error = %v", err)
		}
	})
	return cli
}

func pullImage(ctx context.Context, t *testing.T, cli container.ContainerClient) {
	t.Helper()
	if err := cli.ImagePull(ctx, testImage); err != nil {
		t.Fatalf("ImagePull(%q) failed: %v", testImage, err)
	}
}

func uniqueName(prefix string) string {
	return fmt.Sprintf("devenv-e2e-%s-%d", prefix, time.Now().UnixNano())
}

func cleanupContainer(t *testing.T, cli container.ContainerClient, name string) {
	t.Helper()
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.WithoutCancel(t.Context()), 30*time.Second)
		defer cancel()

		err := cli.ContainerRemove(ctx, name, true)
		if err != nil && !errors.Is(err, container.ErrContainerNotFound) {
			t.Fatalf("ContainerRemove(%q) failed: %v", name, err)
		}
	})
}

func cleanupNetwork(t *testing.T, cli container.ContainerClient, name string) {
	t.Helper()
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.WithoutCancel(t.Context()), 30*time.Second)
		defer cancel()

		err := cli.NetworkRemove(ctx, name)
		if err != nil && !errors.Is(err, container.ErrNetworkNotFound) {
			t.Fatalf("NetworkRemove(%q) failed: %v", name, err)
		}
	})
}

func TestDetect(t *testing.T) {
	cli := detectClient(t)

	toolchain := cli.Toolchain()
	if _, err := fmt.Fprintf(
		os.Stdout,
		"container toolchain: platform=%s access=%s source=%s socket=%s\n",
		toolchain.Platform,
		toolchain.AccessMode,
		toolchain.Source,
		toolchain.SocketPath,
	); err != nil {
		t.Fatalf("write toolchain details: %v", err)
	}

	if toolchain.AccessMode != container.AccessDockerEngineAPI && toolchain.AccessMode != container.AccessPodmanCLI {
		t.Errorf("unexpected access mode: %q", toolchain.AccessMode)
	}
	if toolchain.Platform != container.PlatformDocker &&
		toolchain.Platform != container.PlatformPodman &&
		toolchain.Platform != container.PlatformColima {
		t.Errorf("unexpected platform: %q", toolchain.Platform)
	}

	assertToolchainOverride(t, toolchain)
}

func assertToolchainOverride(t *testing.T, toolchain container.ContainerToolchain) {
	t.Helper()
	override := strings.ToLower(strings.TrimSpace(os.Getenv(container.EnvContainerToolchain)))
	if override == "" || override == "auto" {
		return
	}

	want, ok := expectedToolchains()[override]
	if !ok {
		t.Fatalf("unexpected %s=%q", container.EnvContainerToolchain, override)
	}
	if toolchain.Platform != want.platform || !want.acceptsAccessMode(toolchain.AccessMode) {
		t.Fatalf("toolchain = %#v, want %s", toolchain, want.description)
	}
}

type expectedToolchain struct {
	description string
	platform    container.ContainerPlatform
	accessMode  container.ContainerAccessMode
	altAccess   container.ContainerAccessMode
}

func (e expectedToolchain) acceptsAccessMode(accessMode container.ContainerAccessMode) bool {
	return accessMode == e.accessMode || accessMode == e.altAccess
}

func expectedToolchains() map[string]expectedToolchain {
	return map[string]expectedToolchain{
		"docker": {
			description: "Docker via Docker Engine API",
			platform:    container.PlatformDocker,
			accessMode:  container.AccessDockerEngineAPI,
		},
		"colima": {
			description: "Colima via Docker Engine API",
			platform:    container.PlatformColima,
			accessMode:  container.AccessDockerEngineAPI,
		},
		"podman": {
			description: "Podman via Docker Engine API or Podman CLI",
			platform:    container.PlatformPodman,
			accessMode:  container.AccessDockerEngineAPI,
			altAccess:   container.AccessPodmanCLI,
		},
		"podman-cli": {
			description: "Podman CLI",
			platform:    container.PlatformPodman,
			accessMode:  container.AccessPodmanCLI,
		},
		"podman-docker-engine-api": {
			description: "Podman via Docker Engine API",
			platform:    container.PlatformPodman,
			accessMode:  container.AccessDockerEngineAPI,
		},
	}
}

func TestImagePullAndInspect(t *testing.T) {
	cli := detectClient(t)
	ctx := t.Context()

	pullImage(ctx, t, cli)

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

func TestContainerLifecycleAndExec(t *testing.T) {
	cli := detectClient(t)
	ctx := t.Context()
	pullImage(ctx, t, cli)

	containerName := uniqueName("lifecycle")
	cleanupContainer(t, cli, containerName)

	id, err := cli.CreateContainer(ctx, container.ContainerConfig{
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

	state, err := cli.ContainerState(ctx, containerName)
	if err != nil {
		t.Fatalf("ContainerState failed: %v", err)
	}
	if !state.Running {
		t.Fatalf("expected container to be running, got %#v", state)
	}

	if err := cli.Exec(ctx, containerName, []string{"echo", "test"}); err != nil {
		t.Fatalf("Exec failed: %v", err)
	}
}

func TestContainerState_NotExists(t *testing.T) {
	cli := detectClient(t)

	_, err := cli.ContainerState(t.Context(), "devenv-e2e-nonexistent-container")
	if !errors.Is(err, container.ErrContainerNotFound) {
		t.Errorf("expected ErrContainerNotFound, got: %v", err)
	}
}

func TestPodmanCLIInspectExistingVolumeNameAsMissingContainer(t *testing.T) {
	cli := detectClient(t)
	if cli.Toolchain().AccessMode != container.AccessPodmanCLI {
		t.Skip("generic Podman inspect ambiguity only applies to the Podman CLI implementation")
	}

	ctx := t.Context()
	volumeName := uniqueName("volume-collision")
	createPodmanVolume(ctx, t, volumeName)
	cleanupPodmanVolume(t, volumeName)

	_, stateErr := cli.ContainerState(ctx, volumeName)
	if !errors.Is(stateErr, container.ErrContainerNotFound) {
		t.Fatalf("ContainerState(%q) error = %v, want ErrContainerNotFound", volumeName, stateErr)
	}

	_, networksErr := cli.ContainerNetworks(ctx, volumeName)
	if !errors.Is(networksErr, container.ErrContainerNotFound) {
		t.Fatalf("ContainerNetworks(%q) error = %v, want ErrContainerNotFound", volumeName, networksErr)
	}

	_, inspectErr := cli.ContainerInspect(ctx, volumeName)
	if !errors.Is(inspectErr, container.ErrContainerNotFound) {
		t.Fatalf("ContainerInspect(%q) error = %v, want ErrContainerNotFound", volumeName, inspectErr)
	}
}

func TestContainerNetworks(t *testing.T) {
	cli := detectClient(t)
	ctx := t.Context()
	pullImage(ctx, t, cli)

	networkName := uniqueName("net")
	if _, err := cli.NetworkCreate(ctx, container.NetworkConfig{
		Name:   networkName,
		Labels: map[string]string{"altinn.studio/e2e": "container"},
	}); err != nil {
		t.Fatalf("NetworkCreate failed: %v", err)
	}
	cleanupNetwork(t, cli, networkName)

	networkInfo, err := cli.NetworkInspect(ctx, networkName)
	if err != nil {
		t.Fatalf("NetworkInspect failed: %v", err)
	}
	if networkInfo.Name != networkName {
		t.Fatalf("NetworkInspect name = %q, want %q", networkInfo.Name, networkName)
	}

	containerName := uniqueName("network")
	cleanupContainer(t, cli, containerName)

	_, err = cli.CreateContainer(ctx, container.ContainerConfig{
		Name:     containerName,
		Image:    testImage,
		Detach:   true,
		Command:  []string{"sleep", "30"},
		Networks: []string{networkName},
	})
	if err != nil {
		t.Fatalf("CreateContainer failed: %v", err)
	}

	networks, err := cli.ContainerNetworks(ctx, containerName)
	if err != nil {
		t.Fatalf("ContainerNetworks failed: %v", err)
	}
	if !contains(networks, networkName) {
		t.Fatalf("ContainerNetworks = %v, want %q", networks, networkName)
	}
}

func TestExecWithIO(t *testing.T) {
	cli := detectClient(t)
	ctx := t.Context()
	pullImage(ctx, t, cli)

	containerName := uniqueName("io")
	cleanupContainer(t, cli, containerName)

	if _, err := cli.CreateContainer(ctx, container.ContainerConfig{
		Name:    containerName,
		Image:   testImage,
		Detach:  true,
		Command: []string{"sleep", "30"},
	}); err != nil {
		t.Fatalf("CreateContainer failed: %v", err)
	}

	var stdout strings.Builder
	if err := cli.ExecWithIO(ctx, containerName, []string{"echo", "hello"}, nil, &stdout, nil); err != nil {
		t.Fatalf("ExecWithIO failed: %v", err)
	}
	if !strings.Contains(stdout.String(), "hello") {
		t.Errorf("expected output to contain 'hello', got %q", stdout.String())
	}
}

func TestExecWithIO_Stdin(t *testing.T) {
	cli := detectClient(t)
	ctx := t.Context()
	pullImage(ctx, t, cli)

	containerName := uniqueName("stdin")
	cleanupContainer(t, cli, containerName)

	if _, err := cli.CreateContainer(ctx, container.ContainerConfig{
		Name:    containerName,
		Image:   testImage,
		Detach:  true,
		Command: []string{"sleep", "30"},
	}); err != nil {
		t.Fatalf("CreateContainer failed: %v", err)
	}

	var stdout strings.Builder
	err := cli.ExecWithIO(ctx, containerName, []string{"cat"}, strings.NewReader("hello from stdin"), &stdout, nil)
	if err != nil {
		t.Fatalf("ExecWithIO with stdin failed: %v", err)
	}
	if got := stdout.String(); !strings.Contains(got, "hello from stdin") {
		t.Fatalf("expected stdin to be forwarded, got %q", got)
	}
}

func TestCreateContainer_WithOptions(t *testing.T) {
	cli := detectClient(t)
	ctx := t.Context()
	pullImage(ctx, t, cli)

	hostPort := freeTCPPort(t)
	containerName := uniqueName("opts")
	cleanupContainer(t, cli, containerName)

	id, err := cli.CreateContainer(ctx, container.ContainerConfig{
		Name:    containerName,
		Image:   testImage,
		Detach:  true,
		Command: []string{"sleep", "30"},
		Env:     []string{"FOO=bar", "BAZ=qux"},
		Labels:  map[string]string{"altinn.studio/e2e": "container"},
		Ports: []container.PortMapping{
			{HostIP: "127.0.0.1", HostPort: hostPort, ContainerPort: "80"},
		},
	})
	if err != nil {
		t.Fatalf("CreateContainer with options failed: %v", err)
	}
	if id == "" {
		t.Fatal("expected non-empty container ID")
	}

	info, err := cli.ContainerInspect(ctx, containerName)
	if err != nil {
		t.Fatalf("ContainerInspect failed: %v", err)
	}
	if got := info.Labels["altinn.studio/e2e"]; got != "container" {
		t.Fatalf("label altinn.studio/e2e = %q, want container", got)
	}
	if !hasPublishedPort(info.Ports, hostPort, "80") {
		t.Fatalf("published ports = %#v, want host port %s mapped to container port 80", info.Ports, hostPort)
	}
}

func TestContainerWaitAndLogs(t *testing.T) {
	cli := detectClient(t)
	ctx := t.Context()
	pullImage(ctx, t, cli)

	containerName := uniqueName("wait")
	cleanupContainer(t, cli, containerName)

	if _, err := cli.CreateContainer(ctx, container.ContainerConfig{
		Name:    containerName,
		Image:   testImage,
		Detach:  true,
		Command: []string{"sh", "-c", "echo devenv-e2e-log-message; exit 7"},
	}); err != nil {
		t.Fatalf("CreateContainer failed: %v", err)
	}

	exitCode, err := cli.ContainerWait(ctx, containerName)
	if err != nil {
		t.Fatalf("ContainerWait failed: %v", err)
	}
	if exitCode != 7 {
		t.Fatalf("ContainerWait exit code = %d, want 7", exitCode)
	}

	logs, err := cli.ContainerLogs(ctx, containerName, false, "all")
	if err != nil {
		t.Fatalf("ContainerLogs failed: %v", err)
	}
	defer func() {
		if closeErr := logs.Close(); closeErr != nil {
			t.Fatalf("ContainerLogs close failed: %v", closeErr)
		}
	}()

	output, err := io.ReadAll(logs)
	if err != nil {
		t.Fatalf("read logs failed: %v", err)
	}
	if !strings.Contains(string(output), "devenv-e2e-log-message") {
		t.Fatalf("logs = %q, want log message", string(output))
	}
}

func createPodmanVolume(ctx context.Context, t *testing.T, name string) {
	t.Helper()

	cmd := exec.CommandContext(ctx, "podman", "volume", "create", name)
	output, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("podman volume create %q failed: %v\n%s", name, err, output)
	}
}

func cleanupPodmanVolume(t *testing.T, name string) {
	t.Helper()
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.WithoutCancel(t.Context()), 30*time.Second)
		defer cancel()

		cmd := exec.CommandContext(ctx, "podman", "volume", "rm", "-f", name)
		output, err := cmd.CombinedOutput()
		if err != nil {
			t.Fatalf("podman volume rm %q failed: %v\n%s", name, err, output)
		}
	})
}

func freeTCPPort(t *testing.T) string {
	t.Helper()
	listener, err := new(net.ListenConfig).Listen(t.Context(), "tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen on free TCP port: %v", err)
	}
	defer func() {
		if err := listener.Close(); err != nil {
			t.Fatalf("close free TCP port listener: %v", err)
		}
	}()
	addr, ok := listener.Addr().(*net.TCPAddr)
	if !ok {
		t.Fatalf("listener address has type %T, want *net.TCPAddr", listener.Addr())
	}
	return strconv.Itoa(addr.Port)
}

func contains(values []string, wanted string) bool {
	return slices.Contains(values, wanted)
}

func hasPublishedPort(ports []container.PublishedPort, hostPort, containerPort string) bool {
	for _, port := range ports {
		if port.HostPort == hostPort && port.ContainerPort == containerPort {
			return true
		}
	}
	return false
}
