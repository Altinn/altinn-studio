//nolint:testpackage // These tests exercise unexported doctor probe wiring without shelling out.
package doctor

import (
	"context"
	"errors"
	"testing"

	"altinn.studio/devenv/pkg/container"
	containermock "altinn.studio/devenv/pkg/container/mock"
	"altinn.studio/devenv/pkg/container/types"
)

const dockerTool = "docker"

var (
	errMissingTool      = errors.New("missing tool")
	errUnexpectedTool   = errors.New("unexpected tool")
	errNoRuntimeRunning = errors.New("no runtime running")
)

func TestProbeContainerRuntime(t *testing.T) {
	svc := &Service{
		debugf: func(string, ...any) {},
		lookPath: func(string) (string, error) {
			return "/bin/tool", nil
		},
		commandOutput: func(_ context.Context, name string, _ ...string) ([]byte, error) {
			switch name {
			case dockerTool:
				return []byte("Docker version 25.0.1, build deadbeef"), nil
			case "podman":
				return []byte("podman version 5.4.0"), nil
			case "colima":
				return []byte("colima version 0.8.1"), nil
			default:
				return nil, errUnexpectedTool
			}
		},
		containerDetect: func(context.Context) (container.ContainerClient, error) {
			return &dockerEngineClient{Client: containermock.New()}, nil
		},
	}

	value, resolved, tools, err := svc.probeContainerRuntime(t.Context())
	if err != nil {
		t.Fatalf("probeContainerRuntime() error = %v", err)
	}

	if value != "Docker (25.0.1)" {
		t.Fatalf("probeContainerRuntime() value = %q, want %q", value, "Docker (25.0.1)")
	}
	if resolved != "Docker Engine API -> Docker" {
		t.Fatalf("probeContainerRuntime() resolved = %q, want %q", resolved, "Docker Engine API -> Docker")
	}

	want := []ContainerTool{
		{Name: "colima", Version: "0.8.1"},
		{Name: dockerTool, Version: "25.0.1"},
		{Name: "podman", Version: "5.4.0"},
	}
	if len(tools) != len(want) {
		t.Fatalf("probeContainerRuntime() tools len = %d, want %d", len(tools), len(want))
	}
	for i := range want {
		if tools[i] != want[i] {
			t.Fatalf("probeContainerRuntime() tools[%d] = %#v, want %#v", i, tools[i], want[i])
		}
	}
}

func TestCollectPrerequisitesIncludesDockerHost(t *testing.T) {
	svc := &Service{
		debugf: func(string, ...any) {},
		lookPath: func(name string) (string, error) {
			if name == dockerTool {
				return "/bin/docker", nil
			}
			return "", errMissingTool
		},
		commandOutput: func(_ context.Context, name string, _ ...string) ([]byte, error) {
			switch name {
			case "dotnet":
				return []byte("10.0.103"), nil
			case dockerTool:
				return []byte("Docker version 25.0.1, build deadbeef"), nil
			default:
				return nil, errUnexpectedTool
			}
		},
		containerDetect: func(context.Context) (container.ContainerClient, error) {
			return &dockerEngineClient{Client: containermock.New()}, nil
		},
	}

	t.Setenv("DOCKER_HOST", "unix:///tmp/podman.sock")

	prereqs := svc.collectPrerequisites(t.Context())
	if prereqs.ContainerHost != "unix:///tmp/podman.sock" {
		t.Fatalf("collectPrerequisites() ContainerHost = %q", prereqs.ContainerHost)
	}
	if prereqs.ContainerResolved != "Docker Engine API -> Docker" {
		t.Fatalf("collectPrerequisites() ContainerResolved = %q", prereqs.ContainerResolved)
	}
}

func TestProbeContainerRuntimeReturnsDetectedToolsOnFailure(t *testing.T) {
	svc := &Service{
		debugf: func(string, ...any) {},
		lookPath: func(name string) (string, error) {
			if name == dockerTool {
				return "/bin/docker", nil
			}
			return "", errMissingTool
		},
		commandOutput: func(_ context.Context, name string, _ ...string) ([]byte, error) {
			if name == dockerTool {
				return []byte("Docker version 25.0.1, build deadbeef"), nil
			}
			return nil, errUnexpectedTool
		},
		containerDetect: func(context.Context) (container.ContainerClient, error) {
			return nil, errNoRuntimeRunning
		},
	}

	value, resolved, tools, err := svc.probeContainerRuntime(t.Context())
	if err == nil {
		t.Fatal("probeContainerRuntime() error = nil, want non-nil")
	}
	if value != "" || resolved != "" {
		t.Fatalf("probeContainerRuntime() returned value=%q resolved=%q on error", value, resolved)
	}
	if len(tools) != 1 || tools[0].Name != dockerTool {
		t.Fatalf("probeContainerRuntime() tools = %#v, want detected docker tool", tools)
	}
}

type dockerEngineClient struct {
	*containermock.Client
}

func (*dockerEngineClient) Name() string {
	return "Docker Engine API"
}

func (*dockerEngineClient) Installation() types.RuntimeInstallation {
	return types.InstallationDocker
}
