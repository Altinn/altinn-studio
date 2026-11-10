package localtest

import (
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

	if _, err := ReadState(cfg); err == nil || !strings.Contains(err.Error(), statePath(cfg)) {
		t.Fatalf("ReadState() error = %v, want an error naming %s", err, statePath(cfg))
	}
}
