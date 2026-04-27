package cmd

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/container/mock"
	containertypes "altinn.studio/devenv/pkg/container/types"
	envlocaltest "altinn.studio/studioctl/internal/cmd/env/localtest"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

func TestEnvUpJSON_AlreadyRunning(t *testing.T) {
	t.Parallel()

	client := mock.New()
	client.ContainerStateFunc = func(context.Context, string) (containertypes.ContainerState, error) {
		return containertypes.ContainerState{Status: "running", Running: true}, nil
	}

	var out bytes.Buffer
	command := &EnvCommand{
		cfg: &config.Config{},
		out: ui.NewOutput(&out, io.Discard, false),
	}
	err := command.runLocaltestUp(context.Background(), client, envUpFlags{
		runtime:    runtimeLocaltest,
		detach:     true,
		jsonOutput: true,
	})
	if err != nil {
		t.Fatalf("runLocaltestUp() error = %v", err)
	}

	var got envUpOutput
	if err := json.Unmarshal([]byte(strings.TrimSpace(out.String())), &got); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if got.Runtime != runtimeLocaltest || !got.Running || got.Started || !got.AlreadyRunning {
		t.Fatalf("output = %+v, want already running result", got)
	}
}

func TestEnvUpJSONRejectsForeground(t *testing.T) {
	t.Parallel()

	command := &EnvCommand{out: ui.NewOutput(io.Discard, io.Discard, false)}
	err := command.runUp(context.Background(), []string{"--json", "--detach=false"})
	if err == nil {
		t.Fatal("runUp() error = nil, want error")
	}
	if !strings.Contains(err.Error(), "--json requires --detach=true") {
		t.Fatalf("runUp() error = %v, want detach/json error", err)
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
		hostsFileTargets: func() ([]osutil.HostsTarget, error) {
			return []osutil.HostsTarget{{Label: "Linux", Path: hostsPath, Required: true}}, nil
		},
		cfg: &config.Config{},
		out: ui.NewOutput(&out, io.Discard, false),
	}

	if err := command.runHostsStatus(context.Background(), []string{"--json"}); err != nil {
		t.Fatalf("runHostsStatus() error = %v", err)
	}

	var got envHostsStatusOutput
	if err := json.Unmarshal(bytes.TrimSpace(out.Bytes()), &got); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if got.Runtime != runtimeLocaltest {
		t.Fatalf("Runtime = %q, want %q", got.Runtime, runtimeLocaltest)
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
		hostsFileTargets: func() ([]osutil.HostsTarget, error) {
			return []osutil.HostsTarget{{Label: "Linux", Path: hostsPath, Required: true}}, nil
		},
		cfg: &config.Config{},
		out: ui.NewOutput(&out, io.Discard, false),
	}

	if err := command.runHostsAdd(context.Background(), []string{"--json"}); err != nil {
		t.Fatalf("runHostsAdd() error = %v", err)
	}

	var got envHostsMutationOutput
	if err := json.Unmarshal(bytes.TrimSpace(out.Bytes()), &got); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if got.Runtime != runtimeLocaltest {
		t.Fatalf("Runtime = %q, want %q", got.Runtime, runtimeLocaltest)
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
