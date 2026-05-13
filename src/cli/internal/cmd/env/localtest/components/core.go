package components

import (
	"context"
	"path/filepath"

	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/envtopology"
)

const (
	devImageTagLocaltest   = "localtest:dev"
	buildCacheRefLocaltest = "ghcr.io/altinn/altinn-studio/localtest-main-cache:latest"

	// LocaltestServicePort is the HTTP port used by the localtest container.
	LocaltestServicePort = "5101"
)

func registerCoreComponents(manifest *Manifest, opts *Options) {
	manifest.addContainer(opts, localtestImage(opts), localtestContainer(opts), true)
	manifest.addPreparation("localtest storage directory", func(context.Context) error {
		return EnsureLocaltestStorageDir(opts.Paths.DataDir)
	})
}

func localtestImage(ctx *Options) resource.ImageResource {
	if ctx.ImageMode == DevMode && ctx.DevConfig != nil {
		return &resource.LocalImage{
			Enabled:     nil,
			ContextPath: filepath.ToSlash(filepath.Join(ctx.DevConfig.RepoRoot, "src")),
			Dockerfile:  filepath.ToSlash(filepath.Join(ctx.DevConfig.RepoRoot, "src/Runtime/localtest/Dockerfile")),
			Build:       buildCacheOptions(buildCacheRefLocaltest),
			Tag:         devImageTagLocaltest,
		}
	}
	return &resource.RemoteImage{
		Enabled:    nil,
		Ref:        ctx.Images.Core.Localtest.Ref(),
		PullPolicy: resource.PullIfNotPresent,
	}
}

func localtestListenURLs(loadBalancerPort string) string {
	if loadBalancerPort == LocaltestServicePort {
		return "http://*:" + LocaltestServicePort + "/"
	}
	return "http://*:" + LocaltestServicePort + "/;http://*:" + loadBalancerPort + "/"
}

func localtestContainer(ctx *Options) *ContainerSpec {
	ingressPort := ctx.Topology.IngressPort()
	return newContainerSpec(
		ContainerLocaltest,
		[]types.PortMapping{
			newPort(ingressPort, LocaltestServicePort), // Main port
			// TODO: internal port below is kept to keep compatibility with "dotnet run" apps,
			// as PlatformSettings default values is what is used when users do "dotnet run --project App"
			// and similar. We only use the topology ingress port when running through "studioctl [app] run"
			// Whenever we are comfortable completely relying on studioctl run or v8 is completely unsupported
			// we can remove this port mapping
			newPort(LocaltestServicePort, LocaltestServicePort), // Internal port
		},
		localtestEnv(ctx.Topology, ingressPort),
		[]types.VolumeMount{
			newReadOnlyVolume(
				envtopology.BoundTopologyHostDir(ctx.Paths.DataDir),
				envtopology.BoundTopologyContainerDir,
			),
			newVolume(filepath.Join(ctx.Paths.DataDir, "testdata"), "/testdata"),
			newVolume(LocaltestStoragePath(ctx.Paths.DataDir), "/AltinnPlatformLocal"),
		},
		ctx.Topology.LocaltestIngressHosts(),
		nil,
		nil,
	)
}

func localtestEnv(topology envtopology.Local, ingressPort string) map[string]string {
	return map[string]string{
		"ASPNETCORE_URLS":                                       localtestListenURLs(ingressPort),
		"DOTNET_ENVIRONMENT":                                    "Development",
		"GeneralSettings__BaseUrl":                              topology.LocaltestBaseURL(),
		"GeneralSettings__HostName":                             topology.AppHostName(),
		"LocalPlatformSettings__LocalTestingStorageBasePath":    "/AltinnPlatformLocal/",
		"LocalPlatformSettings__LocalTestingStaticTestDataPath": "/testdata/",
		envtopology.BoundTopologyOptionsConfigPathEnv:           envtopology.BoundTopologyConfigContainerPath,
	}
}
