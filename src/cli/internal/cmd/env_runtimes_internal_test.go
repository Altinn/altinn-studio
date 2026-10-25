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
	widgets int
	up      envtypes.UpOptions
	verbose bool
	started bool
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

func (e *fakeRuntimeEnv) Name() string                         { return fakeRuntimeName }
func (e *fakeRuntimeEnv) Active(context.Context) (bool, error) { return false, nil }
func (e *fakeRuntimeEnv) Down(context.Context) error           { return nil }

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
	return &EnvCommand{
		cfg: testEnvCommandConfig(t),
		out: ui.NewOutput(out, io.Discard, false),
		newRuntimes: func(cfg *config.Config) []envtypes.Runtime {
			return []envtypes.Runtime{envlocaltest.NewRuntime(cfg), fake}
		},
	}, fake
}

func TestEnvUpStartsTheChosenRuntimeWithItsOwnFlags(t *testing.T) {
	t.Parallel()
	var out bytes.Buffer
	command, fake := commandWithFakeRuntime(t, &out)

	flags, _, err := command.parseUpFlags(
		t.Context(),
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

	_, _, err := command.parseUpFlags(t.Context(), []string{"--widgets", "3"})
	want := "--widgets is not supported by the localtest runtime (it is other's)"
	if !errors.Is(err, ErrInvalidFlagValue) || !strings.Contains(err.Error(), want) {
		t.Fatalf("parseUpFlags() = %v, want %q", err, want)
	}
	if _, _, err := command.parseUpFlags(t.Context(), []string{"--nosuch"}); err == nil ||
		errors.Is(err, ErrInvalidFlagValue) {
		t.Fatalf("parseUpFlags(--nosuch) = %v, want a plain undefined flag", err)
	}
}

func TestEnvUsageHasASectionPerRuntime(t *testing.T) {
	t.Parallel()
	var out bytes.Buffer
	command, _ := commandWithFakeRuntime(t, &out)

	if _, shown, err := command.parseUpFlags(t.Context(), []string{"--help"}); err != nil || !shown {
		t.Fatalf("parseUpFlags(--help) = %v, %v", shown, err)
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
