package localtest

import (
	"context"
	"errors"
	"io"
	"net"
	"path/filepath"
	"strings"
	"sync"
	"testing"

	"altinn.studio/devenv/pkg/container/mock"
	containertypes "altinn.studio/devenv/pkg/container/types"
	envtypes "altinn.studio/studioctl/internal/cmd/env"
	"altinn.studio/studioctl/internal/cmd/env/localtest/components"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/ui"
)

func TestCheckPublicPort(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name              string
		port              string
		wantClash         string
		monitoring        bool
		devWorkflowEngine bool
	}{
		{name: "a free port", port: "8100"},
		{name: "the default port with every option", port: "8000", monitoring: true, devWorkflowEngine: true},
		{name: "localtest's own port", port: components.LocaltestServicePort, wantClash: components.ContainerLocaltest},
		{name: "pdf3's port", port: "5300", wantClash: components.ContainerPDF3},
		{
			name:       "the collector's port with monitoring",
			port:       "4317",
			monitoring: true,
			wantClash:  components.ContainerOtelCollector,
		},
		{name: "the collector's port without monitoring", port: "4317"},
		{
			name:              "the engine database's port with a host engine",
			port:              "9543",
			devWorkflowEngine: true,
			wantClash:         components.ContainerWorkflowEngineDb,
		},
		{name: "the engine database's port otherwise", port: "9543"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			manifest := components.NewManifest(&components.Options{
				Paths:             components.NewPaths(t.TempDir()),
				Topology:          envtopology.NewLocal(tt.port),
				IncludeMonitoring: tt.monitoring,
				DevWorkflowEngine: tt.devWorkflowEngine,
			})

			err := checkPublicPort(manifest.Resources, tt.port)
			if tt.wantClash == "" {
				if err != nil {
					t.Fatalf("checkPublicPort() error = %v, want nil", err)
				}
				return
			}
			if !errors.Is(err, errPortPublished) || !strings.Contains(err.Error(), tt.wantClash) {
				t.Fatalf("checkPublicPort() error = %v, want a clash with %s", err, tt.wantClash)
			}
		})
	}
}

func TestCheckPortFreeRefusesAPortAnotherProgramListensOn(t *testing.T) {
	t.Parallel()

	port, _ := listenOnLoopback(t)
	env := newPortTestEnv(t, containertypes.ContainerInfo{})

	if err := env.checkPortFree(t.Context(), port); !errors.Is(err, errPortInUse) {
		t.Fatalf("checkPortFree() error = %v, want errPortInUse", err)
	}
}

// Most programs that hold a port listen on every address, not on 127.0.0.1 alone: a dev server on 0.0.0.0, or macOS's
// AirPlay receiver on *:5000 and *:7000. Docker Desktop and Podman machine then fail to publish the port, after env up
// has removed the running localtest container. Linux refuses a loopback bind next to a wildcard listener; BSD
// sockets (macOS) let one with SO_REUSEADDR, which Go sets on every listener, through.
func TestCheckPortFreeRefusesAPortAnotherProgramListensOnEveryAddress(t *testing.T) {
	t.Parallel()

	var listenConfig net.ListenConfig
	listener, err := listenConfig.Listen(t.Context(), "tcp4", ":0")
	if err != nil {
		t.Fatalf("Listen() error = %v", err)
	}
	t.Cleanup(func() {
		if closeErr := listener.Close(); closeErr != nil {
			t.Errorf("Close() error = %v", closeErr)
		}
	})
	_, port, err := net.SplitHostPort(listener.Addr().String())
	if err != nil {
		t.Fatalf("SplitHostPort() error = %v", err)
	}
	env := newPortTestEnv(t, containertypes.ContainerInfo{})

	if err := env.checkPortFree(t.Context(), port); !errors.Is(err, errPortInUse) {
		t.Fatalf("checkPortFree() error = %v, want errPortInUse for a port held on 0.0.0.0", err)
	}
}

func TestCheckPortFreeAcceptsTheRunningLocaltestsOwnPort(t *testing.T) {
	t.Parallel()

	port, _ := listenOnLoopback(t)
	env := newPortTestEnv(t, containertypes.ContainerInfo{
		Ports: []containertypes.PublishedPort{{HostPort: port, ContainerPort: components.LocaltestServicePort}},
		State: containertypes.ContainerState{Status: "running", Running: true},
	})

	if err := env.checkPortFree(t.Context(), port); err != nil {
		t.Fatalf("checkPortFree() error = %v, want nil", err)
	}
}

func TestCheckPortFreeRefusesAHeldPortAStoppedLocaltestPublished(t *testing.T) {
	t.Parallel()

	port, _ := listenOnLoopback(t)
	env := newPortTestEnv(t, containertypes.ContainerInfo{
		Ports: []containertypes.PublishedPort{{HostPort: port, ContainerPort: components.LocaltestServicePort}},
		State: containertypes.ContainerState{Status: "exited", Running: false},
	})

	if err := env.checkPortFree(t.Context(), port); !errors.Is(err, errPortInUse) {
		t.Fatalf("checkPortFree() error = %v, want errPortInUse", err)
	}
}

func TestCheckPortFreeRefusesAHeldPortTheRunningLocaltestDoesNotPublish(t *testing.T) {
	t.Parallel()

	port, _ := listenOnLoopback(t)
	env := newPortTestEnv(t, containertypes.ContainerInfo{
		Ports: []containertypes.PublishedPort{{HostPort: "8000", ContainerPort: components.LocaltestServicePort}},
		State: containertypes.ContainerState{Status: "running", Running: true},
	})

	if err := env.checkPortFree(t.Context(), port); !errors.Is(err, errPortInUse) {
		t.Fatalf("checkPortFree() error = %v, want errPortInUse", err)
	}
}

func TestCheckPortFreeAcceptsAFreePort(t *testing.T) {
	t.Parallel()

	port, release := listenOnLoopback(t)
	release()
	env := newPortTestEnv(t, containertypes.ContainerInfo{})

	if err := env.checkPortFree(t.Context(), port); err != nil {
		t.Fatalf("checkPortFree() error = %v, want nil", err)
	}
}

// listenOnLoopback holds a port on the published host address, as another program would, until release is called or
// the test ends.
func listenOnLoopback(t *testing.T) (string, func()) {
	t.Helper()
	var listenConfig net.ListenConfig
	listener, err := listenConfig.Listen(t.Context(), "tcp", net.JoinHostPort(components.PublishedHostIP, "0"))
	if err != nil {
		t.Fatalf("Listen() error = %v", err)
	}
	release := sync.OnceFunc(func() {
		if closeErr := listener.Close(); closeErr != nil {
			t.Errorf("Close() error = %v", closeErr)
		}
	})
	t.Cleanup(release)
	_, port, err := net.SplitHostPort(listener.Addr().String())
	if err != nil {
		t.Fatalf("SplitHostPort() error = %v", err)
	}
	return port, release
}

// newPortTestEnv is an Env whose localtest container inspects as localtest; the zero ContainerInfo means none.
// A localtest with a state but not running is a stopped container.
func newPortTestEnv(t *testing.T, localtest containertypes.ContainerInfo) *Env {
	t.Helper()
	client := mock.New()
	client.ContainerInspectFunc = func(_ context.Context, nameOrID string) (containertypes.ContainerInfo, error) {
		if nameOrID != components.ContainerLocaltest || localtest.State.Status == "" {
			return containertypes.ContainerInfo{}, containertypes.ErrContainerNotFound
		}
		return localtest, nil
	}
	return NewEnv(&config.Config{DataDir: t.TempDir()}, ui.NewOutput(io.Discard, io.Discard, false), client)
}

func TestValidatePublicPort(t *testing.T) {
	t.Parallel()

	for port, want := range map[int]error{
		0: errPortOutOfRange, 80: errPortOutOfRange, 1023: errPortOutOfRange, 1024: nil, 65535: nil,
		65536: errPortOutOfRange,
	} {
		if err := ValidatePublicPort(port, "--port"); !errors.Is(err, want) {
			t.Fatalf("ValidatePublicPort(%d) error = %v, want %v", port, err, want)
		}
	}
}

// The environment publishes on 127.0.0.1 only, so a program on another address of the same port leaves it free: the
// container runtime publishes beside it. On Linux the 0.0.0.0 bind fails beside such a program.
func TestCheckPortFreeAcceptsAPortHeldOnlyOnAnotherAddress(t *testing.T) {
	t.Parallel()

	var listenConfig net.ListenConfig
	listener, err := listenConfig.Listen(t.Context(), "tcp4", "127.0.0.2:0")
	if err != nil {
		t.Skipf("no second loopback address here: %v", err)
	}
	t.Cleanup(func() {
		if closeErr := listener.Close(); closeErr != nil {
			t.Errorf("Close() error = %v", closeErr)
		}
	})
	_, port, err := net.SplitHostPort(listener.Addr().String())
	if err != nil {
		t.Fatalf("SplitHostPort() error = %v", err)
	}
	env := newPortTestEnv(t, containertypes.ContainerInfo{})

	if err := env.checkPortFree(t.Context(), port); err != nil {
		t.Fatalf("checkPortFree() error = %v, want nil: 127.0.0.1:%s is free", err, port)
	}
}

// A program that listens on a port without naming an address usually gets a dual-stack IPv6 socket on [::] (Node's
// server.listen(port), for example), not an IPv4 one. env up must refuse that port too; this only discriminates on
// macOS and Windows, where IPv4 and IPv6 binds interact differently than on Linux.
func TestCheckPortFreeRefusesAPortAnotherProgramListensOnEveryIPv6Address(t *testing.T) {
	t.Parallel()

	var listenConfig net.ListenConfig
	listener, err := listenConfig.Listen(t.Context(), "tcp", "[::]:0")
	if err != nil {
		t.Skipf("no IPv6 here: %v", err)
	}
	t.Cleanup(func() {
		if closeErr := listener.Close(); closeErr != nil {
			t.Errorf("Close() error = %v", closeErr)
		}
	})
	_, port, err := net.SplitHostPort(listener.Addr().String())
	if err != nil {
		t.Fatalf("SplitHostPort() error = %v", err)
	}
	env := newPortTestEnv(t, containertypes.ContainerInfo{})

	if err := env.checkPortFree(t.Context(), port); !errors.Is(err, errPortInUse) {
		t.Fatalf("checkPortFree() error = %v, want errPortInUse for a port held on [::]", err)
	}
}

// A plain env up starts at the recorded port. 5300 is one env up would refuse, which shows the port it checked.
func TestUpChecksTheRecordedPort(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{DataDir: t.TempDir(), Images: testResetImages()}
	if err := WriteState(cfg, State{PublicPort: 5300}); err != nil {
		t.Fatalf("WriteState() error = %v", err)
	}
	env := NewEnv(cfg, ui.NewOutput(io.Discard, io.Discard, false), mock.New())

	if err := env.Up(t.Context(), envtypes.UpOptions{Detach: true}); !errors.Is(err, errPortPublished) {
		t.Fatalf("Up() error = %v, want the clash of the recorded 5300 with pdf3", err)
	}
}

// env up --port doesn't use env config's port, so a hand-edited setting outside the range must not refuse it: env up
// goes on to check the port it was given (5300, which pdf3 publishes, so that it stops there).
func TestUpWithPortDoesNotRefuseItForTheSetting(t *testing.T) {
	t.Parallel()

	home := t.TempDir()
	cfg := &config.Config{Home: home, DataDir: filepath.Join(home, "data"), Images: testResetImages()}
	if err := config.SaveSettings(cfg, config.Settings{Env: config.EnvSettings{Port: 80}}); err != nil {
		t.Fatalf("SaveSettings() error = %v", err)
	}
	env := NewEnv(cfg, ui.NewOutput(io.Discard, io.Discard, false), mock.New())

	err := env.Up(t.Context(), envtypes.UpOptions{Port: 5300, Detach: true})
	if !errors.Is(err, errPortPublished) {
		t.Fatalf("Up(--port 5300) error = %v, want the clash with pdf3, not the env config port", err)
	}
}

// The hint names env config only when the refused port came from it. 5300 is a port env up refuses.
func TestUpNamesEnvConfigOnlyForThePortItSets(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		setting     int
		port        int
		namesConfig bool
	}{
		{name: "the env config port", setting: 5300, port: 0, namesConfig: true},
		{name: "a --port", setting: 8100, port: 5300, namesConfig: false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			home := t.TempDir()
			cfg := &config.Config{Home: home, DataDir: filepath.Join(home, "data"), Images: testResetImages()}
			if err := config.SaveSettings(cfg, config.Settings{Env: config.EnvSettings{Port: tt.setting}}); err != nil {
				t.Fatalf("SaveSettings() error = %v", err)
			}
			env := NewEnv(cfg, ui.NewOutput(io.Discard, io.Discard, false), mock.New())

			err := env.Up(t.Context(), envtypes.UpOptions{Port: tt.port, Detach: true})
			if !errors.Is(err, errPortPublished) {
				t.Fatalf("Up() error = %v, want the clash with pdf3", err)
			}
			if got := strings.Contains(err.Error(), "env config set port"); got != tt.namesConfig {
				t.Fatalf("Up() error = %q, names env config = %t, want %t", err, got, tt.namesConfig)
			}
		})
	}
}
