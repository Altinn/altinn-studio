package localtestv2

import (
	"altinn.studio/devenv/pkg/container/types"
	envstack "altinn.studio/studioctl/internal/cmd/env/stack"
	"altinn.studio/studioctl/internal/localtestv2"
	"altinn.studio/studioctl/internal/localtestv2/manifest"
)

// The host's CA bundle: behind a TLS-intercepting proxy (a corporate network, a sandbox) the developer names the
// proxy's CA in STUDIO_CA_BUNDLE, a PEM file. The runtimes share how it is read and passed on
// (envstack.LoadCABundle): a copy of its usable certificates under the data directory, named by their digest, which
// a container mounts read-only with the variable pointing at it. Here, the containers the manifest marks with caBundle
// take it (pdf3, whose Chromium imports it into its NSS store, which ignores the system's), and the state file
// records its digest, so an env up with a changed bundle converges the running environment and the new copy's name
// recreates those containers.

// loadCABundle reads the host's CA bundle and writes its copy, once per command, so it warns once.
func (e *Env) loadCABundle() *envstack.CABundle {
	return envstack.LoadCABundle(e.out, localtestv2.CABundleDir(e.cfg))
}

// caBundleMount is what a container with caBundle gets while the host has a bundle: the variable at the mount, and
// the mount, relabelled for SELinux as the other bind mounts. Nothing for another container or without a bundle.
func caBundleMount(
	opts *Options,
	c manifest.Container,
	relabel types.SELinuxRelabel,
) (map[string]string, []types.VolumeMount) {
	if !c.CABundle {
		return nil, nil
	}
	env := map[string]string{}
	volumes := opts.CABundle.Mount(env, nil)
	for i := range volumes {
		volumes[i].SELinuxRelabel = relabel
	}
	return env, volumes
}
