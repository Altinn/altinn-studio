package localtestv2

import (
	"context"
	"errors"
	"fmt"
	"net"
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/container/mock"
	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/studioctl/internal/localtestv2"
)

var (
	errNoSuchHost = errors.New("no such host")
	errApply      = errors.New("start environment")
)

func TestTheRequestedOriginKeepsTheRunningOneUnlessTheFlagsSayOtherwise(t *testing.T) {
	t.Parallel()
	running := localtestv2.State{CertificateDir: "/c", PublicHost: "origin.test", PublicPort: 18000}
	type testCase struct {
		name     string
		wantHost string
		opts     UpOptions
		state    localtestv2.State
		wantPort int
		up       bool
		changed  bool
	}
	tc := func(
		name string, opts UpOptions, state localtestv2.State, up bool, host string, port int, changed bool,
	) testCase {
		return testCase{
			name: name, opts: opts, state: state, up: up, wantHost: host, wantPort: port, changed: changed,
		}
	}
	cases := []testCase{
		tc("no state, no flags", UpOptions{}, localtestv2.State{}, false, "local.altinn.cloud", 8000, false),
		tc("no state, --port 0 picks", UpOptions{PublicPort: new(0)}, localtestv2.State{}, false,
			"local.altinn.cloud", 0, false),
		tc("no state, both flags", UpOptions{PublicHost: "altinn.test", PublicPort: new(18001)},
			localtestv2.State{}, false, "altinn.test", 18001, false),
		tc("running, no flags keeps it", UpOptions{}, running, true, "origin.test", 18000, false),
		tc("running, --port 0 keeps its port", UpOptions{PublicPort: new(0)}, running, true,
			"origin.test", 18000, false),
		tc("running, the same values", UpOptions{PublicHost: "origin.test", PublicPort: new(18000)}, running,
			true, "origin.test", 18000, false),
		tc(
			"running, another port",
			UpOptions{PublicPort: new(8000)},
			running,
			true,
			"origin.test",
			8000,
			true,
		),
		tc("running, another host", UpOptions{PublicHost: "local.altinn.cloud"}, running, true,
			"local.altinn.cloud", 18000, true),
		tc("running at the default, a host", UpOptions{PublicHost: "origin.test"},
			localtestv2.State{CertificateDir: "/c"}, true, "origin.test", 8000, true),
	}
	for _, c := range cases {
		host, p := requestedOrigin(c.opts, c.state, c.up, c.up)
		if host != c.wantHost || p != c.wantPort {
			t.Errorf("%s: %s:%d, want %s:%d", c.name, host, p, c.wantHost, c.wantPort)
		}
		if got := originChanged(c.opts, c.state, c.up); got != c.changed {
			t.Errorf("%s: changed %v, want %v", c.name, got, c.changed)
		}
	}
}

func TestAnUpAtAnotherOriginChangesTheRunningEnvironment(t *testing.T) {
	t.Parallel()
	cfg := testConfig(t)
	writeTestState(t, cfg, false)
	env := newTestEnv(cfg, nil, nil)
	if changed, err := env.Changed(UpOptions{}); err != nil || changed {
		t.Errorf("the same origin: %v, %v", changed, err)
	}
	if changed, err := env.Changed(UpOptions{PublicPort: new(18000)}); err != nil || !changed {
		t.Errorf("another port: %v, %v", changed, err)
	}
	if changed, err := env.Changed(UpOptions{PublicPort: new(0)}); err != nil || changed {
		t.Errorf("--port 0 on a running environment: %v, %v", changed, err)
	}
}

func TestAnOriginSwitchStopsTheRunningEnvironment(t *testing.T) {
	t.Parallel()
	cfg := testConfig(t)
	writeTestState(t, cfg, false)
	client := mock.New()
	if err := newTestEnv(cfg, nil, client).stopOnSwitch(t.Context(), defaultOptions("", "")); err != nil {
		t.Fatal(err)
	}
	if len(client.Calls) != 0 {
		t.Fatalf("the same origin looked at the containers: %v", client.Calls)
	}
	custom := defaultOptions("", "")
	custom.Origin = stack().Origin("origin.test", 18000)
	if err := newTestEnv(cfg, nil, client).stopOnSwitch(t.Context(), custom); err != nil {
		t.Fatal(err)
	}
	if len(client.Calls) == 0 {
		t.Fatal("an origin switch did not look for the running containers")
	}
}

func TestTheOriginFlagsAreChecked(t *testing.T) {
	t.Parallel()
	for _, opts := range []UpOptions{
		{PublicHost: "Origin.Test"},
		{PublicHost: "origin.test:18000"},
		{PublicHost: "127.0.0.1"},
		{PublicPort: new(-1)},
		{PublicPort: new(70000)},
	} {
		if err := checkOriginFlags(opts); !errors.Is(err, errOriginFlag) {
			t.Errorf("%+v: %v", opts, err)
		}
	}
	for _, opts := range []UpOptions{{}, {PublicHost: "origin.test", PublicPort: new(0)}, {PublicPort: new(1)}} {
		if err := checkOriginFlags(opts); err != nil {
			t.Errorf("%+v: %v", opts, err)
		}
	}
}

func TestACustomHostMustResolveToThisMachine(t *testing.T) {
	t.Parallel()
	resolved := map[string][]string{
		"origin.test":     {"127.0.0.1", "::1"},
		"pdf.origin.test": {"127.0.0.1"},
		"af.origin.test":  {"192.168.1.10"},
	}
	lookup := func(_ context.Context, host string) ([]string, error) {
		if addresses, ok := resolved[host]; ok {
			return addresses, nil
		}
		return nil, errNoSuchHost
	}
	err := checkResolution(t.Context(), lookup, stack().Origin("origin.test", 18000))
	if !errors.Is(err, errUnresolved) {
		t.Fatalf("%v, want an unresolved error", err)
	}
	const line = "\n127.0.0.1 workflow-engine.origin.test app-frontend.origin.test af.origin.test"
	if !strings.HasSuffix(err.Error(), line) {
		t.Errorf("%q does not end with the hosts-file line %q", err, line)
	}
	for _, host := range []string{"workflow-engine.origin.test", "app-frontend.origin.test", "af.origin.test"} {
		resolved[host] = []string{"127.0.0.1"}
	}
	if err := checkResolution(t.Context(), lookup, stack().Origin("origin.test", 18000)); err != nil {
		t.Errorf("every name resolves: %v", err)
	}
	if err := checkResolution(t.Context(), lookup, stack().DefaultOrigin()); err != nil {
		t.Errorf("the default host is not checked here: %v", err)
	}
}

func TestPortZeroPicksAFreePortAndTheStateRecordsIt(t *testing.T) {
	t.Parallel()
	cfg := testConfig(t)
	env := newTestEnv(cfg, nil, mock.New())
	opts, err := env.options(t.Context(), UpOptions{PublicHost: "origin.test", PublicPort: new(0)})
	if err != nil {
		t.Fatal(err)
	}
	if opts.Origin.Host != "origin.test" || opts.Origin.Port <= 0 || opts.Origin.Port == 8000 {
		t.Fatalf("origin %s", opts.Origin.URL())
	}
	if writeErr := localtestv2.WriteState(cfg, localtestv2.State{
		CertificateDir: opts.CertDir, PublicHost: opts.Origin.Host, PublicPort: opts.Origin.Port,
	}); writeErr != nil {
		t.Fatal(writeErr)
	}
	current, err := env.currentOptions()
	if err != nil {
		t.Fatal(err)
	}
	if current.Origin.URL() != opts.Origin.URL() {
		t.Errorf("status and down see %s, up started %s", current.Origin.URL(), opts.Origin.URL())
	}
}

// A --port 0 keeps the recorded port only while the front door runs on it; a state whose start never bound its port
// (taken by another process) or whose containers are gone picks a new free port. An explicit port is always taken.
func TestPortZeroKeepsTheRecordedPortOnlyWhileTheFrontDoorRuns(t *testing.T) {
	t.Parallel()
	recorded := localtestv2.State{CertificateDir: "/c", PublicHost: "origin.test", PublicPort: 18000}
	cases := []struct {
		name     string
		opts     UpOptions
		wantPort int
		up       bool
		running  bool
	}{
		{"recorded and running: keep", UpOptions{PublicPort: new(0)}, 18000, true, true},
		{"recorded, front door not running: pick", UpOptions{PublicPort: new(0)}, 0, true, false},
		{"nothing recorded: pick", UpOptions{PublicPort: new(0)}, 0, false, false},
		{"recorded, not running, no --port: the recorded port", UpOptions{}, 18000, true, false},
		{"an explicit port is taken as given", UpOptions{PublicPort: new(18001)}, 18001, true, false},
	}
	for _, c := range cases {
		host, p := requestedOrigin(c.opts, recorded, c.up, c.running)
		if p != c.wantPort {
			t.Errorf("%s: port %d, want %d", c.name, p, c.wantPort)
		}
		if c.up && host != "origin.test" {
			t.Errorf("%s: host %s, want the recorded one", c.name, host)
		}
	}
}

func TestASecondPortZeroPicksAgainUnlessTheFrontDoorRuns(t *testing.T) {
	t.Parallel()
	// Hold the recorded port, so a fresh pick cannot be the same port by chance.
	var lc net.ListenConfig
	held, err := lc.Listen(t.Context(), "tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { ignoreError(held.Close()) })
	addr, ok := held.Addr().(*net.TCPAddr)
	if !ok {
		t.Fatalf("listener address %v", held.Addr())
	}
	recordedPort := addr.Port
	cfg := testConfig(t)
	if writeErr := localtestv2.WriteState(
		cfg,
		localtestv2.State{CertificateDir: "/c", PublicPort: recordedPort},
	); writeErr != nil {
		t.Fatal(writeErr)
	}

	gone := newTestEnv(cfg, nil, mock.New())
	picked, err := gone.options(t.Context(), UpOptions{PublicPort: new(0)})
	if err != nil || picked.Origin.Port == recordedPort || picked.Origin.Port <= 0 {
		t.Errorf("front door not running: port %d (%v), want a new one, not %d", picked.Origin.Port, err, recordedPort)
	}

	client := mock.New()
	client.ContainerInspectFunc = func(_ context.Context, name string) (types.ContainerInfo, error) {
		if name != containerOf(frontDoor) {
			return types.ContainerInfo{}, types.ErrContainerNotFound
		}
		var info types.ContainerInfo
		info.State.Running = true
		return info, nil
	}
	kept, err := newTestEnv(cfg, nil, client).options(t.Context(), UpOptions{PublicPort: new(0)})
	if err != nil || kept.Origin.Port != recordedPort {
		t.Errorf("front door running: port %d (%v), want the recorded %d", kept.Origin.Port, err, recordedPort)
	}
}

func TestATakenPortIsRecognised(t *testing.T) {
	t.Parallel()
	for text, want := range map[string]bool{
		"start container localtest-v2-localtest: rootlessport listen tcp 0.0.0.0:18000: bind: address already in use": true,
		"Bind for 0.0.0.0:8000 failed: port is already allocated":                                                     true,
		"pull image: manifest unknown": false,
	} {
		if got := portTaken(fmt.Errorf("%w: %s", errApply, text)); got != want {
			t.Errorf("portTaken(%q) = %v, want %v", text, got, want)
		}
	}
	if portTaken(nil) {
		t.Error("portTaken(nil)")
	}
}
