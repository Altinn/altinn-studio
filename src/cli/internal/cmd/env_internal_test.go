package cmd

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/devenv/pkg/container/mock"
	containertypes "altinn.studio/devenv/pkg/container/types"
	containerbackend "altinn.studio/devenv/pkg/resource/executor/container"
	envlocaltest "altinn.studio/studioctl/internal/cmd/env/localtest"
	"altinn.studio/studioctl/internal/cmd/env/localtest/components"
	envlocaltestv2 "altinn.studio/studioctl/internal/cmd/env/localtestv2"
	envregistry "altinn.studio/studioctl/internal/cmd/env/registry"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

func TestEnvUpJSON_AlreadyRunning(t *testing.T) {
	t.Parallel()

	client := mock.New()
	client.ContainerInspectFunc = func(_ context.Context, nameOrID string) (containertypes.ContainerInfo, error) {
		switch nameOrID {
		case components.ContainerLocaltest,
			components.ContainerPDF3,
			components.ContainerWorkflowEngineDb,
			components.ContainerWorkflowEngine:
		default:
			return containertypes.ContainerInfo{}, containertypes.ErrContainerNotFound
		}
		return containertypes.ContainerInfo{
			Labels: map[string]string{containerbackend.GraphIDLabel: "studioctl-localtest"},
			State:  containertypes.ContainerState{Status: "running", Running: true},
		}, nil
	}

	var out bytes.Buffer
	command := testEnvCommand(t, &out)
	err := command.up(context.Background(), client, envUpFlags{
		runtime:     envlocaltest.NewRuntime(command.cfg),
		detach:      true,
		openBrowser: false,
		jsonOutput:  true,
	})
	if err != nil {
		t.Fatalf("up() error = %v", err)
	}

	var got envUpOutput
	if err := json.Unmarshal([]byte(strings.TrimSpace(out.String())), &got); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if got.Runtime != envlocaltest.Name || !got.Running || got.Started || !got.AlreadyRunning {
		t.Fatalf("output = %+v, want already running result", got)
	}
}

// testEnvCommand is an env command on a mock container runtime, with the registry's runtimes.
func testEnvCommand(t *testing.T, out io.Writer) *EnvCommand {
	t.Helper()
	return &EnvCommand{
		newRuntimes: envregistry.Runtimes,
		cfg:         testEnvCommandConfig(t),
		out:         ui.NewOutput(out, io.Discard, false),
		containerClient: func(context.Context) (container.ContainerClient, error) {
			return mock.New(), nil
		},
	}
}

// failContainerRuntime makes command's container runtime unreachable.
func failContainerRuntime(command *EnvCommand) {
	command.containerClient = func(context.Context) (container.ContainerClient, error) {
		return nil, errNoContainerRuntime
	}
}

var errNoContainerRuntime = errors.New("no container runtime")

func testEnvCommandConfig(t *testing.T) *config.Config {
	t.Helper()

	home := t.TempDir()
	return &config.Config{
		Home:      home,
		SocketDir: home,
		LogDir:    filepath.Join(home, "logs"),
		DataDir:   filepath.Join(home, "data"),
		BinDir:    filepath.Join(home, "bin"),
		Images:    testLocaltestImages(),
	}
}

func testLocaltestImages() config.ImagesConfig {
	return config.ImagesConfig{
		Core: config.CoreImages{
			Localtest:        config.ImageSpec{Image: "ghcr.io/altinn/test-localtest", Tag: "latest"},
			PDF3:             config.ImageSpec{Image: "ghcr.io/altinn/test-pdf3", Tag: "latest"},
			WorkflowEngineDb: config.ImageSpec{Image: "postgres", Tag: "18"},
			WorkflowEngine:   config.ImageSpec{Image: "ghcr.io/altinn/test-workflow-engine", Tag: "latest"},
			PgAdmin:          config.ImageSpec{Image: "dpage/pgadmin4", Tag: "latest"},
		},
	}
}

func TestEnvUpJSONRejectsForeground(t *testing.T) {
	t.Parallel()

	command := testEnvCommand(t, io.Discard)
	err := command.runUp(context.Background(), []string{"--json", "--detach=false"})
	if err == nil {
		t.Fatal("runUp() error = nil, want error")
	}
	if !strings.Contains(err.Error(), "--json requires --detach=true") {
		t.Fatalf("runUp() error = %v, want detach/json error", err)
	}
}

func TestParseUpFlagsBindsTheChosenRuntimesOwnFlags(t *testing.T) {
	t.Parallel()

	command := testEnvCommand(t, io.Discard)
	client := mock.New()
	for _, tc := range []struct {
		runtime string
		args    []string
	}{
		{runtime: envlocaltest.Name, args: []string{"--dev-workflow-engine", "--pgadmin"}},
		{runtime: envlocaltest.Name, args: []string{"-r", "localtest", "--monitoring"}},
		// --dev-workflow-engine is each runtime's own flag, with its own meaning.
		{runtime: envlocaltestv2.Name, args: []string{"-r", "localtest-v2", "--dev-workflow-engine", "--with", "receipt"}},
		{runtime: envlocaltestv2.Name, args: []string{"--runtime=localtest-v2", "--dev-postgres=postgres/Dockerfile"}},
	} {
		got, err := command.parseUpFlags(t.Context(), client, tc.args)
		if err != nil {
			t.Fatalf("parseUpFlags(%v) = %v", tc.args, err)
		}
		if got.runtime.Name() != tc.runtime {
			t.Errorf("parseUpFlags(%v) runtime = %s, want %s", tc.args, got.runtime.Name(), tc.runtime)
		}
	}
	if _, err := command.parseUpFlags(
		t.Context(),
		client,
		[]string{"-r", "localtest-v2", "--dev-nosuch"},
	); err == nil ||
		errors.Is(err, ErrInvalidFlagValue) {
		t.Fatalf("parseUpFlags(--dev-nosuch) = %v, want an undefined flag", err)
	}
	if _, err := command.parseUpFlags(t.Context(), client, []string{"-r", "nosuch"}); !errors.Is(
		err,
		ErrUnsupportedRuntime,
	) {
		t.Fatalf("parseUpFlags(-r nosuch) = %v, want ErrUnsupportedRuntime", err)
	}
}

func TestEnvUpRefusesTheOtherRuntimesFlags(t *testing.T) {
	t.Parallel()

	command := testEnvCommand(t, io.Discard)
	client := mock.New()
	for _, tc := range []struct {
		want string
		args []string
	}{
		{args: []string{"--with", "dialogporten"}, want: "--with is not supported by the localtest runtime (it is localtest-v2's)"},
		{args: []string{"--dev-storage"}, want: "--dev-storage is not supported by the localtest runtime"},
		{args: []string{"-r", "localtest-v2", "--monitoring"}, want: "--monitoring is not supported by the localtest-v2 runtime (it is localtest's)"},
	} {
		_, err := command.parseUpFlags(t.Context(), client, tc.args)
		if !errors.Is(err, ErrInvalidFlagValue) || !strings.Contains(err.Error(), tc.want) {
			t.Errorf("parseUpFlags(%v) = %v, want %q", tc.args, err, tc.want)
		}
	}
}

func TestRuntimeArg(t *testing.T) {
	t.Parallel()

	for _, tc := range []struct {
		want string
		args []string
	}{
		{want: "", args: []string{"--monitoring"}},
		{want: "a", args: []string{"-r", "a"}},
		{want: "a", args: []string{"--runtime", "a", "--json"}},
		{want: "a", args: []string{"--json", "-runtime=a"}},
		{want: "", args: []string{"--", "-r", "a"}},
		{want: "", args: []string{"-r"}},
		{want: "a", args: []string{"-r", "a", "--runtime=a"}},
	} {
		if got, err := runtimeArg(tc.args); err != nil || got != tc.want {
			t.Errorf("runtimeArg(%v) = %q, %v, want %q", tc.args, got, err, tc.want)
		}
	}
	if _, err := runtimeArg([]string{"-r", "a", "--runtime", "b"}); !errors.Is(err, ErrInvalidFlagValue) {
		t.Errorf("runtimeArg(-r a --runtime b) = %v, want ErrInvalidFlagValue", err)
	}
}

func TestEnvUsageHidesDevWorkflowEngine(t *testing.T) {
	t.Parallel()

	command := &EnvCommand{newRuntimes: envregistry.Runtimes}
	if got := command.Usage(); strings.Contains(got, "--dev-workflow-engine") {
		t.Fatalf("Usage() includes hidden --dev-workflow-engine:\n%s", got)
	}
}

func TestParseUpFlagsHelpHidesDevWorkflowEngine(t *testing.T) {
	t.Parallel()

	var out bytes.Buffer
	command := testEnvCommand(t, &out)
	failContainerRuntime(command) // help does not need the container runtime
	if err := command.runUp(t.Context(), []string{"--help"}); err != nil {
		t.Fatalf("runUp(--help) error = %v", err)
	}
	if got := out.String(); strings.Contains(got, "--dev-workflow-engine") {
		t.Fatalf("help output includes hidden --dev-workflow-engine:\n%s", got)
	}
}

func TestEnvHostsStatusJSON(t *testing.T) {
	hostsPath := filepath.Join(t.TempDir(), "hosts")
	content := "127.0.0.1 localhost\n"
	if err := os.WriteFile(hostsPath, []byte(content), osutil.FilePermDefault); err != nil {
		t.Fatalf("os.WriteFile() error = %v", err)
	}

	var out bytes.Buffer
	command := &EnvCommand{
		newRuntimes: envregistry.Runtimes,
		hostsFileTargets: func() ([]osutil.HostsTarget, error) {
			return []osutil.HostsTarget{{Label: "Linux", Path: hostsPath, Required: true}}, nil
		},
		containerClient: func(context.Context) (container.ContainerClient, error) {
			t.Error("env hosts status asked the container runtime")
			return nil, errNoContainerRuntime
		},
		cfg: &config.Config{},
		out: ui.NewOutput(&out, io.Discard, false),
	}

	if err := command.runHostsStatus([]string{"--json"}); err != nil {
		t.Fatalf("runHostsStatus() error = %v", err)
	}

	var got envHostsStatusOutput
	if err := json.Unmarshal(bytes.TrimSpace(out.Bytes()), &got); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if got.Runtime != envlocaltest.Name {
		t.Fatalf("Runtime = %q, want %q", got.Runtime, envlocaltest.Name)
	}
	if got.Path != hostsPath {
		t.Fatalf("Path = %q, want %q", got.Path, hostsPath)
	}
	if len(got.Hosts) != len(defaultLocalHostnames()) {
		t.Fatalf("len(Hosts) = %d, want %d", len(got.Hosts), len(defaultLocalHostnames()))
	}
	for i, host := range got.Hosts {
		if host.Host != defaultLocalHostnames()[i] {
			t.Fatalf("Hosts[%d].Host = %q, want %q", i, host.Host, defaultLocalHostnames()[i])
		}
		if host.State != envlocaltest.HostsStateMissing {
			t.Fatalf("Hosts[%d].State = %q, want %q", i, host.State, envlocaltest.HostsStateMissing)
		}
		if host.Detail != "" {
			t.Fatalf("Hosts[%d].Detail = %q, want empty", i, host.Detail)
		}
	}
}

func TestEnvHostsAddJSON(t *testing.T) {
	dir := t.TempDir()
	hostsPath := filepath.Join(dir, "hosts")
	content := "127.0.0.1 localhost\n"
	if err := os.WriteFile(hostsPath, []byte(content), osutil.FilePermDefault); err != nil {
		t.Fatalf("os.WriteFile() error = %v", err)
	}

	var out bytes.Buffer
	command := &EnvCommand{
		newRuntimes: envregistry.Runtimes,
		hostsFileTargets: func() ([]osutil.HostsTarget, error) {
			return []osutil.HostsTarget{{Label: "Linux", Path: hostsPath, Required: true}}, nil
		},
		containerClient: func(context.Context) (container.ContainerClient, error) {
			t.Error("env hosts add asked the container runtime")
			return nil, errNoContainerRuntime
		},
		cfg: &config.Config{},
		out: ui.NewOutput(&out, io.Discard, false),
	}

	if err := command.runHostsAdd([]string{"--json"}); err != nil {
		t.Fatalf("runHostsAdd() error = %v", err)
	}

	var got envHostsMutationOutput
	if err := json.Unmarshal(bytes.TrimSpace(out.Bytes()), &got); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if got.Runtime != envlocaltest.Name {
		t.Fatalf("Runtime = %q, want %q", got.Runtime, envlocaltest.Name)
	}
	if len(got.Targets) != 1 {
		t.Fatalf("len(Targets) = %d, want 1", len(got.Targets))
	}
	target := got.Targets[0]
	if target.Path != hostsPath {
		t.Fatalf("target.Path = %q, want %q", target.Path, hostsPath)
	}
	if !target.Result.Changed {
		t.Fatalf("target.Result.Changed = false, want true")
	}
	wantBackupPath := hostsPath + ".studioctl.bak"
	if target.Result.BackupPath != wantBackupPath {
		t.Fatalf("target.Result.BackupPath = %q, want %q", target.Result.BackupPath, wantBackupPath)
	}

	updated, err := os.ReadFile(hostsPath)
	if err != nil {
		t.Fatalf("os.ReadFile(hosts) error = %v", err)
	}
	for _, host := range defaultLocalHostnames() {
		if !bytes.Contains(updated, []byte(host)) {
			t.Fatalf("updated hosts file missing %q:\n%s", host, string(updated))
		}
	}

	backup, err := os.ReadFile(wantBackupPath)
	if err != nil {
		t.Fatalf("os.ReadFile(backup) error = %v", err)
	}
	if string(backup) != content {
		t.Fatalf("backup content = %q, want %q", string(backup), content)
	}
}

func defaultLocalHostnames() []string {
	return envtopology.NewLocal(envtopology.DefaultIngressPortString()).HostFileHostnames()
}

func TestEnvHostsValidatesAnExplicitRuntime(t *testing.T) {
	t.Parallel()
	command := testEnvCommand(t, io.Discard)
	failContainerRuntime(command)

	if err := command.runHostsStatus([]string{"-r", "nosuch"}); !errors.Is(err, ErrUnsupportedRuntime) {
		t.Fatalf("runHostsStatus(-r nosuch) = %v, want ErrUnsupportedRuntime", err)
	}
}

func TestEnvCommandsWithoutAContainerRuntime(t *testing.T) {
	t.Parallel()

	for _, tc := range []struct {
		wantErr error
		name    string
		args    []string
	}{
		{name: "status", args: []string{"status"}, wantErr: errNoContainerRuntime},
		{name: "logs", args: []string{"logs"}, wantErr: errNoContainerRuntime},
		{name: "down", args: []string{"down"}, wantErr: errNoContainerRuntime},
		{name: "reset", args: []string{"reset", "--yes"}, wantErr: errNoContainerRuntime},
		{name: "up", args: []string{"up"}, wantErr: errNoContainerRuntime},
		{name: "an unknown runtime first", args: []string{"status", "-r", "nosuch"}, wantErr: ErrUnsupportedRuntime},
		{name: "a flag error first", args: []string{"up", "--nosuch"}, wantErr: nil},
	} {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			command := testEnvCommand(t, io.Discard)
			failContainerRuntime(command)

			err := command.Run(t.Context(), tc.args)
			if tc.wantErr == nil {
				if err == nil || errors.Is(err, errNoContainerRuntime) {
					t.Fatalf("Run(%v) = %v, want a flag error", tc.args, err)
				}
				return
			}
			if !errors.Is(err, tc.wantErr) {
				t.Fatalf("Run(%v) = %v, want %v", tc.args, err, tc.wantErr)
			}
		})
	}
}
