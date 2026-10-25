package cmd

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"flag"
	"io"
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/devenv/pkg/container/mock"
	envtypes "altinn.studio/studioctl/internal/cmd/env"
	envlocaltest "altinn.studio/studioctl/internal/cmd/env/localtest"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/ui"
)

// fakeRuntime is a second runtime beside localtest, with a flag of its own and one localtest also has.
type fakeRuntime struct {
	env *fakeRuntimeEnv
}

type fakeRuntimeEnv struct {
	widgets     int
	activeCalls int
	up          envtypes.UpOptions
	verbose     bool
	started     bool
	active      bool
}

const fakeRuntimeName = "other"

func newFakeRuntime() *fakeRuntime {
	return &fakeRuntime{env: &fakeRuntimeEnv{}}
}

func (r *fakeRuntime) Name() string      { return fakeRuntimeName }
func (r *fakeRuntime) UpUsage() []string { return []string{"  --widgets N      How many widgets"} }

func (r *fakeRuntime) BindUpFlags(fs *flag.FlagSet) {
	fs.IntVar(&r.env.widgets, "widgets", 0, "How many widgets")
	// The same name as a localtest flag, with this runtime's own meaning.
	fs.BoolVar(&r.env.verbose, "monitoring", false, "Talk more")
}

func (r *fakeRuntime) Env(container.ContainerClient, *ui.Output) envtypes.Env { return r.env }

func (e *fakeRuntimeEnv) Name() string { return fakeRuntimeName }
func (e *fakeRuntimeEnv) Active(context.Context) (bool, error) {
	e.activeCalls++
	return e.active, nil
}
func (e *fakeRuntimeEnv) Down(context.Context) error { return nil }

func (e *fakeRuntimeEnv) Up(_ context.Context, opts envtypes.UpOptions) (envtypes.UpResult, error) {
	e.up = opts
	e.started = true
	return envtypes.UpResult{AlreadyRunning: false}, nil
}

func (e *fakeRuntimeEnv) Status(context.Context) (*envtypes.Status, error) {
	return &envtypes.Status{Containers: []envtypes.ContainerStatus{}}, nil
}

func (e *fakeRuntimeEnv) Logs(context.Context, envtypes.LogsOptions) error { return nil }

func commandWithFakeRuntime(t *testing.T, out io.Writer) (*EnvCommand, *fakeRuntime) {
	t.Helper()
	fake := newFakeRuntime()
	command := testEnvCommand(t, out)
	command.newRuntimes = func(cfg *config.Config) []envtypes.Runtime {
		return []envtypes.Runtime{envlocaltest.NewRuntime(cfg), fake}
	}
	return command, fake
}

func TestEnvUpStartsTheChosenRuntimeWithItsOwnFlags(t *testing.T) {
	t.Parallel()
	var out bytes.Buffer
	command, fake := commandWithFakeRuntime(t, &out)

	flags, err := command.parseUpFlags(
		t.Context(),
		mock.New(),
		[]string{"-r", fakeRuntimeName, "--widgets", "3", "--monitoring", "--json"},
	)
	if err != nil {
		t.Fatalf("parseUpFlags() error = %v", err)
	}
	if err := command.up(t.Context(), mock.New(), flags); err != nil {
		t.Fatalf("up() error = %v", err)
	}
	if !fake.env.started || fake.env.widgets != 3 || !fake.env.verbose || !fake.env.up.Detach {
		t.Fatalf("fake env = %+v, want started with --widgets 3, its own --monitoring and the shared detach", fake.env)
	}
	var got envUpOutput
	if err := json.Unmarshal(bytes.TrimSpace(out.Bytes()), &got); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if got.Runtime != fakeRuntimeName || !got.Started || got.AlreadyRunning {
		t.Fatalf("output = %+v, want the other runtime started", got)
	}
}

func TestEnvUpNamesTheRuntimeAForeignFlagBelongsTo(t *testing.T) {
	t.Parallel()
	command, _ := commandWithFakeRuntime(t, io.Discard)

	_, err := command.parseUpFlags(t.Context(), mock.New(), []string{"--widgets", "3"})
	want := "--widgets is not supported by the localtest runtime (it is other's)"
	if !errors.Is(err, ErrInvalidFlagValue) || !strings.Contains(err.Error(), want) {
		t.Fatalf("parseUpFlags() = %v, want %q", err, want)
	}
	if _, err := command.parseUpFlags(t.Context(), mock.New(), []string{"--nosuch"}); err == nil ||
		errors.Is(err, ErrInvalidFlagValue) {
		t.Fatalf("parseUpFlags(--nosuch) = %v, want a plain undefined flag", err)
	}
}

func TestEnvUsageHasASectionPerRuntime(t *testing.T) {
	t.Parallel()
	var out bytes.Buffer
	command, _ := commandWithFakeRuntime(t, &out)

	if err := command.runUp(t.Context(), []string{"--help"}); err != nil {
		t.Fatalf("runUp(--help) = %v", err)
	}
	for _, want := range []string{
		"Runtime: localtest or other (default: the one running, else localtest)",
		"Options for 'env up -r localtest':",
		"Options for 'env up -r other':",
		"--widgets N",
	} {
		if !strings.Contains(out.String(), want) {
			t.Errorf("help without %q:\n%s", want, out.String())
		}
	}
}

func TestEnvStatusAndResetReachEveryRuntime(t *testing.T) {
	t.Parallel()
	command, _ := commandWithFakeRuntime(t, io.Discard)

	env, err := command.env(fakeRuntimeName, mock.New(), command.out)
	if err != nil {
		t.Fatalf("env() error = %v", err)
	}
	if _, err := env.Status(t.Context()); err != nil {
		t.Fatalf("Status() error = %v", err)
	}
	if _, isResetter := env.(envtypes.Resetter); isResetter {
		t.Fatal("the fake runtime resets, want a runtime without reset")
	}
	if _, err := command.env("nosuch", mock.New(), command.out); !errors.Is(err, ErrUnsupportedRuntime) {
		t.Fatalf("env(nosuch) = %v, want ErrUnsupportedRuntime", err)
	}
}

func TestEnvUpRefusesTwoDifferentRuntimes(t *testing.T) {
	t.Parallel()
	command, fake := commandWithFakeRuntime(t, io.Discard)

	err := command.Run(t.Context(), []string{"up", "-r", envlocaltest.Name, "-r", fakeRuntimeName, "--widgets", "3"})
	want := `-r is given as both "localtest" and "other"`
	if !errors.Is(err, ErrInvalidFlagValue) || !strings.Contains(err.Error(), want) {
		t.Fatalf("Run(up -r localtest -r other) = %v, want %q", err, want)
	}
	if fake.env.started {
		t.Fatal("the other runtime started")
	}
	if _, err := command.parseUpFlags(
		t.Context(), mock.New(), []string{"-r", fakeRuntimeName, "--runtime", fakeRuntimeName},
	); err != nil {
		t.Fatalf("parseUpFlags(-r other --runtime other) = %v, want the same runtime twice accepted", err)
	}
	// The flag package stops at the first argument that is not a flag, so it does not read this -r.
	if _, err := command.parseUpFlags(
		t.Context(), mock.New(), []string{"stray", "-r", fakeRuntimeName},
	); !errors.Is(err, ErrInvalidFlagValue) {
		t.Fatalf("parseUpFlags(stray -r other) = %v, want ErrInvalidFlagValue", err)
	}
}

func TestEnvUpWithoutRuntimeConnectsAndChecksTheRuntimesOnce(t *testing.T) {
	t.Parallel()
	command, fake := commandWithFakeRuntime(t, io.Discard)
	fake.env.active = true
	connections := 0
	command.containerClient = func(context.Context) (container.ContainerClient, error) {
		connections++
		return mock.New(), nil
	}

	if err := command.Run(t.Context(), []string{"up", "--widgets", "2"}); err != nil {
		t.Fatalf("Run(up --widgets 2) = %v", err)
	}
	if !fake.env.started || fake.env.widgets != 2 {
		t.Fatalf("fake env = %+v, want the running runtime started with its own flag", fake.env)
	}
	if connections != 1 || fake.env.activeCalls != 1 {
		t.Fatalf("connections = %d, Active calls = %d, want 1 and 1", connections, fake.env.activeCalls)
	}
}

func TestEnvUpWithRuntimeChecksNoOtherRuns(t *testing.T) {
	t.Parallel()
	command, fake := commandWithFakeRuntime(t, io.Discard)
	fake.env.active = true

	err := command.Run(t.Context(), []string{"up", "-r", envlocaltest.Name})
	if !errors.Is(err, envtypes.ErrOtherRuntimeActive) {
		t.Fatalf("Run(up -r localtest) = %v, want ErrOtherRuntimeActive", err)
	}
}

func TestEnvResetRefusesARuntimeWithoutResetBeforeItPrompts(t *testing.T) {
	t.Parallel()
	command, _ := commandWithFakeRuntime(t, io.Discard)

	// Without --yes and without a terminal, the prompt would fail with ErrInvalidFlagValue.
	err := command.Run(t.Context(), []string{"reset", "-r", fakeRuntimeName})
	if !errors.Is(err, errResetUnsupported) {
		t.Fatalf("Run(reset -r other) = %v, want errResetUnsupported before the prompt", err)
	}
}

func TestUndefinedFlagErrorText(t *testing.T) {
	t.Parallel()
	fs := flag.NewFlagSet("test", flag.ContinueOnError)
	fs.SetOutput(io.Discard)

	err := fs.Parse([]string{"--nosuch"})
	if err == nil || !strings.HasPrefix(err.Error(), undefinedFlagPrefix) {
		t.Fatalf("Parse(--nosuch) = %v, want it to start with %q", err, undefinedFlagPrefix)
	}
}
