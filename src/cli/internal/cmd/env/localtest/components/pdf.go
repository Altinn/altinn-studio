package components

import (
	"path/filepath"

	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/envtopology"
)

const (
	devImageTagPDF3   = "localtest-pdf3:dev"
	buildCacheRefPDF3 = "ghcr.io/altinn/altinn-studio/localtest-pdf3-cache:latest"
)

func registerPDFComponents(manifest *Manifest, opts *Options) {
	manifest.addContainer(opts, pdfImage(opts), pdfContainer(opts), true)
	manifest.addBinding(envtopology.RuntimeBinding{
		ComponentID: envtopology.ComponentPDF,
		Destination: envtopology.BoundTopologyDestination{
			Location: envtopology.DestinationLocationEnv,
			Kind:     envtopology.DestinationKindHTTP,
			URL:      "http://" + ContainerPDF3 + ":5031",
		},
		Enabled: true,
	})
}

func pdfImage(ctx *Options) resource.ImageResource {
	if ctx.ImageMode == DevMode && ctx.DevConfig != nil {
		return &resource.LocalImage{
			Enabled:     nil,
			ContextPath: filepath.ToSlash(filepath.Join(ctx.DevConfig.RepoRoot, "src/Runtime/pdf3")),
			Dockerfile: filepath.ToSlash(
				filepath.Join(ctx.DevConfig.RepoRoot, "src/Runtime/pdf3/Dockerfile.worker"),
			),
			Build: buildCacheOptions(buildCacheRefPDF3),
			Tag:   devImageTagPDF3,
		}
	}
	return &resource.RemoteImage{
		Enabled:    nil,
		Ref:        ctx.Images.Core.PDF3.Ref(),
		PullPolicy: resource.PullIfNotPresent,
	}
}

func pdfContainer(ctx *Options) *ContainerSpec {
	return newContainerSpec(
		ContainerPDF3,
		// TODO: same as above, we only need host port mapping here because old
		[]types.PortMapping{newPort("5300", "5031")},
		pdfEnv(ctx.Topology),
		nil,
		nil,
		[]string{ContainerLocaltest},
		nil,
	)
}

func pdfEnv(topology envtopology.Local) map[string]string {
	return map[string]string{
		"TZ":                             "Europe/Oslo",
		"PDF3_ENVIRONMENT":               "localtest",
		"PDF3_QUEUE_SIZE":                "3",
		"PDF3_LOCALTEST_PUBLIC_BASE_URL": topology.LocaltestBaseURL(),
	}
}
