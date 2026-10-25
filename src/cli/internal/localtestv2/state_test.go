package localtestv2_test

import (
	"context"
	"errors"
	"testing"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/devenv/pkg/container/mock"
	"altinn.studio/devenv/pkg/container/types"
	containerbackend "altinn.studio/devenv/pkg/resource/executor/container"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/localtestv2"
)

// defaultOrigin is the manifest's public origin.
const defaultOrigin = "http://local.altinn.cloud:8000"

var errNotAsked = errors.New("the container runtime was asked")

// containers is a container runtime where a localtest-v2 container runs or none does.
func containers(running bool) localtestv2.ContainerClientFunc {
	return func(context.Context) (container.ContainerClient, error) {
		client := mock.New()
		client.ListContainersFunc = func(_ context.Context, filter types.ContainerListFilter) ([]types.ContainerInfo, error) {
			if !running || filter.Labels[containerbackend.GraphIDLabel] != localtestv2.GraphID {
				return nil, nil
			}
			return []types.ContainerInfo{
				{Name: "localtest-v2-localtest", State: types.ContainerState{Running: true}},
			}, nil
		}
		return client, nil
	}
}

func TestReadStateOnFreshDataDir(t *testing.T) {
	t.Parallel()
	cfg := &config.Config{DataDir: t.TempDir()}
	_, up, err := localtestv2.ReadState(cfg)
	if err != nil {
		t.Fatal(err)
	}
	if up {
		t.Fatal("no state was written, so the runtime is not up")
	}
}

func TestStateRoundTrip(t *testing.T) {
	t.Parallel()
	cfg := &config.Config{DataDir: t.TempDir()}
	want := localtestv2.State{
		CertificateDir: localtestv2.CertificateDir(cfg),
		Groups:         []string{"dialogporten", "receipt"},
	}
	if err := localtestv2.WriteState(cfg, want); err != nil {
		t.Fatal(err)
	}

	got, up, err := localtestv2.ReadState(cfg)
	if err != nil {
		t.Fatal(err)
	}
	if !up {
		t.Fatal("state was written, so the runtime is up")
	}
	if got.CertificateDir != want.CertificateDir || len(got.Groups) != 2 || got.Groups[1] != "receipt" {
		t.Errorf("got %+v, want %+v", got, want)
	}
	if got.CertificatePath() != want.CertificateDir+"/"+localtestv2.CertificateFileName {
		t.Errorf("certificate path = %q", got.CertificatePath())
	}
}

func TestRemoveStateIsIdempotent(t *testing.T) {
	t.Parallel()
	cfg := &config.Config{DataDir: t.TempDir()}
	if err := localtestv2.WriteState(cfg, localtestv2.State{CertificateDir: "/certs", Groups: nil}); err != nil {
		t.Fatal(err)
	}
	for range 2 {
		if err := localtestv2.RemoveState(cfg); err != nil {
			t.Fatal(err)
		}
	}
	if _, up, err := localtestv2.ReadState(cfg); err != nil || up {
		t.Fatalf("after remove: up=%v err=%v", up, err)
	}
}

func TestTheStateRecordsTheOriginAndTheTopologyFollowsIt(t *testing.T) {
	t.Parallel()
	cfg := &config.Config{DataDir: t.TempDir()}
	if v2, err := localtestv2.Current(
		t.Context(), cfg, containers(true),
	); err != nil ||
		v2.Topology().LocaltestURL() != defaultOrigin {
		t.Fatalf("no state: %s, %v", v2.Topology().LocaltestURL(), err)
	}
	if err := localtestv2.WriteState(cfg, localtestv2.State{
		CertificateDir: "/certs", PublicHost: "origin.test", PublicPort: 18000,
	}); err != nil {
		t.Fatal(err)
	}
	v2, err := localtestv2.Current(t.Context(), cfg, containers(true))
	if err != nil {
		t.Fatal(err)
	}
	topology := v2.Topology()
	if topology.LocaltestURL() != "http://origin.test:18000" || topology.IngressPort() != "18000" ||
		topology.ArbeidsflateHostName() != "af.origin.test" {
		t.Errorf("topology at %s, port %s", topology.LocaltestURL(), topology.IngressPort())
	}
	if writeErr := localtestv2.WriteState(cfg, localtestv2.State{CertificateDir: "/certs"}); writeErr != nil {
		t.Fatal(writeErr)
	}
	state, _, err := localtestv2.ReadState(cfg)
	if err != nil || state.Origin().URL() != defaultOrigin {
		t.Errorf("a state without an origin is at the default one: %s, %v", state.Origin().URL(), err)
	}
}

// A state file whose containers are gone (a reboot, a docker rm) is a stopped environment: it is at the default
// origin, and stale.
func TestAStateFileWithoutContainersIsNotRunning(t *testing.T) {
	t.Parallel()
	cfg := &config.Config{DataDir: t.TempDir()}
	if err := localtestv2.WriteState(cfg, localtestv2.State{
		CertificateDir: "/certs", PublicHost: "origin.test", PublicPort: 18000,
	}); err != nil {
		t.Fatal(err)
	}
	v2, err := localtestv2.Current(t.Context(), cfg, containers(false))
	if err != nil {
		t.Fatal(err)
	}
	if v2.Running || !v2.Recorded {
		t.Fatalf("got %+v, want a recorded environment that does not run", v2)
	}
	if v2.State.PublicPort != 18000 {
		t.Errorf("the started configuration is kept: %+v", v2.State)
	}
	if got := v2.Topology().LocaltestURL(); got != defaultOrigin {
		t.Errorf("topology at %s, want the default origin", got)
	}
}

// Without a state file the container runtime is not asked, so a machine without one runs apps as before.
func TestWithoutAStateFileTheContainerRuntimeIsNotAsked(t *testing.T) {
	t.Parallel()
	cfg := &config.Config{DataDir: t.TempDir()}
	v2, err := localtestv2.Current(t.Context(), cfg, func(context.Context) (container.ContainerClient, error) {
		t.Error(errNotAsked)
		return nil, errNotAsked
	})
	if err != nil || v2.Recorded || v2.Running {
		t.Fatalf("got %+v, %v, want nothing recorded", v2, err)
	}
}
