package localtestv2

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"maps"
	"slices"
	"strings"
	"sync"
	"testing"

	"altinn.studio/devenv/pkg/container/mock"
	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/studioctl/internal/localtestv2"
	"altinn.studio/studioctl/internal/ui"
)

var (
	errCreate       = errors.New("create failed")
	errNetworkInUse = errors.New("network in use")
	// errPortInUse is Podman's message when the front door's port is taken.
	errPortInUse = errors.New("rootlessport listen tcp 0.0.0.0:8000: bind: address already in use")
)

// fakeRuntime is a container runtime in memory on the mock client: containers and networks exist between calls, a
// create of a container named in failCreate fails, and the probe of a container named in unhealthy exits 1.
type fakeRuntime struct {
	failCreate map[string]error
	unhealthy  map[string]bool
	containers map[string]types.ContainerConfig
	networks   map[string]types.NetworkConfig
	created    []string
	mu         sync.Mutex
}

func newFakeRuntime() (*fakeRuntime, *mock.Client) {
	f := &fakeRuntime{
		failCreate: map[string]error{},
		unhealthy:  map[string]bool{},
		containers: map[string]types.ContainerConfig{},
		networks:   map[string]types.NetworkConfig{},
		created:    nil,
		mu:         sync.Mutex{},
	}
	client := mock.New()
	client.ImageInspectFunc = func(_ context.Context, image string) (types.ImageInfo, error) {
		return types.ImageInfo{ID: "sha256:" + image}, nil
	}
	client.CreateContainerFunc = f.create
	client.ContainerInspectFunc = f.inspect
	client.ContainerStateFunc = f.state
	client.ContainerNetworksFunc = f.containerNetworks
	client.ListContainersFunc = f.listContainers
	client.ContainerRemoveFunc = f.remove
	client.NetworkCreateFunc = f.createNetwork
	client.NetworkInspectFunc = f.inspectNetwork
	client.ListNetworksFunc = f.listNetworks
	client.NetworkRemoveFunc = f.removeNetwork
	return f, client
}

func (f *fakeRuntime) create(_ context.Context, cfg types.ContainerConfig) (string, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if err := f.failCreate[strings.TrimPrefix(cfg.Name, containerPrefix)]; err != nil {
		return "", err
	}
	f.containers[cfg.Name] = cfg
	f.created = append(f.created, cfg.Name)
	return cfg.Name, nil
}

func (f *fakeRuntime) inspect(_ context.Context, name string) (types.ContainerInfo, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	cfg, ok := f.containers[name]
	if !ok {
		return types.ContainerInfo{}, types.ErrContainerNotFound
	}
	return types.ContainerInfo{
		ID: name, Name: name, Image: cfg.Image, ImageID: cfg.Image, Labels: cfg.Labels, Ports: nil,
		State: types.ContainerState{Status: "running", HealthStatus: "", ExitCode: 0, Running: true, Paused: false},
	}, nil
}

func (f *fakeRuntime) state(_ context.Context, name string) (types.ContainerState, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if _, ok := f.containers[name]; !ok {
		return types.ContainerState{}, types.ErrContainerNotFound
	}
	exit := 0
	if f.unhealthy[strings.TrimPrefix(name, probeContainerOf(""))] {
		exit = 1
	}
	return types.ContainerState{
		Status:       probeStatusExited,
		HealthStatus: "",
		ExitCode:     exit,
		Running:      false,
		Paused:       false,
	}, nil
}

func (f *fakeRuntime) containerNetworks(_ context.Context, name string) ([]string, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	cfg, ok := f.containers[name]
	if !ok {
		return nil, types.ErrContainerNotFound
	}
	return cfg.Networks, nil
}

func labelled(labels, filter map[string]string) bool {
	for key, value := range filter {
		if labels[key] != value {
			return false
		}
	}
	return true
}

func (f *fakeRuntime) listContainers(
	_ context.Context,
	filter types.ContainerListFilter,
) ([]types.ContainerInfo, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var out []types.ContainerInfo
	for name, cfg := range f.containers {
		if labelled(cfg.Labels, filter.Labels) {
			out = append(out, types.ContainerInfo{
				ID:      name,
				Name:    name,
				Image:   cfg.Image,
				ImageID: cfg.Image,
				Labels:  cfg.Labels,
				Ports:   nil,
				State: types.ContainerState{
					Status:       "running",
					HealthStatus: "",
					ExitCode:     0,
					Running:      true,
					Paused:       false,
				},
			})
		}
	}
	return out, nil
}

func (f *fakeRuntime) remove(_ context.Context, name string, _ bool) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if _, ok := f.containers[name]; !ok {
		return types.ErrContainerNotFound
	}
	delete(f.containers, name)
	return nil
}

func (f *fakeRuntime) createNetwork(_ context.Context, cfg types.NetworkConfig) (string, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.networks[cfg.Name] = cfg
	f.created = append(f.created, "network "+cfg.Name)
	return cfg.Name, nil
}

func (f *fakeRuntime) inspectNetwork(_ context.Context, name string) (types.NetworkInfo, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	cfg, ok := f.networks[name]
	if !ok {
		return types.NetworkInfo{}, types.ErrNetworkNotFound
	}
	return types.NetworkInfo{Labels: cfg.Labels, ID: name, Name: name, Driver: cfg.Driver}, nil
}

func (f *fakeRuntime) listNetworks(_ context.Context, filter types.NetworkListFilter) ([]types.NetworkInfo, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var out []types.NetworkInfo
	for name, cfg := range f.networks {
		if labelled(cfg.Labels, filter.Labels) {
			out = append(out, types.NetworkInfo{Labels: cfg.Labels, ID: name, Name: name, Driver: cfg.Driver})
		}
	}
	return out, nil
}

func (f *fakeRuntime) removeNetwork(_ context.Context, name string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if _, ok := f.networks[name]; !ok {
		return types.ErrNetworkNotFound
	}
	for container, cfg := range f.containers {
		if slices.Contains(cfg.Networks, name) {
			return fmt.Errorf("%w: %s has active endpoints (%s)", errNetworkInUse, name, container)
		}
	}
	delete(f.networks, name)
	return nil
}

// left lists the containers and networks that exist.
func (f *fakeRuntime) left() []string {
	f.mu.Lock()
	defer f.mu.Unlock()
	return slices.Sorted(func(yield func(string) bool) {
		for name := range maps.Keys(f.containers) {
			if !yield(name) {
				return
			}
		}
		for name := range maps.Keys(f.networks) {
			if !yield("network " + name) {
				return
			}
		}
	})
}

// startFailing starts the default stack on the fake runtime, as env up does once it has recorded the state.
func startFailing(t *testing.T, f *fakeRuntime, client *mock.Client) (*bytes.Buffer, *Env, error) {
	t.Helper()
	cfg := testConfig(t)
	writeTestState(t, cfg, false)
	var out bytes.Buffer
	env := NewEnv(cfg, ui.NewOutput(&out, io.Discard, false), client)
	err := env.startContainers(t.Context(), defaultOptions(localtestv2.CertificateDir(cfg), localtestv2.FilesDir(cfg)))
	if err == nil {
		t.Fatal("the start did not fail")
	}
	if len(f.created) == 0 {
		t.Fatal("the start created nothing before it failed")
	}
	return &out, env, err
}

func stateLeft(t *testing.T, env *Env) bool {
	t.Helper()
	_, up, err := localtestv2.ReadState(env.cfg)
	if err != nil {
		t.Fatal(err)
	}
	return up
}

func TestAFailedCreateRemovesWhatTheStartCreated(t *testing.T) {
	t.Parallel()
	f, client := newFakeRuntime()
	// Notifications starts after postgres, register, profile, authorization and authentication.
	f.failCreate["notifications"] = errCreate
	// A probe that an earlier start, cancelled mid-way, could leave; the default stack has no receipt.
	f.containers[probeContainerOf("receipt")] = types.ContainerConfig{Name: probeContainerOf("receipt")}
	out, env, err := startFailing(t, f, client)
	if !errors.Is(err, errCreate) {
		t.Errorf("error %v does not carry the create error", err)
	}
	for _, name := range []string{"postgres", "register", "profile", "authorization", "authentication"} {
		if !slices.Contains(f.created, containerOf(name)) {
			t.Errorf("%s was not created before notifications", name)
		}
	}
	if left := f.left(); len(left) != 0 {
		t.Errorf("left after the failed start: %v", left)
	}
	if stateLeft(t, env) {
		t.Error("the state file is left")
	}
	if !strings.Contains(out.String(), "Removed after the failed start: ") ||
		!strings.Contains(out.String(), "network:"+networkName) ||
		!strings.Contains(out.String(), probeContainerOf("receipt")) {
		t.Errorf("output does not say what was removed:\n%s", out.String())
	}
}

func TestATakenPortRemovesWhatTheStartCreatedAndSaysSo(t *testing.T) {
	t.Parallel()
	f, client := newFakeRuntime()
	f.failCreate[frontDoor] = errPortInUse
	_, env, err := startFailing(t, f, client)
	if !errors.Is(err, errPortTaken) ||
		!strings.Contains(err.Error(), "port 8000 is in use by another process") ||
		!strings.Contains(err.Error(), "--port 0' picks a free one") {
		t.Errorf("error %v", err)
	}
	if left := f.left(); len(left) != 0 {
		t.Errorf("left after the failed start: %v", left)
	}
	if stateLeft(t, env) {
		t.Error("the state file is left")
	}
}

// A container that never became healthy is left running, with the state file, so env logs and env status see it.
func TestAnUnhealthyContainerIsLeftRunningForInspection(t *testing.T) {
	t.Parallel()
	f, client := newFakeRuntime()
	f.unhealthy["storage"] = true
	_, env, err := startFailing(t, f, client)
	if !errors.Is(err, errUnhealthy) || !strings.Contains(err.Error(), "left running for inspection") ||
		!strings.Contains(err.Error(), "env down -r "+Name+"' removes them") {
		t.Errorf("error %v", err)
	}
	left := f.left()
	if !slices.Contains(left, containerOf("storage")) || !slices.Contains(left, "network "+networkName) {
		t.Errorf("left %v, want storage and the network", left)
	}
	for _, name := range left {
		if strings.HasPrefix(name, probeContainerOf("")) {
			t.Errorf("probe container %s left", name)
		}
	}
	if !stateLeft(t, env) {
		t.Error("the state file is gone")
	}
}
