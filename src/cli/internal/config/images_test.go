package config_test

import (
	"testing"

	"altinn.studio/studioctl/internal/config"
)

func TestDefaultImages(t *testing.T) {
	t.Parallel()

	images := config.DefaultImages()

	t.Run("images mirroring a deployed environment float", func(t *testing.T) {
		t.Parallel()

		if !images.Core.Localtest.Floating {
			t.Error("localtest image should follow its latest build")
		}
		if !images.Core.WorkflowEngine.Floating {
			t.Error("workflow-engine image should follow the build deployed to tt02")
		}
		if !images.Core.PDF3.Floating {
			t.Error("pdf3 image should follow the build deployed to tt02")
		}
		if got := images.Core.PDF3.Ref(); got != "ghcr.io/altinn/altinn-studio/runtime-pdf3-worker:tt02" {
			t.Errorf("pdf3 ref = %q", got)
		}
		if got := images.Core.WorkflowEngine.Ref(); got !=
			"ghcr.io/altinn/altinn-studio/runtime-workflow-engine-app:tt02" {
			t.Errorf("workflow-engine ref = %q", got)
		}
		if got := images.Core.Localtest.Ref(); got != "ghcr.io/altinn/altinn-studio/runtime-localtest:latest" {
			t.Errorf("localtest ref = %q", got)
		}
	})

	t.Run("images without a deployed counterpart stay pinned", func(t *testing.T) {
		t.Parallel()

		pinned := map[string]config.ImageSpec{
			"workflow-engine-db": images.Core.WorkflowEngineDb,
			"pgadmin":            images.Core.PgAdmin,
			"victoria-metrics":   images.Monitoring.VictoriaMetrics,
			"victoria-traces":    images.Monitoring.VictoriaTraces,
			"otel-collector":     images.Monitoring.OtelCollector,
			"grafana":            images.Monitoring.Grafana,
		}
		for name, spec := range pinned {
			if spec.Floating {
				t.Errorf("%s image should be pinned", name)
			}
			if spec.Tag == "" {
				t.Errorf("%s image should have an explicit tag", name)
			}
		}
	})
}

func TestDefaultImagesEnvOverride(t *testing.T) {
	t.Setenv("STUDIOCTL_IMAGE_WORKFLOW_ENGINE", "ghcr.io/altinn/altinn-studio/runtime-workflow-engine-app:a45a743b78")
	t.Setenv("STUDIOCTL_IMAGE_PGADMIN", "localhost:5000/pgadmin4:testing")
	t.Setenv("STUDIOCTL_IMAGE_VICTORIA_TRACES", "  ")

	images := config.DefaultImages()

	if got := images.Core.WorkflowEngine.Ref(); got !=
		"ghcr.io/altinn/altinn-studio/runtime-workflow-engine-app:a45a743b78" {
		t.Errorf("workflow-engine ref = %q", got)
	}
	if images.Core.WorkflowEngine.Floating {
		t.Error("an override names one build, so the image should stop following a tag")
	}
	if got := images.Core.PgAdmin.Ref(); got != "localhost:5000/pgadmin4:testing" {
		t.Errorf("pgadmin ref = %q, a registry port should not be read as a tag", got)
	}
	if got := images.Monitoring.VictoriaTraces.Ref(); got != "victoriametrics/victoria-traces:v0.9.3" {
		t.Errorf("victoria-traces ref = %q, a blank override should be ignored", got)
	}
}

func TestImageSpecRef(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		want string
		spec config.ImageSpec
	}{
		{name: "image and tag", want: "postgres:18.3", spec: config.ImageSpec{Image: "postgres", Tag: "18.3"}},
		{name: "no tag defaults to latest", want: "postgres:latest", spec: config.ImageSpec{Image: "postgres"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := tt.spec.Ref(); got != tt.want {
				t.Errorf("Ref() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestShortImageID(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		imageID string
		want    string
	}{
		{name: "empty", imageID: "", want: ""},
		{
			name:    "algorithm prefix is dropped",
			imageID: "sha256:0123456789abcdef0123456789abcdef",
			want:    "0123456789ab",
		},
		{name: "short id is kept whole", imageID: "sha256:0123", want: "0123"},
		{name: "bare hex", imageID: "0123456789abcdef", want: "0123456789ab"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := config.ShortImageID(tt.imageID); got != tt.want {
				t.Errorf("ShortImageID(%q) = %q, want %q", tt.imageID, got, tt.want)
			}
		})
	}
}
