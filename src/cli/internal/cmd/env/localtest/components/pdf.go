package components

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/osutil"
)

const (
	devImageTagPDF3   = "localtest-pdf3:dev"
	buildCacheRefPDF3 = "ghcr.io/altinn/altinn-studio/localtest-pdf3-dev-cache:buildcache"

	// CABundleVariable names a PEM file of extra CA certificates to trust: on the host, the developer's (a
	// TLS-intercepting proxy's CA); in pdf3, the mount of its copy at caBundleContainerPath, which pdf3's entrypoint
	// imports into its Chromium's NSS store, since Chromium ignores the system's.
	CABundleVariable      = "STUDIO_CA_BUNDLE"
	caBundleContainerPath = "/etc/localtest/ca-bundle.pem"
)

// ReadCABundle reads the file STUDIO_CA_BUNDLE names. Unset, or naming no file, is nil without an error; a file that
// cannot be read is nil with the error, for the caller to warn about.
func ReadCABundle(getenv func(string) string) ([]byte, error) {
	source := getenv(CABundleVariable)
	if source == "" {
		return nil, nil
	}
	content, err := os.ReadFile(source) //nolint:gosec // The developer names the file to pass to pdf3.
	if errors.Is(err, os.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("%s=%s: %w", CABundleVariable, source, err)
	}
	return content, nil
}

// CABundlePath returns the host path of the copy of the host's CA bundle that pdf3 mounts. A copy, not the file: it
// is readable by pdf3's user whatever the original's mode, lies under the data directory that Docker Desktop shares,
// and SELinux relabelling touches the copy, never a system file.
func CABundlePath(infraDir string) string {
	return filepath.Join(infraDir, "pdf3", "ca-bundle.pem")
}

// ensureCABundle writes the copy, readable by everyone, unless it holds the content already.
func ensureCABundle(path string, content []byte) error {
	if err := os.MkdirAll(filepath.Dir(path), osutil.DirPermDefault); err != nil {
		return fmt.Errorf("create the CA bundle's directory: %w", err)
	}
	existing, err := os.ReadFile(path) //nolint:gosec // The path is under studioctl's own data directory.
	if err != nil || !bytes.Equal(existing, content) {
		if err = os.WriteFile(path, content, osutil.FilePermDefault); err != nil {
			return fmt.Errorf("copy the CA bundle: %w", err)
		}
	}
	if err := os.Chmod(path, osutil.FilePermDefault); err != nil {
		return fmt.Errorf("make the CA bundle's copy readable: %w", err)
	}
	return nil
}

func registerPDFComponents(manifest *Manifest, opts *Options) {
	manifest.addContainer(opts, pdfImage(opts), pdfContainer(opts), true)
	if opts.CABundle != nil {
		manifest.addPreparation("pdf3 CA bundle", func(context.Context) error {
			return ensureCABundle(CABundlePath(opts.Paths.InfraDir), opts.CABundle)
		})
	}
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
		return localDevImage(ctx.PrebuiltDevImages, &resource.BuiltImage{
			Enabled:     nil,
			ContextPath: filepath.ToSlash(filepath.Join(ctx.DevConfig.RepoRoot, "src/Runtime/pdf3")),
			Dockerfile: filepath.ToSlash(
				filepath.Join(ctx.DevConfig.RepoRoot, "src/Runtime/pdf3/Dockerfile.worker"),
			),
			Build: buildCacheOptions(buildCacheRefPDF3),
			Tag:   devImageTagPDF3,
		})
	}
	return &resource.PulledImage{
		Enabled:    nil,
		Ref:        ctx.Images.Core.PDF3.Ref(),
		PullPolicy: pullPolicyFor(ctx.Images.Core.PDF3),
	}
}

func pdfContainer(ctx *Options) *ContainerSpec {
	env := pdfEnv(ctx.Topology)
	var volumes []types.VolumeMount
	if ctx.CABundle != nil {
		env[CABundleVariable] = caBundleContainerPath
		volumes = []types.VolumeMount{newReadOnlyVolume(CABundlePath(ctx.Paths.InfraDir), caBundleContainerPath)}
	}
	spec := newContainerSpec(
		ContainerPDF3,
		// TODO: same as above, we only need host port mapping here because old
		[]types.PortMapping{newPort("5300", "5031")},
		env,
		volumes,
		nil,
		[]string{ContainerLocaltest},
		nil,
	)
	// PDF runs as an internal service and has no host-writable mounts, so avoid host UID/GID remapping.
	spec.UseDefaultUser = true
	return spec
}

func pdfEnv(topology envtopology.Local) map[string]string {
	return map[string]string{
		"TZ":                             "Europe/Oslo",
		"PDF3_ENVIRONMENT":               "localtest",
		"PDF3_QUEUE_SIZE":                "3",
		"PDF3_LOCALTEST_PUBLIC_BASE_URL": topology.LocaltestBaseURL(),
	}
}
