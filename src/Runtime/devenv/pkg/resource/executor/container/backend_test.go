package containerbackend

import (
	"context"
	"errors"
	"strings"
	"testing"

	containerclient "altinn.studio/devenv/pkg/container"
	containermock "altinn.studio/devenv/pkg/container/mock"
	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/devenv/pkg/resource/executor"
)

const testGraphID = resource.GraphID("test")

type Container = resource.Container
type Network = resource.Network
type RemoteImage = resource.RemoteImage
type LocalImage = resource.LocalImage
type Resource = resource.Resource
type ImageResource = resource.ImageResource
type LifecycleOptions = resource.LifecycleOptions
type ContainerLifecycleOptions = resource.ContainerLifecycleOptions
type ErrorDecision = resource.ErrorDecision
type Status = executor.Status
type ObserverFunc = executor.ObserverFunc

var Ref = resource.Ref
var RefID = resource.RefID
var NewGraph = resource.NewGraph
var SkipResource = executor.SkipResource

const StatusReady = executor.StatusReady
const StatusPending = executor.StatusPending
const StatusFailed = executor.StatusFailed
const StatusUnknown = executor.StatusUnknown
const PullAlways = resource.PullAlways
const PullIfNotPresent = resource.PullIfNotPresent
const EventApplyProgress = executor.EventApplyProgress
const ErrorDecisionIgnore = resource.ErrorDecisionIgnore
const ErrorDecisionDefault = resource.ErrorDecisionDefault

type Event = executor.Event

var (
	errDaemonUnavailable = errors.New("daemon unavailable")
	errStopFailed        = errors.New("stop failed")
	errRemoveFailed      = errors.New("remove failed")
)

func mustAddResource(t *testing.T, graph *resource.Graph, r resource.Resource) {
	t.Helper()
	if err := graph.Add(r); err != nil {
		t.Fatalf("graph.Add(%s) error = %v", r.ID(), err)
	}
}

func newTestExecutor(client containerclient.ContainerClient) *executor.Executor {
	exec := executor.New()
	if err := exec.RegisterBackend(New(client)); err != nil {
		panic(err)
	}
	return exec
}

func TestNormalizedContainerLabels_DoesNotMutateInput(t *testing.T) {
	t.Parallel()

	container := &Container{
		Name:   "localtest",
		Image:  RefID("image:localtest"),
		Labels: map[string]string{"altinn.studio/cli": "localtest"},
	}

	labels := normalizedContainerLabels(container, testGraphID, "sha256:image", []string{"net-a"})

	if labels[containerSpecHashLabel] == "" {
		t.Fatalf("missing %q label", containerSpecHashLabel)
	}
	if labels[GraphIDLabel] != testGraphID.String() {
		t.Fatalf("graph label = %q, want %q", labels[GraphIDLabel], testGraphID)
	}

	if _, exists := container.Labels[containerSpecHashLabel]; exists {
		t.Fatalf("input labels were mutated with %q", containerSpecHashLabel)
	}
}

func TestContainerSpecHash_ChangesOnConfigChange(t *testing.T) {
	t.Parallel()

	base := &Container{
		Name:          "localtest",
		Image:         RefID("image:localtest"),
		Env:           []string{"A=1", "B=2"},
		Ports:         []types.PortMapping{{HostPort: "8000", ContainerPort: "5101"}},
		Volumes:       []types.VolumeMount{{HostPath: "/tmp/a", ContainerPath: "/a"}},
		Command:       []string{"dotnet", "LocalTest.dll"},
		ExtraHosts:    []string{"host.docker.internal:172.17.0.1"},
		RestartPolicy: "always",
		User:          "1000:1000",
	}

	baseHash := containerSpecHash(base, "sha256:image-v1", []string{"bridge"})

	modified := *base
	modified.Ports = []types.PortMapping{{HostPort: "8001", ContainerPort: "5101"}}
	modifiedHash := containerSpecHash(&modified, "sha256:image-v1", []string{"bridge"})

	if baseHash == modifiedHash {
		t.Fatalf("container spec hash did not change when ports changed")
	}
}

func TestContainerSpecHash_IgnoresSliceOrderForSetLikeFields(t *testing.T) {
	t.Parallel()

	left := &Container{
		Name:          "localtest",
		Image:         RefID("image:localtest"),
		Env:           []string{"B=2", "A=1"},
		ExtraHosts:    []string{"h2:2.2.2.2", "h1:1.1.1.1"},
		RestartPolicy: "always",
	}

	right := &Container{
		Name:          "localtest",
		Image:         RefID("image:localtest"),
		Env:           []string{"A=1", "B=2"},
		ExtraHosts:    []string{"h1:1.1.1.1", "h2:2.2.2.2"},
		RestartPolicy: "always",
	}

	leftHash := containerSpecHash(left, "sha256:image-v1", []string{"b", "a"})
	rightHash := containerSpecHash(right, "sha256:image-v1", []string{"a", "b"})

	if leftHash != rightHash {
		t.Fatalf("container spec hash changed for equivalent set-like fields")
	}
}

func TestContainerSpecHash_ChangesOnNetworkAliasChange(t *testing.T) {
	t.Parallel()

	base := &Container{
		Name:           "localtest",
		Image:          RefID("image:localtest"),
		NetworkAliases: []string{"local.altinn.cloud"},
	}

	baseHash := containerSpecHash(base, "sha256:image-v1", []string{"bridge"})

	modified := *base
	modified.NetworkAliases = []string{"local.altinn.cloud", "altinn.local"}
	modifiedHash := containerSpecHash(&modified, "sha256:image-v1", []string{"bridge"})

	if baseHash == modifiedHash {
		t.Fatalf("container spec hash did not change when network aliases changed")
	}
}

func TestContainerSpecHash_ChangesOnUsernsModeChange(t *testing.T) {
	t.Parallel()

	base := &Container{
		Name:       "localtest",
		Image:      RefID("image:localtest"),
		User:       "1000:1000",
		UsernsMode: "",
	}

	baseHash := containerSpecHash(base, "sha256:image-v1", []string{"bridge"})

	modified := *base
	modified.UsernsMode = "keep-id"
	modifiedHash := containerSpecHash(&modified, "sha256:image-v1", []string{"bridge"})

	if baseHash == modifiedHash {
		t.Fatalf("container spec hash did not change when user namespace mode changed")
	}
}

func TestContainerSpecHash_ChangesOnVolumeMountTypeChange(t *testing.T) {
	t.Parallel()

	base := &Container{
		Name:    "postgres",
		Image:   RefID("image:postgres"),
		Volumes: []types.VolumeMount{{HostPath: "data", ContainerPath: "/var/lib/postgresql"}},
	}

	baseHash := containerSpecHash(base, "sha256:image-v1", []string{"bridge"})

	modified := *base
	modified.Volumes = []types.VolumeMount{{
		HostPath:      "data",
		ContainerPath: "/var/lib/postgresql",
		Type:          types.VolumeMountTypeVolume,
	}}
	modifiedHash := containerSpecHash(&modified, "sha256:image-v1", []string{"bridge"})

	if baseHash == modifiedHash {
		t.Fatalf("container spec hash did not change when volume mount type changed")
	}
}

func TestContainerBackend_StopAndRemoveContainer_PropagatesStopError(t *testing.T) {
	t.Parallel()

	client := containermock.New()
	client.ContainerStopFunc = func(context.Context, string, *int) error {
		return errDaemonUnavailable
	}
	removeCalled := false
	client.ContainerRemoveFunc = func(context.Context, string, bool) error {
		removeCalled = true
		return nil
	}

	backend := New(client)
	err := backend.stopAndRemoveContainer(t.Context(), "test")
	if err == nil {
		t.Fatal("stopAndRemoveContainer() expected error, got nil")
	}
	if !strings.Contains(err.Error(), "stop container test") {
		t.Fatalf("stopAndRemoveContainer() error = %v, want stop error context", err)
	}
	if !removeCalled {
		t.Fatal("ContainerRemove was not called after stop failure")
	}
}

func TestContainerBackend_StopAndRemoveContainer_JoinsStopAndRemoveErrors(t *testing.T) {
	t.Parallel()

	client := containermock.New()
	client.ContainerStopFunc = func(context.Context, string, *int) error { return errStopFailed }
	client.ContainerRemoveFunc = func(context.Context, string, bool) error { return errRemoveFailed }

	backend := New(client)
	err := backend.stopAndRemoveContainer(t.Context(), "test")
	if err == nil {
		t.Fatal("stopAndRemoveContainer() expected error, got nil")
	}
	if !errors.Is(err, errStopFailed) {
		t.Fatalf("stopAndRemoveContainer() error = %v, want to include stopErr", err)
	}
	if !errors.Is(err, errRemoveFailed) {
		t.Fatalf("stopAndRemoveContainer() error = %v, want to include removeErr", err)
	}
}

func TestContainerBackend_StopAndRemoveContainer_IgnoresContainerNotFound(t *testing.T) {
	t.Parallel()

	client := containermock.New()
	client.ContainerStopFunc = func(context.Context, string, *int) error {
		return types.ErrContainerNotFound
	}
	client.ContainerRemoveFunc = func(context.Context, string, bool) error {
		return types.ErrContainerNotFound
	}

	backend := New(client)
	if err := backend.stopAndRemoveContainer(t.Context(), "test"); err != nil {
		t.Fatalf("stopAndRemoveContainer() error = %v, want nil", err)
	}
}

func TestContainerBackend_WaitForContainerReady_WaitsForHealthy(t *testing.T) {
	t.Parallel()

	client := containermock.New()
	inspectCalls := 0
	client.ContainerInspectFunc = func(context.Context, string) (types.ContainerInfo, error) {
		inspectCalls++
		state := types.ContainerState{
			Status:       "running",
			HealthStatus: "starting",
			Running:      true,
		}
		if inspectCalls > 1 {
			state.HealthStatus = "healthy"
		}
		return types.ContainerInfo{State: state}, nil
	}

	err := New(client).waitForContainerReady(t.Context(), "localtest")
	if err != nil {
		t.Fatalf("waitForContainerReady() error = %v, want nil", err)
	}
	if inspectCalls != 2 {
		t.Fatalf("ContainerInspect calls = %d, want 2", inspectCalls)
	}
}

func TestContainerBackend_WaitForContainerReady_FailsOnUnhealthy(t *testing.T) {
	t.Parallel()

	client := containermock.New()
	client.ContainerInspectFunc = func(context.Context, string) (types.ContainerInfo, error) {
		return types.ContainerInfo{
			State: types.ContainerState{
				Status:       "running",
				HealthStatus: "unhealthy",
				Running:      true,
			},
		}, nil
	}

	err := New(client).waitForContainerReady(t.Context(), "localtest")
	if !errors.Is(err, errContainerUnhealthy) {
		t.Fatalf("waitForContainerReady() error = %v, want errContainerUnhealthy", err)
	}
}

func TestExecutor_ContainerStatus_UsesHealth(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		state types.ContainerState
		want  Status
	}{
		{
			name: "running without healthcheck is ready",
			state: types.ContainerState{
				Status:  "running",
				Running: true,
			},
			want: StatusReady,
		},
		{
			name: "starting healthcheck is pending",
			state: types.ContainerState{
				Status:       "running",
				HealthStatus: "starting",
				Running:      true,
			},
			want: StatusPending,
		},
		{
			name: "unhealthy healthcheck is failed",
			state: types.ContainerState{
				Status:       "running",
				HealthStatus: "unhealthy",
				Running:      true,
			},
			want: StatusFailed,
		},
		{
			name: "exited zero is failed for long running resources",
			state: types.ContainerState{
				Status:   "exited",
				ExitCode: 0,
				Running:  false,
			},
			want: StatusFailed,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := containerInfoStatus(types.ContainerInfo{State: tt.state})
			if got != tt.want {
				t.Fatalf("containerInfoStatus() = %v, want %v", got, tt.want)
			}
		})
	}
}
