package resource

import (
	"context"
	"errors"
	"strings"
	"testing"

	containermock "altinn.studio/devenv/pkg/container/mock"
	"altinn.studio/devenv/pkg/container/types"
)

var (
	errDaemonUnavailable = errors.New("daemon unavailable")
	errStopFailed        = errors.New("stop failed")
	errRemoveFailed      = errors.New("remove failed")
)

func TestNormalizedContainerLabels_DoesNotMutateInput(t *testing.T) {
	t.Parallel()

	container := &Container{
		Name:   "localtest",
		Image:  RefID("image:localtest"),
		Labels: map[string]string{"altinn.studio/cli": "localtest"},
	}

	labels := normalizedContainerLabels(container, "sha256:image", []string{"net-a"})

	if labels[containerSpecHashLabel] == "" {
		t.Fatalf("missing %q label", containerSpecHashLabel)
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

func TestExecutor_StopAndRemoveContainer_PropagatesStopError(t *testing.T) {
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

	exec := NewExecutor(client)
	err := exec.stopAndRemoveContainer(t.Context(), "test")
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

func TestExecutor_StopAndRemoveContainer_JoinsStopAndRemoveErrors(t *testing.T) {
	t.Parallel()

	client := containermock.New()
	client.ContainerStopFunc = func(context.Context, string, *int) error { return errStopFailed }
	client.ContainerRemoveFunc = func(context.Context, string, bool) error { return errRemoveFailed }

	exec := NewExecutor(client)
	err := exec.stopAndRemoveContainer(t.Context(), "test")
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

func TestExecutor_StopAndRemoveContainer_IgnoresContainerNotFound(t *testing.T) {
	t.Parallel()

	client := containermock.New()
	client.ContainerStopFunc = func(context.Context, string, *int) error {
		return types.ErrContainerNotFound
	}
	client.ContainerRemoveFunc = func(context.Context, string, bool) error {
		return types.ErrContainerNotFound
	}

	exec := NewExecutor(client)
	if err := exec.stopAndRemoveContainer(t.Context(), "test"); err != nil {
		t.Fatalf("stopAndRemoveContainer() error = %v, want nil", err)
	}
}

func TestExecutor_WaitForContainerReady_WaitsForHealthy(t *testing.T) {
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

	err := NewExecutor(client).waitForContainerReady(t.Context(), "localtest")
	if err != nil {
		t.Fatalf("waitForContainerReady() error = %v, want nil", err)
	}
	if inspectCalls != 2 {
		t.Fatalf("ContainerInspect calls = %d, want 2", inspectCalls)
	}
}

func TestExecutor_WaitForContainerReady_FailsOnUnhealthy(t *testing.T) {
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

	err := NewExecutor(client).waitForContainerReady(t.Context(), "localtest")
	if !errors.Is(err, errContainerUnhealthy) {
		t.Fatalf("waitForContainerReady() error = %v, want errContainerUnhealthy", err)
	}
}

func TestExecutor_ApplyContainer_DoesNotWaitForReadyByDefault(t *testing.T) {
	t.Parallel()

	client := containermock.New()
	inspectCalls := 0
	client.ContainerInspectFunc = func(context.Context, string) (types.ContainerInfo, error) {
		inspectCalls++
		if inspectCalls == 1 {
			return types.ContainerInfo{}, types.ErrContainerNotFound
		}
		return types.ContainerInfo{
			ID:      "container-id",
			ImageID: "sha256:mock-image-id",
			State:   types.ContainerState{Status: "running", Running: true},
		}, nil
	}

	graph := NewGraph()
	image := &RemoteImage{Ref: "localtest:latest"}
	container := &Container{
		Name:  "localtest",
		Image: Ref(image),
	}
	if err := graph.Add(image); err != nil {
		t.Fatalf("graph.Add(image) error = %v", err)
	}
	if err := graph.Add(container); err != nil {
		t.Fatalf("graph.Add(container) error = %v", err)
	}

	_, err := NewExecutor(client).Apply(t.Context(), graph)
	if err != nil {
		t.Fatalf("Apply() error = %v, want nil", err)
	}
	if inspectCalls != 2 {
		t.Fatalf("ContainerInspect calls = %d, want 2", inspectCalls)
	}
}

func TestExecutor_ApplySkipsDisabledResources(t *testing.T) {
	t.Parallel()

	client := containermock.New()
	buildCalled := false
	client.BuildWithProgressFunc = func(
		context.Context,
		string,
		string,
		string,
		types.ProgressHandler,
		...types.BuildOptions,
	) error {
		buildCalled = true
		return nil
	}

	graph := NewGraph()
	disabled := false
	image := &LocalImage{
		Enabled:     &disabled,
		ContextPath: "/tmp/app",
		Tag:         "app:latest",
	}
	if err := graph.Add(image); err != nil {
		t.Fatalf("graph.Add(image) error = %v", err)
	}

	if _, err := NewExecutor(client).Apply(t.Context(), graph); err != nil {
		t.Fatalf("Apply() error = %v, want nil", err)
	}
	if buildCalled {
		t.Fatal("BuildWithProgress was called for disabled image")
	}
}

func TestExecutor_ApplyReturnsImageOutputs(t *testing.T) {
	t.Parallel()

	client := containermock.New()
	client.ImageInspectFunc = func(context.Context, string) (types.ImageInfo, error) {
		return types.ImageInfo{ID: "sha256:image-id"}, nil
	}

	graph := NewGraph()
	image := &RemoteImage{Ref: "ghcr.io/altinn/test:latest", PullPolicy: PullIfNotPresent}
	if err := graph.Add(image); err != nil {
		t.Fatalf("graph.Add(image) error = %v", err)
	}

	outputs, err := NewExecutor(client).Apply(t.Context(), graph)
	if err != nil {
		t.Fatalf("Apply() error = %v", err)
	}

	output, ok := outputs.Image(image.ID())
	if !ok {
		t.Fatal("missing image output")
	}
	if output.ImageID != "sha256:image-id" {
		t.Fatalf("ImageID = %q, want %q", output.ImageID, "sha256:image-id")
	}
}

func TestExecutor_ApplyReturnsContainerOutputs(t *testing.T) {
	t.Parallel()

	client := containermock.New()
	client.ImageInspectFunc = func(context.Context, string) (types.ImageInfo, error) {
		return types.ImageInfo{ID: "sha256:image-id"}, nil
	}

	inspectCalls := 0
	client.ContainerInspectFunc = func(context.Context, string) (types.ContainerInfo, error) {
		inspectCalls++
		if inspectCalls == 1 {
			return types.ContainerInfo{}, types.ErrContainerNotFound
		}
		return types.ContainerInfo{
			ID:      "container-id",
			ImageID: "sha256:image-id",
			Ports: []types.PublishedPort{
				{ContainerPort: "5005", HostPort: "8080", Protocol: "tcp"},
			},
			State: types.ContainerState{Status: "running", Running: true},
		}, nil
	}
	client.CreateContainerFunc = func(context.Context, types.ContainerConfig) (string, error) {
		return "container-id", nil
	}

	graph := NewGraph()
	image := &RemoteImage{Ref: "ghcr.io/altinn/test:latest", PullPolicy: PullIfNotPresent}
	container := &Container{Name: "app", Image: Ref(image)}
	if err := graph.Add(image); err != nil {
		t.Fatalf("graph.Add(image) error = %v", err)
	}
	if err := graph.Add(container); err != nil {
		t.Fatalf("graph.Add(container) error = %v", err)
	}

	outputs, err := NewExecutor(client).Apply(t.Context(), graph)
	if err != nil {
		t.Fatalf("Apply() error = %v", err)
	}

	output, ok := outputs.Container(container.ID())
	if !ok {
		t.Fatal("missing container output")
	}
	if output.ContainerID != "container-id" {
		t.Fatalf("ContainerID = %q, want %q", output.ContainerID, "container-id")
	}
	if len(output.HostPorts) != 1 || output.HostPorts[0].HostPort != "8080" {
		t.Fatalf("HostPorts = %+v, want host port 8080", output.HostPorts)
	}
}

func TestExecutor_ApplyContainer_WaitsForReadyWhenEnabled(t *testing.T) {
	t.Parallel()

	client := containermock.New()
	inspectCalls := 0
	client.ContainerInspectFunc = func(context.Context, string) (types.ContainerInfo, error) {
		inspectCalls++
		if inspectCalls == 1 {
			return types.ContainerInfo{}, types.ErrContainerNotFound
		}
		state := types.ContainerState{
			Status:       "running",
			HealthStatus: "starting",
			Running:      true,
		}
		if inspectCalls > 2 {
			state.HealthStatus = "healthy"
		}
		return types.ContainerInfo{State: state}, nil
	}

	graph := NewGraph()
	image := &RemoteImage{Ref: "localtest:latest"}
	container := &Container{
		Name:  "localtest",
		Image: Ref(image),
		Lifecycle: ContainerLifecycleOptions{
			WaitForReady: true,
		},
	}
	if err := graph.Add(image); err != nil {
		t.Fatalf("graph.Add(image) error = %v", err)
	}
	if err := graph.Add(container); err != nil {
		t.Fatalf("graph.Add(container) error = %v", err)
	}

	_, err := NewExecutor(client).Apply(t.Context(), graph)
	if err != nil {
		t.Fatalf("Apply() error = %v, want nil", err)
	}
	if inspectCalls != 4 {
		t.Fatalf("ContainerInspect calls = %d, want 4", inspectCalls)
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
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			client := containermock.New()
			client.ContainerInspectFunc = func(context.Context, string) (types.ContainerInfo, error) {
				return types.ContainerInfo{State: tt.state}, nil
			}

			got, err := NewExecutor(client).containerStatus(t.Context(), &Container{Name: "localtest"})
			if err != nil {
				t.Fatalf("containerStatus() error = %v", err)
			}
			if got != tt.want {
				t.Fatalf("containerStatus() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestExecutor_DestroyNetwork_PropagatesNetworkInUseByDefault(t *testing.T) {
	t.Parallel()

	client := containermock.New()
	client.NetworkRemoveFunc = func(context.Context, string) error {
		return types.ErrNetworkInUse
	}

	graph := NewGraph()
	if err := graph.Add(&Network{Name: "localtest"}); err != nil {
		t.Fatalf("graph.Add() error = %v", err)
	}

	err := NewExecutor(client).Destroy(t.Context(), graph)
	if !errors.Is(err, types.ErrNetworkInUse) {
		t.Fatalf("Destroy() error = %v, want ErrNetworkInUse", err)
	}
}

func TestExecutor_DestroyNetwork_UsesLifecycleErrorHandler(t *testing.T) {
	t.Parallel()

	client := containermock.New()
	client.NetworkRemoveFunc = func(context.Context, string) error {
		return types.ErrNetworkInUse
	}

	graph := NewGraph()
	if err := graph.Add(&Network{
		Name: "localtest",
		Lifecycle: LifecycleOptions{
			HandleDestroyError: func(err error) ErrorDecision {
				if errors.Is(err, types.ErrNetworkInUse) {
					return ErrorDecisionIgnore
				}
				return ErrorDecisionDefault
			},
		},
	}); err != nil {
		t.Fatalf("graph.Add() error = %v", err)
	}

	if err := NewExecutor(client).Destroy(t.Context(), graph); err != nil {
		t.Fatalf("Destroy() error = %v, want nil", err)
	}
}

func TestExecutor_ApplyRemoteImage_EmitsProgressEvents(t *testing.T) {
	t.Parallel()

	client := containermock.New()

	inspectCalls := 0
	client.ImageInspectFunc = func(context.Context, string) (types.ImageInfo, error) {
		inspectCalls++
		if inspectCalls == 1 {
			return types.ImageInfo{}, types.ErrImageNotFound
		}
		return types.ImageInfo{ID: "sha256:test-image"}, nil
	}

	client.ImagePullWithProgressFunc = func(
		context.Context,
		string,
		types.ProgressHandler,
	) error {
		return nil
	}

	img := &RemoteImage{
		Ref:        "ghcr.io/altinn/test:latest",
		PullPolicy: PullAlways,
	}

	graph := NewGraph()
	if err := graph.Add(img); err != nil {
		t.Fatalf("graph.Add() error = %v", err)
	}
	if err := graph.Validate(); err != nil {
		t.Fatalf("graph.Validate() error = %v", err)
	}

	var progressEvents int
	client.ImagePullWithProgressFunc = func(
		_ context.Context,
		_ string,
		onProgress types.ProgressHandler,
	) error {
		if onProgress != nil {
			onProgress(types.ProgressUpdate{Message: "layer 1", Current: 2, Total: 10})
			onProgress(types.ProgressUpdate{Message: "layer 1", Current: 10, Total: 10})
		}
		return nil
	}

	exec := NewExecutor(client)
	exec.SetObserver(ObserverFunc(func(event Event) {
		if event.Type != EventApplyProgress || event.Resource != img.ID() {
			return
		}
		if event.Progress == nil {
			t.Fatal("EventApplyProgress without Progress payload")
		}
		progressEvents++
	}))

	if _, err := exec.Apply(t.Context(), graph); err != nil {
		t.Fatalf("Apply() error = %v", err)
	}

	if progressEvents < 2 {
		t.Fatalf("progress events = %d, want at least 2", progressEvents)
	}
}
