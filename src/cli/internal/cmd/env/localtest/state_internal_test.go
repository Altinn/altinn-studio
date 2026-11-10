package localtest

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"altinn.studio/studioctl/internal/cmd/env/localtest/components"
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

func TestCheckPublicPort(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name              string
		port              string
		wantClash         string
		monitoring        bool
		devWorkflowEngine bool
	}{
		{name: "a free port", port: "8100"},
		{name: "the default port with every option", port: "8000", monitoring: true, devWorkflowEngine: true},
		{name: "localtest's own port", port: components.LocaltestServicePort, wantClash: components.ContainerLocaltest},
		{name: "pdf3's port", port: "5300", wantClash: components.ContainerPDF3},
		{
			name:       "the collector's port with monitoring",
			port:       "4317",
			monitoring: true,
			wantClash:  components.ContainerOtelCollector,
		},
		{name: "the collector's port without monitoring", port: "4317"},
		{
			name:              "the engine database's port with a host engine",
			port:              "9543",
			devWorkflowEngine: true,
			wantClash:         components.ContainerWorkflowEngineDb,
		},
		{name: "the engine database's port otherwise", port: "9543"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			manifest := components.NewManifest(&components.Options{
				Paths:             components.NewPaths(t.TempDir()),
				Topology:          envtopology.NewLocal(tt.port),
				IncludeMonitoring: tt.monitoring,
				DevWorkflowEngine: tt.devWorkflowEngine,
			})

			err := checkPublicPort(manifest.Resources, tt.port)
			if tt.wantClash == "" {
				if err != nil {
					t.Fatalf("checkPublicPort() error = %v, want nil", err)
				}
				return
			}
			if !errors.Is(err, errPortPublished) || !strings.Contains(err.Error(), tt.wantClash) {
				t.Fatalf("checkPublicPort() error = %v, want a clash with %s", err, tt.wantClash)
			}
		})
	}
}
