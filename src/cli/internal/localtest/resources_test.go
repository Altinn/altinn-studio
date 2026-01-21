package localtest_test

import (
	"testing"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/localtest"
)

func TestBuildResourcesForDestroy_ExcludesMonitoringWhenDisabled(t *testing.T) {
	t.Parallel()

	resources := localtest.BuildResourcesForDestroy(newDestroyOptions(false))

	if len(resources) != 5 {
		t.Fatalf("expected 5 resources without monitoring, got %d", len(resources))
	}

	for _, res := range resources {
		id := res.ID().String()
		if id == "container:"+localtest.ContainerMonitoringTempo ||
			id == "container:"+localtest.ContainerMonitoringMimir ||
			id == "container:"+localtest.ContainerMonitoringLoki ||
			id == "container:"+localtest.ContainerMonitoringOtelCollector ||
			id == "container:"+localtest.ContainerMonitoringGrafana {
			t.Fatalf("unexpected monitoring resource when IncludeMonitoring=false: %s", id)
		}
	}
}

func TestBuildResourcesForDestroy_IncludesMonitoringWhenEnabled(t *testing.T) {
	t.Parallel()

	resources := localtest.BuildResourcesForDestroy(newDestroyOptions(true))

	if len(resources) != 15 {
		t.Fatalf("expected 15 resources with monitoring, got %d", len(resources))
	}
}

func newDestroyOptions(includeMonitoring bool) localtest.ResourceDestroyOptions {
	return localtest.ResourceDestroyOptions{
		DataDir:           "/tmp/studioctl-test",
		IncludeMonitoring: includeMonitoring,
		Installation:      container.InstallationDocker,
		Images: config.ImagesConfig{
			Core: config.CoreImages{
				Localtest: config.ImageSpec{Image: "ghcr.io/altinn/localtest", Tag: "latest"},
				PDF3:      config.ImageSpec{Image: "ghcr.io/altinn/pdf3", Tag: "latest"},
			},
			Monitoring: config.MonitoringImages{
				Tempo:         config.ImageSpec{Image: "grafana/tempo", Tag: "latest"},
				Mimir:         config.ImageSpec{Image: "grafana/mimir", Tag: "latest"},
				Loki:          config.ImageSpec{Image: "grafana/loki", Tag: "latest"},
				OtelCollector: config.ImageSpec{Image: "otel/opentelemetry-collector-contrib", Tag: "latest"},
				Grafana:       config.ImageSpec{Image: "grafana/grafana", Tag: "latest"},
			},
		},
	}
}
