package localtestv2_test

import (
	"testing"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/localtestv2"
)

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
	if topology, err := localtestv2.CurrentTopology(
		cfg,
	); err != nil ||
		topology.LocaltestURL() != "http://local.altinn.cloud:8000" {
		t.Fatalf("no state: %s, %v", topology.LocaltestURL(), err)
	}
	if err := localtestv2.WriteState(cfg, localtestv2.State{
		CertificateDir: "/certs", PublicHost: "origin.test", PublicPort: 18000,
	}); err != nil {
		t.Fatal(err)
	}
	topology, err := localtestv2.CurrentTopology(cfg)
	if err != nil {
		t.Fatal(err)
	}
	if topology.LocaltestURL() != "http://origin.test:18000" || topology.IngressPort() != "18000" ||
		topology.ArbeidsflateHostName() != "af.origin.test" {
		t.Errorf("topology at %s, port %s", topology.LocaltestURL(), topology.IngressPort())
	}
	if writeErr := localtestv2.WriteState(cfg, localtestv2.State{CertificateDir: "/certs"}); writeErr != nil {
		t.Fatal(writeErr)
	}
	state, _, err := localtestv2.ReadState(cfg)
	if err != nil || state.Origin().URL() != "http://local.altinn.cloud:8000" {
		t.Errorf("a state without an origin is at the default one: %s, %v", state.Origin().URL(), err)
	}
}
