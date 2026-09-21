package config

import (
	"os"
	"strings"
)

// Container images used by the local environment.
//
// Images that mirror a deployed environment track it rather than a pinned build, so a
// change reaching tt02 reaches the local environment without a studioctl release. The
// rest are pinned, having no deployed counterpart to follow.
const (
	imageLocaltest      = "ghcr.io/altinn/altinn-studio/runtime-localtest"
	imagePDF3           = "ghcr.io/altinn/altinn-studio/runtime-pdf3-worker"
	imageWorkflowEngine = "ghcr.io/altinn/altinn-studio/runtime-workflow-engine-app"

	// tagLocaltest follows every localtest build on main.
	tagLocaltest = "latest"

	// tagTT02 follows the build deployed to tt02, moved by the ring-tagging jobs in
	// .github/workflows/deploy-runtime-{pdf3,workflow-engine-app}.yaml when the tt_ring1
	// runtime ring, which is what tt02 serves, is tagged.
	tagTT02 = "tt02"
)

// ImageSpec defines an image reference with repository and tag.
type ImageSpec struct {
	Image string
	Tag   string

	// Floating marks a tag that moves as new builds are published. Such an image is
	// re-pulled whenever the environment starts, keeping the local copy when the registry
	// is unreachable.
	Floating bool
}

// Ref returns the full image reference (image:tag).
func (s ImageSpec) Ref() string {
	if s.Tag == "" {
		return s.Image + ":latest"
	}
	return s.Image + ":" + s.Tag
}

// CoreImages holds image configuration for core studioctl containers.
type CoreImages struct {
	Localtest        ImageSpec
	PDF3             ImageSpec
	WorkflowEngineDb ImageSpec
	WorkflowEngine   ImageSpec
	PgAdmin          ImageSpec
}

// MonitoringImages holds image configuration for monitoring stack containers.
type MonitoringImages struct {
	VictoriaMetrics ImageSpec
	VictoriaTraces  ImageSpec
	VictoriaLogs    ImageSpec
	OtelCollector   ImageSpec
	Grafana         ImageSpec
}

// ImagesConfig holds all image configuration grouped by purpose.
type ImagesConfig struct {
	Core       CoreImages
	Monitoring MonitoringImages
}

// DefaultImages returns the images the local environment runs, with any
// STUDIOCTL_IMAGE_* override applied.
func DefaultImages() ImagesConfig {
	images := ImagesConfig{
		Core: CoreImages{
			Localtest:        ImageSpec{Image: imageLocaltest, Tag: tagLocaltest, Floating: true},
			PDF3:             ImageSpec{Image: imagePDF3, Tag: tagTT02, Floating: true},
			WorkflowEngine:   ImageSpec{Image: imageWorkflowEngine, Tag: tagTT02, Floating: true},
			WorkflowEngineDb: ImageSpec{Image: "postgres", Tag: "18.3", Floating: false},
			PgAdmin:          ImageSpec{Image: "dpage/pgadmin4", Tag: "9.14", Floating: false},
		},
		Monitoring: MonitoringImages{
			VictoriaMetrics: ImageSpec{Image: "victoriametrics/victoria-metrics", Tag: "v1.152.0", Floating: false},
			VictoriaTraces:  ImageSpec{Image: "victoriametrics/victoria-traces", Tag: "v0.11.1", Floating: false},
			VictoriaLogs:    ImageSpec{Image: "victoriametrics/victoria-logs", Tag: "v1.52.0", Floating: false},
			OtelCollector:   ImageSpec{Image: "otel/opentelemetry-collector-contrib", Tag: "0.148.0", Floating: false},
			Grafana:         ImageSpec{Image: "grafana/grafana", Tag: "13.2.2", Floating: false},
		},
	}
	images.applyEnvOverrides(os.Getenv)
	return images
}

// imageOverrides maps each image to its environment variable, which holds a complete
// reference ("repository:tag"; an untagged one resolves to ":latest"). An override names one
// build to run, so it also stops that image from following a tag.
func (c *ImagesConfig) imageOverrides() map[string]*ImageSpec {
	return map[string]*ImageSpec{
		"STUDIOCTL_IMAGE_LOCALTEST":          &c.Core.Localtest,
		"STUDIOCTL_IMAGE_PDF3":               &c.Core.PDF3,
		"STUDIOCTL_IMAGE_WORKFLOW_ENGINE":    &c.Core.WorkflowEngine,
		"STUDIOCTL_IMAGE_WORKFLOW_ENGINE_DB": &c.Core.WorkflowEngineDb,
		"STUDIOCTL_IMAGE_PGADMIN":            &c.Core.PgAdmin,
		"STUDIOCTL_IMAGE_VICTORIA_METRICS":   &c.Monitoring.VictoriaMetrics,
		"STUDIOCTL_IMAGE_VICTORIA_TRACES":    &c.Monitoring.VictoriaTraces,
		"STUDIOCTL_IMAGE_VICTORIA_LOGS":      &c.Monitoring.VictoriaLogs,
		"STUDIOCTL_IMAGE_OTEL_COLLECTOR":     &c.Monitoring.OtelCollector,
		"STUDIOCTL_IMAGE_GRAFANA":            &c.Monitoring.Grafana,
	}
}

func (c *ImagesConfig) applyEnvOverrides(getenv func(string) string) {
	for envVar, spec := range c.imageOverrides() {
		ref := strings.TrimSpace(getenv(envVar))
		if ref == "" {
			continue
		}
		image, tag := splitImageRef(ref)
		spec.Image = image
		spec.Tag = tag
		spec.Floating = false
	}
}

// splitImageRef splits "repository:tag". A registry host may carry a port, so only a colon
// after the last path separator delimits the tag.
func splitImageRef(ref string) (image, tag string) {
	lastColon := strings.LastIndex(ref, ":")
	if lastColon < 0 || strings.Contains(ref[lastColon+1:], "/") {
		return ref, ""
	}
	return ref[:lastColon], ref[lastColon+1:]
}

// shortImageIDLength keeps an image ID recognizable while staying short enough to render inline.
const shortImageIDLength = 12

// ShortImageID abbreviates a container runtime image ID to its leading hex characters. Runtimes
// report it either bare or as "sha256:<hex>".
func ShortImageID(imageID string) string {
	hex := imageID
	if _, rest, found := strings.Cut(imageID, ":"); found {
		hex = rest
	}
	if len(hex) > shortImageIDLength {
		return hex[:shortImageIDLength]
	}
	return hex
}
