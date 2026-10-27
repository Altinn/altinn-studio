package localtestv2

import (
	"bytes"
	"context"
	"errors"
	"io"
	"slices"
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/container/mock"
	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/localtestv2"
	"altinn.studio/studioctl/internal/localtestv2/manifest"
	"altinn.studio/studioctl/internal/ui"
)

func minimalOptions() *Options {
	opts := defaultOptions(testCertDir, testFilesDir)
	opts.Minimal = true
	return opts
}

var wantEmulated = []string{ //nolint:gochecknoglobals // A test fixture.
	"register", "profile", "authentication", "authorization", "access-management",
	"events", "resource-registry", "notifications", "pdf3",
}

func TestMinimalModeStartsTheMinimalGroupInStartOrder(t *testing.T) {
	t.Parallel()
	want := []string{"postgres", "storage", "localtest", "workflow-engine", "otel-files"}
	if got := selected(minimalOptions()); !slices.Equal(got, want) {
		t.Fatalf("selected() = %v, want %v", got, want)
	}
}

func TestTheEmulatedServicesAreTheDefaultGroupsOtherHTTPContainers(t *testing.T) {
	t.Parallel()
	if got := emulated(minimalOptions()); !slices.Equal(got, wantEmulated) {
		t.Fatalf("emulated() = %v, want %v", got, wantEmulated)
	}
	if got := emulated(defaultOptions(testCertDir, testFilesDir)); got != nil {
		t.Fatalf("emulated() outside minimal mode = %v", got)
	}
}

func TestMinimalModeAnnouncesTheEmulatedServicesAtTheFrontDoor(t *testing.T) {
	t.Parallel()
	for name, c := range containersOf(t, minimalOptions()) {
		env := envOf(c)
		for _, service := range wantEmulated {
			if got := env["services__"+service+"__http__0"]; got != "http://localtest:8080" {
				t.Errorf("%s: %s at %q", name, service, got)
			}
		}
		if got := env["services__storage__http__0"]; got != "http://storage:5010" {
			t.Errorf("%s: storage at %q", name, got)
		}
		if _, set := env["services__postgres__http__0"]; set {
			t.Errorf("%s: postgres announced as HTTP", name)
		}
		_, routes := env[appRoutesFileVariable]
		if routes != (name == frontDoor) {
			t.Errorf("%s: %s set = %v", name, appRoutesFileVariable, routes)
		}
		if routes && env[appRoutesFileVariable] != "" {
			t.Errorf("%s = %q, want empty", appRoutesFileVariable, env[appRoutesFileVariable])
		}
	}
	if _, set := envOf(containersOf(t, defaultOptions(testCertDir, testFilesDir))[frontDoor])[appRoutesFileVariable]; set {
		t.Errorf("the default stack sets %s", appRoutesFileVariable)
	}
}

func TestMinimalModeMountsTmpfsForEveryManifestVolume(t *testing.T) {
	t.Parallel()
	want := map[string][]types.VolumeMount{
		"postgres": {
			{ContainerPath: "/var/lib/postgresql", Type: types.VolumeMountTypeTmpfs, Options: "mode=1777"},
		},
		"storage": {
			{ContainerPath: "/data/blobs", Type: types.VolumeMountTypeTmpfs, Options: "size=1g,mode=1777"},
		},
		"localtest":       {{ContainerPath: "/data", Type: types.VolumeMountTypeTmpfs, Options: "mode=1777"}},
		"workflow-engine": nil,
		"otel-files":      nil,
	}
	for name, c := range containersOf(t, minimalOptions()) {
		var binds, rest []types.VolumeMount
		for _, v := range c.Volumes {
			// The certificate's two mounts; otel-files's files and its telemetry folder are its own tests'.
			if v.Type == types.VolumeMountTypeBind && v.ReadOnly && strings.HasPrefix(v.HostPath, testFilesDir) {
				continue
			}
			if v.Type == types.VolumeMountTypeBind && !v.ReadOnly && name == "otel-files" {
				continue
			}
			if v.Type == types.VolumeMountTypeBind {
				binds = append(binds, v)
			} else {
				rest = append(rest, v)
			}
		}
		if len(binds) != 2 {
			t.Errorf("%s: certificate mounts %v", name, binds)
		}
		if !slices.Equal(rest, want[name]) {
			t.Errorf("%s: volumes %v, want %v", name, rest, want[name])
		}
	}
}

func TestMinimalIsNotAnOptionalGroup(t *testing.T) {
	t.Parallel()
	if slices.Contains(OptionalGroups(), manifest.MinimalGroup) ||
		slices.Contains(GroupNames(), manifest.MinimalGroup) {
		t.Fatalf("optional groups %v name minimal", GroupNames())
	}
	if _, err := ResolveGroups([]string{manifest.MinimalGroup}, nil); !errors.Is(err, errMinimalGroup) {
		t.Fatalf("--with minimal: %v, want %v", err, errMinimalGroup)
	}
	everything, err := ResolveGroups([]string{GroupEverything}, nil)
	if err != nil || slices.Contains(everything, manifest.MinimalGroup) {
		t.Fatalf("everything = %v, %v", everything, err)
	}
}

func TestPreflightRefusesWhatMinimalModeCannotRun(t *testing.T) {
	t.Parallel()
	env := NewEnv(&config.Config{Home: t.TempDir(), DataDir: t.TempDir()}, nil, mock.New())
	cases := map[string]struct {
		err  error
		text string
		opts UpOptions
	}{
		"with": {
			opts: UpOptions{Minimal: true, With: []string{"receipt"}},
			err:  errMinimalWithGroups,
			text: "drop --minimal",
		},
		"monitoring": {
			opts: UpOptions{Minimal: true, With: []string{"monitoring"}},
			err:  errMinimalWithGroups,
			text: "drop --minimal",
		},
		"without": {
			opts: UpOptions{Minimal: true, Without: []string{"receipt"}},
			err:  errMinimalWithGroups,
			text: "optional groups of the default stack",
		},
		"an emulated dev build": {
			opts: UpOptions{Minimal: true, DevComponents: map[string]string{"register": ""}},
			err:  errMinimalDev,
			text: "--dev-register: register is emulated in the localtest container in minimal mode",
		},
		"an optional group's dev build": {
			opts: UpOptions{Minimal: true, DevComponents: map[string]string{"redis": ""}},
			err:  errMinimalDev,
			text: "minimal mode starts only postgres, storage, localtest, workflow-engine",
		},
	}
	for name, c := range cases {
		err := env.Preflight(t.Context(), c.opts)
		if !errors.Is(err, c.err) || !strings.Contains(err.Error(), c.text) {
			t.Errorf("%s: %v, want %v with %q", name, err, c.err, c.text)
		}
	}
}

func TestMinimalModeBuildsItsOwnContainersFromSource(t *testing.T) {
	t.Parallel()
	for _, name := range []string{"postgres", "storage", "workflow-engine", "localtest"} {
		opts := UpOptions{Minimal: true, DevComponents: map[string]string{name: ""}}
		if err := checkMinimal(opts); err != nil {
			t.Errorf("--dev-%s: %v", name, err)
		}
	}
	if err := checkMinimal(UpOptions{With: []string{"receipt"}}); err != nil {
		t.Errorf("--with without --minimal: %v", err)
	}
}

func writeTestState(t *testing.T, cfg *config.Config, minimal bool) {
	t.Helper()
	if err := localtestv2.WriteState(cfg, localtestv2.State{
		CertificateDir: localtestv2.CertificateDir(cfg),
		Groups:         nil,
		Dev:            nil,
		LatestImages:   false,
		Minimal:        minimal,
	}); err != nil {
		t.Fatal(err)
	}
}

func testConfig(t *testing.T) *config.Config {
	t.Helper()
	home := t.TempDir()
	return &config.Config{Home: home, SocketDir: home, DataDir: t.TempDir()}
}

func TestAModeSwitchChangesTheRunningEnvironment(t *testing.T) {
	t.Parallel()
	cfg := testConfig(t)
	writeTestState(t, cfg, false)
	env := NewEnv(cfg, nil, nil)
	if changed, err := env.Changed(UpOptions{Minimal: true}); err != nil || !changed {
		t.Errorf("default to minimal: %v, %v", changed, err)
	}
	writeTestState(t, cfg, true)
	if changed, err := env.Changed(UpOptions{Minimal: true}); err != nil || changed {
		t.Errorf("minimal to minimal: %v, %v", changed, err)
	}
	if changed, err := env.Changed(UpOptions{}); err != nil || !changed {
		t.Errorf("minimal to default: %v, %v", changed, err)
	}
}

func TestAnUpInTheSameModeDoesNotStopTheEnvironment(t *testing.T) {
	t.Parallel()
	cfg := testConfig(t)
	writeTestState(t, cfg, true)
	client := mock.New()
	minimal := defaultOptions("", "")
	minimal.Minimal = true
	if err := NewEnv(cfg, nil, client).stopOnSwitch(t.Context(), minimal); err != nil {
		t.Fatal(err)
	}
	if len(client.Calls) != 0 {
		t.Fatalf("the same mode looked at the containers: %v", client.Calls)
	}
	if err := NewEnv(cfg, nil, client).stopOnSwitch(t.Context(), defaultOptions("", "")); err != nil {
		t.Fatal(err)
	}
	if len(client.Calls) == 0 {
		t.Fatal("a mode switch did not look for the running containers")
	}
}

func TestTheStatusOfMinimalModeNamesTheModeAndTheEmulatedServices(t *testing.T) {
	t.Parallel()
	cfg := testConfig(t)
	writeTestState(t, cfg, true)
	status, err := NewEnv(cfg, nil, mock.New()).Status(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	if status.Mode != ModeMinimal || !slices.Equal(status.Emulated, wantEmulated) || len(status.Containers) != 5 {
		t.Fatalf("status %+v", status)
	}

	writeTestState(t, cfg, false)
	status, err = NewEnv(cfg, nil, mock.New()).Status(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if status.Mode != "" || status.Emulated != nil {
		t.Fatalf("default stack status %+v", status)
	}
}

func volumeRemovals(client *mock.Client) []string {
	var out []string
	for _, call := range client.Calls {
		if call.Method == "VolumeRemove" {
			if name, ok := call.Args[0].(string); ok {
				out = append(out, name)
			}
		}
	}
	return out
}

func TestResetInMinimalModeRemovesNoVolume(t *testing.T) {
	t.Parallel()
	cfg := testConfig(t)
	writeTestState(t, cfg, true)
	client := mock.New()
	var out bytes.Buffer
	if err := NewEnv(cfg, ui.NewOutput(&out, io.Discard, false), client).Reset(t.Context()); err != nil {
		t.Fatal(err)
	}
	if removed := volumeRemovals(client); len(removed) != 0 {
		t.Fatalf("removed %v", removed)
	}
	if !strings.Contains(out.String(), "minimal mode keeps no data; nothing to reset") {
		t.Fatalf("output %q", out.String())
	}
	if _, up, err := localtestv2.ReadState(cfg); err != nil || up {
		t.Fatalf("state left: %v, %v", up, err)
	}

	writeTestState(t, cfg, false)
	client = mock.New()
	if err := NewEnv(cfg, ui.NewOutput(io.Discard, io.Discard, false), client).Reset(t.Context()); err != nil {
		t.Fatal(err)
	}
	if removed := volumeRemovals(client); !slices.Equal(removed, volumeNames()) {
		t.Fatalf("the default stack's reset removed %v, want %v", removed, volumeNames())
	}
}
