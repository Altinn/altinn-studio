package localtest

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/envtopology"
)

func TestRecordedTopologyIsTheDefaultWithoutState(t *testing.T) {
	t.Parallel()

	topology, err := RecordedTopology(&config.Config{DataDir: t.TempDir()})
	if err != nil {
		t.Fatalf("RecordedTopology() error = %v", err)
	}
	if got, want := topology.IngressPort(), envtopology.DefaultIngressPortString(); got != want {
		t.Fatalf("IngressPort() = %q, want %q", got, want)
	}
}

func TestRecordedTopologyUsesTheRecordedPort(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{DataDir: t.TempDir()}
	if err := WriteState(cfg, State{PublicPort: 8100}); err != nil {
		t.Fatalf("WriteState() error = %v", err)
	}

	topology, err := RecordedTopology(cfg)
	if err != nil {
		t.Fatalf("RecordedTopology() error = %v", err)
	}
	if got, want := topology.LocaltestURL(), "http://local.altinn.cloud:8100"; got != want {
		t.Fatalf("LocaltestURL() = %q, want %q", got, want)
	}
}

func TestReadStateRefusesAnUnreadableFile(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{DataDir: t.TempDir()}
	if err := os.MkdirAll(filepath.Dir(statePath(cfg)), 0o755); err != nil {
		t.Fatalf("MkdirAll() error = %v", err)
	}
	if err := os.WriteFile(statePath(cfg), []byte("{"), 0o600); err != nil {
		t.Fatalf("WriteFile() error = %v", err)
	}

	if _, _, err := ReadState(cfg); err == nil || !strings.Contains(err.Error(), statePath(cfg)) {
		t.Fatalf("ReadState() error = %v, want an error naming %s", err, statePath(cfg))
	}
}

func TestStartState(t *testing.T) {
	t.Parallel()

	recorded := State{PublicPort: 8100}
	const configured = 8300
	tests := []struct {
		name      string
		port      int
		hasRecord bool
		exists    bool
		want      int
	}{
		{name: "--port wins over the recorded port", port: 8200, hasRecord: true, exists: true, want: 8200},
		{name: "a recorded port lasts until env down", port: 0, hasRecord: true, exists: false, want: 8100},
		// Started before studioctl recorded the port, so env config, changed since, must not move it.
		{name: "an environment without a record keeps the default", port: 0, hasRecord: false, exists: true,
			want: envtopology.DefaultIngressPort()},
		{name: "a new environment starts at the configured port", port: 0, hasRecord: false, exists: false,
			want: configured},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := startState(tt.port, recorded, tt.hasRecord, tt.exists, configured)
			if got.PublicPort != tt.want {
				t.Fatalf("startState() port = %d, want %d", got.PublicPort, tt.want)
			}
		})
	}
}

func TestRemoveStateForgetsTheRecordedPort(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{DataDir: t.TempDir()}
	if err := WriteState(cfg, State{PublicPort: 8100}); err != nil {
		t.Fatalf("WriteState() error = %v", err)
	}

	for range 2 { // removing an absent state is no error
		if err := RemoveState(cfg); err != nil {
			t.Fatalf("RemoveState() error = %v", err)
		}
	}
	if state, found, err := ReadState(cfg); err != nil || found {
		t.Fatalf("ReadState() = %+v, %t, %v, want no record", state, found, err)
	}
}

// With nothing recorded, the environment, if any, was started at the default port, so env config doesn't apply.
func TestRecordedTopologyWithoutARecordIsTheDefaultPort(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{Home: t.TempDir(), DataDir: t.TempDir()}
	if err := config.SaveSettings(cfg, config.Settings{Env: config.EnvSettings{Port: 8300}}); err != nil {
		t.Fatalf("SaveSettings() error = %v", err)
	}

	topology, err := RecordedTopology(cfg)
	if err != nil {
		t.Fatalf("RecordedTopology() error = %v", err)
	}
	if got := topology.IngressPort(); got != envtopology.DefaultIngressPortString() {
		t.Fatalf("IngressPort() = %q, want %s", got, envtopology.DefaultIngressPortString())
	}
}

// A running environment keeps the port it was started at, whatever env config says now.
func TestRecordedTopologyPrefersTheRecordToTheConfiguredPort(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{Home: t.TempDir(), DataDir: t.TempDir()}
	if err := config.SaveSettings(cfg, config.Settings{Env: config.EnvSettings{Port: 8300}}); err != nil {
		t.Fatalf("SaveSettings() error = %v", err)
	}
	if err := WriteState(cfg, State{PublicPort: 8100}); err != nil {
		t.Fatalf("WriteState() error = %v", err)
	}

	topology, err := RecordedTopology(cfg)
	if err != nil {
		t.Fatalf("RecordedTopology() error = %v", err)
	}
	if got := topology.IngressPort(); got != "8100" {
		t.Fatalf("IngressPort() = %q, want 8100", got)
	}
}

// A hand-edited config.yaml can hold a port env config set would refuse.
func TestConfiguredPortRefusesAPortOutOfRange(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{Home: t.TempDir(), DataDir: t.TempDir()}
	if err := os.WriteFile(cfg.SettingsPath(), []byte("env:\n  port: 70000\n"), 0o600); err != nil {
		t.Fatalf("WriteFile() error = %v", err)
	}

	_, err := configuredPort(cfg)
	if !errors.Is(err, errPortOutOfRange) || !strings.Contains(err.Error(), cfg.SettingsPath()) {
		t.Fatalf("configuredPort() error = %v, want out of range, naming %s", err, cfg.SettingsPath())
	}
}
