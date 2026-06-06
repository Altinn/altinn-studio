package containerbackend

import (
	"context"
	"errors"
	"slices"
	"testing"

	containermock "altinn.studio/devenv/pkg/container/mock"
	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource/executor"
)

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

	graph := NewGraph(testGraphID)
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

	_, err := newTestExecutor(client).Apply(t.Context(), graph)
	if err != nil {
		t.Fatalf("Apply() error = %v, want nil", err)
	}
	if inspectCalls != 3 {
		t.Fatalf("ContainerInspect calls = %d, want 3", inspectCalls)
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

	graph := NewGraph(testGraphID)
	disabled := false
	image := &LocalImage{
		Enabled:     &disabled,
		ContextPath: "/tmp/app",
		Tag:         "app:latest",
	}
	if err := graph.Add(image); err != nil {
		t.Fatalf("graph.Add(image) error = %v", err)
	}

	if _, err := newTestExecutor(client).Apply(t.Context(), graph); err != nil {
		t.Fatalf("Apply() error = %v, want nil", err)
	}
	if buildCalled {
		t.Fatal("BuildWithProgress was called for disabled image")
	}
}

func TestExecutor_ApplyDestroysStaleGraphResources(t *testing.T) {
	t.Parallel()

	client := containermock.New()
	var removedContainer string
	var removedNetwork string
	var destroyCalls []string
	client.ListContainersFunc = func(context.Context, types.ContainerListFilter) ([]types.ContainerInfo, error) {
		return []types.ContainerInfo{{
			ID:   "stale-container-id",
			Name: "stale-container",
			Labels: map[string]string{
				GraphIDLabel: "test",
			},
		}}, nil
	}
	client.ListNetworksFunc = func(context.Context, types.NetworkListFilter) ([]types.NetworkInfo, error) {
		return []types.NetworkInfo{{
			ID:   "stale-network-id",
			Name: "stale-network",
			Labels: map[string]string{
				GraphIDLabel: "test",
			},
		}}, nil
	}
	client.ContainerNetworksFunc = func(context.Context, string) ([]string, error) {
		return []string{"stale-network"}, nil
	}
	client.ContainerRemoveFunc = func(_ context.Context, nameOrID string, _ bool) error {
		destroyCalls = append(destroyCalls, "container")
		removedContainer = nameOrID
		return nil
	}
	client.NetworkRemoveFunc = func(_ context.Context, nameOrID string) error {
		destroyCalls = append(destroyCalls, "network")
		removedNetwork = nameOrID
		return nil
	}

	graph := NewGraph(testGraphID)
	if err := graph.Add(&RemoteImage{Ref: "localtest:latest"}); err != nil {
		t.Fatalf("graph.Add() error = %v", err)
	}

	if _, err := newTestExecutor(client).Apply(t.Context(), graph); err != nil {
		t.Fatalf("Apply() error = %v", err)
	}
	if removedContainer != "stale-container-id" {
		t.Fatalf("removed container = %q, want stale-container-id", removedContainer)
	}
	if removedNetwork != "stale-network-id" {
		t.Fatalf("removed network = %q, want stale-network-id", removedNetwork)
	}
	if !slices.Equal(destroyCalls, []string{"container", "network"}) {
		t.Fatalf("destroy calls = %v, want container before network", destroyCalls)
	}
}

func TestExecutor_ApplyRetainsDisabledResourceWithLifecycleOption(t *testing.T) {
	t.Parallel()

	client := containermock.New()
	client.ListContainersFunc = func(context.Context, types.ContainerListFilter) ([]types.ContainerInfo, error) {
		return []types.ContainerInfo{{
			ID:     "retained-container-id",
			Name:   "retained",
			Labels: map[string]string{GraphIDLabel: "test"},
		}}, nil
	}
	client.ListNetworksFunc = func(context.Context, types.NetworkListFilter) ([]types.NetworkInfo, error) {
		return nil, nil
	}
	client.ContainerInspectFunc = func(context.Context, string) (types.ContainerInfo, error) {
		return types.ContainerInfo{
			ID:     "retained-container-id",
			Name:   "retained",
			Labels: map[string]string{GraphIDLabel: "test"},
		}, nil
	}
	client.ContainerRemoveFunc = func(context.Context, string, bool) error {
		t.Fatal("ContainerRemove called for retained container")
		return nil
	}
	client.NetworkRemoveFunc = func(context.Context, string) error {
		t.Fatal("NetworkRemove called")
		return nil
	}

	graph := NewGraph(testGraphID)
	disabled := false
	if err := graph.Add(&Container{
		Name:    "retained",
		Image:   RefID("image:unused"),
		Enabled: &disabled,
		Lifecycle: ContainerLifecycleOptions{
			LifecycleOptions: LifecycleOptions{RetainOnDestroy: true},
		},
	}); err != nil {
		t.Fatalf("graph.Add() error = %v", err)
	}

	if _, err := newTestExecutor(client).Apply(t.Context(), graph); err != nil {
		t.Fatalf("Apply() error = %v", err)
	}
}

func TestExecutor_StatusPreservesInspectedContainerHealthWhenDiscoveredByGraphLabel(t *testing.T) {
	t.Parallel()

	client := containermock.New()
	client.ContainerInspectFunc = func(context.Context, string) (types.ContainerInfo, error) {
		return types.ContainerInfo{
			ID:     "container-id",
			Name:   "localtest-workflow-engine-db",
			Labels: map[string]string{GraphIDLabel: testGraphID.String()},
			State: types.ContainerState{
				Status:       "running",
				Running:      true,
				HealthStatus: "unhealthy",
			},
		}, nil
	}
	client.ListContainersFunc = func(context.Context, types.ContainerListFilter) ([]types.ContainerInfo, error) {
		return []types.ContainerInfo{{
			ID:     "container-id",
			Name:   "localtest-workflow-engine-db",
			Labels: map[string]string{GraphIDLabel: testGraphID.String()},
			State: types.ContainerState{
				Status:  "running",
				Running: true,
			},
		}}, nil
	}
	client.ListNetworksFunc = func(context.Context, types.NetworkListFilter) ([]types.NetworkInfo, error) {
		return nil, nil
	}

	graph := NewGraph(testGraphID)
	container := &Container{
		Name:  "localtest-workflow-engine-db",
		Image: RefID("image:unused"),
	}
	mustAddResource(t, graph, container)

	snapshot, err := newTestExecutor(client).Status(t.Context(), graph)
	if err != nil {
		t.Fatalf("Status() error = %v", err)
	}
	if got := snapshot.Resources[container.ID()].Status; got != StatusFailed {
		t.Fatalf("container status = %v, want failed", got)
	}
}

func TestExecutor_ApplyValidatesGraphBeforeDestroyingStaleResources(t *testing.T) {
	t.Parallel()

	client := containermock.New()
	client.ListContainersFunc = func(context.Context, types.ContainerListFilter) ([]types.ContainerInfo, error) {
		t.Fatal("ListContainers called before graph validation")
		return nil, nil
	}
	client.ContainerRemoveFunc = func(context.Context, string, bool) error {
		t.Fatal("ContainerRemove called before graph validation")
		return nil
	}

	graph := NewGraph(testGraphID)
	container := &Container{
		Name:  "invalid",
		Image: RefID("image:missing"),
	}
	mustAddResource(t, graph, container)

	if _, err := newTestExecutor(client).Apply(t.Context(), graph); err == nil {
		t.Fatal("Apply() error = nil, want graph validation error")
	}
}

func TestExecutor_ApplyFailsOnUnmanagedContainerNameCollision(t *testing.T) {
	t.Parallel()

	client := containermock.New()
	client.ContainerInspectFunc = func(context.Context, string) (types.ContainerInfo, error) {
		return types.ContainerInfo{
			ID:      "unmanaged-container-id",
			ImageID: "sha256:other-image",
			State:   types.ContainerState{Status: "running", Running: true},
			Labels:  map[string]string{},
		}, nil
	}
	client.ContainerRemoveFunc = func(context.Context, string, bool) error {
		t.Fatal("ContainerRemove called for unmanaged container")
		return nil
	}

	graph := NewGraph(testGraphID)
	image := &RemoteImage{Ref: "localtest:latest"}
	container := &Container{
		Name:  "localtest",
		Image: Ref(image),
	}
	mustAddResource(t, graph, image)
	mustAddResource(t, graph, container)

	_, err := newTestExecutor(client).Apply(t.Context(), graph)
	if !errors.Is(err, executor.ErrResourceOwnershipConflict) {
		t.Fatalf("Apply() error = %v, want executor.ErrResourceOwnershipConflict", err)
	}
}

func TestExecutor_ApplyFailsOnUnmanagedContainerNameCollisionWithMatchingLabels(t *testing.T) {
	t.Parallel()

	client := containermock.New()
	client.ContainerInspectFunc = func(context.Context, string) (types.ContainerInfo, error) {
		return types.ContainerInfo{
			ID:      "unmanaged-container-id",
			ImageID: "sha256:other-image",
			State:   types.ContainerState{Status: "running", Running: true},
			Labels:  map[string]string{"app": "localtest"},
		}, nil
	}
	client.ContainerRemoveFunc = func(context.Context, string, bool) error {
		t.Fatal("ContainerRemove called for unmanaged container")
		return nil
	}

	graph := NewGraph(testGraphID)
	image := &RemoteImage{Ref: "localtest:latest"}
	container := &Container{
		Name:   "localtest",
		Image:  Ref(image),
		Labels: map[string]string{"app": "localtest"},
	}
	mustAddResource(t, graph, image)
	mustAddResource(t, graph, container)

	_, err := newTestExecutor(client).Apply(t.Context(), graph)
	if !errors.Is(err, executor.ErrResourceOwnershipConflict) {
		t.Fatalf("Apply() error = %v, want executor.ErrResourceOwnershipConflict", err)
	}
}

func TestExecutor_ApplyFailsOnUnmanagedNetworkNameCollision(t *testing.T) {
	t.Parallel()

	client := containermock.New()
	client.NetworkInspectFunc = func(context.Context, string) (types.NetworkInfo, error) {
		return types.NetworkInfo{
			ID:     "unmanaged-network-id",
			Name:   "altinntestlocal_network",
			Labels: map[string]string{},
		}, nil
	}
	client.NetworkCreateFunc = func(context.Context, types.NetworkConfig) (string, error) {
		t.Fatal("NetworkCreate called for unmanaged network collision")
		return "", nil
	}

	graph := NewGraph(testGraphID)
	mustAddResource(t, graph, &Network{Name: "altinntestlocal_network"})

	_, err := newTestExecutor(client).Apply(t.Context(), graph)
	if !errors.Is(err, executor.ErrResourceOwnershipConflict) {
		t.Fatalf("Apply() error = %v, want executor.ErrResourceOwnershipConflict", err)
	}
}

func TestExecutor_ApplyReturnsImageOutputs(t *testing.T) {
	t.Parallel()

	client := containermock.New()
	client.ImageInspectFunc = func(context.Context, string) (types.ImageInfo, error) {
		return types.ImageInfo{ID: "sha256:image-id"}, nil
	}

	graph := NewGraph(testGraphID)
	image := &RemoteImage{Ref: "ghcr.io/altinn/test:latest", PullPolicy: PullIfNotPresent}
	if err := graph.Add(image); err != nil {
		t.Fatalf("graph.Add(image) error = %v", err)
	}

	outputs, err := newTestExecutor(client).Apply(t.Context(), graph)
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

	graph := NewGraph(testGraphID)
	image := &RemoteImage{Ref: "ghcr.io/altinn/test:latest", PullPolicy: PullIfNotPresent}
	container := &Container{Name: "app", Image: Ref(image)}
	if err := graph.Add(image); err != nil {
		t.Fatalf("graph.Add(image) error = %v", err)
	}
	if err := graph.Add(container); err != nil {
		t.Fatalf("graph.Add(container) error = %v", err)
	}

	outputs, err := newTestExecutor(client).Apply(t.Context(), graph)
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

	graph := NewGraph(testGraphID)
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

	_, err := newTestExecutor(client).Apply(t.Context(), graph)
	if err != nil {
		t.Fatalf("Apply() error = %v, want nil", err)
	}
	if inspectCalls != 4 {
		t.Fatalf("ContainerInspect calls = %d, want 4", inspectCalls)
	}
}

func TestExecutor_Status_SkipsResources(t *testing.T) {
	t.Parallel()

	client := containermock.New()
	client.ContainerInspectFunc = func(context.Context, string) (types.ContainerInfo, error) {
		return types.ContainerInfo{
			State: types.ContainerState{
				Status:  "running",
				Running: true,
			},
		}, nil
	}
	client.ImageInspectFunc = func(context.Context, string) (types.ImageInfo, error) {
		t.Fatal("ImageInspect called for skipped image")
		return types.ImageInfo{}, nil
	}

	image := &RemoteImage{Ref: "localtest:latest"}
	container := &Container{Name: "localtest", Image: Ref(image)}
	graph := NewGraph(testGraphID)
	mustAddResource(t, graph, image)
	mustAddResource(t, graph, container)

	snapshot, err := newTestExecutor(client).Status(t.Context(), graph, SkipResource(func(r Resource) bool {
		_, ok := r.(ImageResource)
		return ok
	}))
	if err != nil {
		t.Fatalf("Status() error = %v, want nil", err)
	}
	statuses := snapshot.Statuses()
	if _, ok := statuses[image.ID()]; ok {
		t.Fatalf("Status() included skipped image %q", image.ID())
	}
	if statuses[container.ID()] != StatusReady {
		t.Fatalf("container status = %v, want ready", statuses[container.ID()])
	}
}

func TestExecutor_DestroyNetwork_PropagatesNetworkInUseByDefault(t *testing.T) {
	t.Parallel()

	client := containermock.New()
	client.NetworkInspectFunc = func(context.Context, string) (types.NetworkInfo, error) {
		return types.NetworkInfo{
			Name:   "localtest",
			Labels: map[string]string{GraphIDLabel: testGraphID.String()},
		}, nil
	}
	client.NetworkRemoveFunc = func(context.Context, string) error {
		return types.ErrNetworkInUse
	}

	graph := NewGraph(testGraphID)
	if err := graph.Add(&Network{Name: "localtest"}); err != nil {
		t.Fatalf("graph.Add() error = %v", err)
	}

	err := newTestExecutor(client).Destroy(t.Context(), graph)
	if !errors.Is(err, types.ErrNetworkInUse) {
		t.Fatalf("Destroy() error = %v, want ErrNetworkInUse", err)
	}
}

func TestExecutor_DestroyNetwork_UsesLifecycleErrorHandler(t *testing.T) {
	t.Parallel()

	client := containermock.New()
	client.NetworkInspectFunc = func(context.Context, string) (types.NetworkInfo, error) {
		return types.NetworkInfo{
			Name:   "localtest",
			Labels: map[string]string{GraphIDLabel: testGraphID.String()},
		}, nil
	}
	client.NetworkRemoveFunc = func(context.Context, string) error {
		return types.ErrNetworkInUse
	}

	graph := NewGraph(testGraphID)
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

	if err := newTestExecutor(client).Destroy(t.Context(), graph); err != nil {
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

	graph := NewGraph(testGraphID)
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

	exec := newTestExecutor(client)
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
