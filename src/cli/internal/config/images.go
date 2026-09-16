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
	Tempo         ImageSpec
	Mimir         ImageSpec
	Loki          ImageSpec
	OtelCollector ImageSpec
	Grafana       ImageSpec
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
			Tempo:         ImageSpec{Image: "grafana/tempo", Tag: "2.4.1", Floating: false},
			Mimir:         ImageSpec{Image: "grafana/mimir", Tag: "2.12.0", Floating: false},
			Loki:          ImageSpec{Image: "grafana/loki", Tag: "3.0.0", Floating: false},
			OtelCollector: ImageSpec{Image: "otel/opentelemetry-collector-contrib", Tag: "0.98.0", Floating: false},
			Grafana:       ImageSpec{Image: "grafana/grafana", Tag: "10.4.2", Floating: false},
		},
	}
	images.applyEnvOverrides(os.Getenv)
	return images
}

// imageOverrides maps each image to its environment variable, which holds a complete
// reference ("repository:tag"; an untagged one resolves to ":latest"). An override replaces
// the reference only, so a floating image keeps being re-pulled.
func (c *ImagesConfig) imageOverrides() map[string]*ImageSpec {
	return map[string]*ImageSpec{
		"STUDIOCTL_IMAGE_LOCALTEST":          &c.Core.Localtest,
		"STUDIOCTL_IMAGE_PDF3":               &c.Core.PDF3,
		"STUDIOCTL_IMAGE_WORKFLOW_ENGINE":    &c.Core.WorkflowEngine,
		"STUDIOCTL_IMAGE_WORKFLOW_ENGINE_DB": &c.Core.WorkflowEngineDb,
		"STUDIOCTL_IMAGE_PGADMIN":            &c.Core.PgAdmin,
		"STUDIOCTL_IMAGE_TEMPO":              &c.Monitoring.Tempo,
		"STUDIOCTL_IMAGE_MIMIR":              &c.Monitoring.Mimir,
		"STUDIOCTL_IMAGE_LOKI":               &c.Monitoring.Loki,
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

// shortDigestLength keeps a digest recognizable while staying short enough to render inline.
const shortDigestLength = 12

// ShortDigest abbreviates an image digest ("sha256:<hex>") to the leading hex characters.
func ShortDigest(digest string) string {
	hex := digest
	if _, rest, found := strings.Cut(digest, ":"); found {
		hex = rest
	}
	if len(hex) > shortDigestLength {
		return hex[:shortDigestLength]
	}
	return hex
}
