package localtestv2

import (
	"context"
	"maps"
	"path/filepath"
	"slices"
	"strconv"
	"strings"

	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/localtestv2"
	"altinn.studio/studioctl/internal/localtestv2/manifest"
)

// The manifest (internal/localtestv2/manifest/manifest.json) says which containers there are and what each one gets
// of its own; everything below is what every container gets alike, which is this runtime's to decide.
const (
	containerPrefix = "localtest-v2-"
	networkName     = "localtest-v2_network"
	// volumePrefix names this runtime's volumes: localtest-v2-<id> for the manifest's volume id. The Aspire package
	// has its own prefix, so a reset in one runtime leaves the other's data alone.
	volumePrefix = "localtest-v2-"

	// frontDoor is the container whose port the runtime publishes on the host, as the public origin's port (8000): the
	// localtest app, which routes by host and path prefix to the other containers by their services__ variables.
	frontDoor = "localtest"

	// Containers reach the public origin, published on the host, through the runtime's host gateway: every public host
	// name resolves to it, and so does hostGatewayName, by which the front door reaches the apps on the host and Events
	// delivers webhooks to the developer's machine.
	hostGateway     = "host-gateway"
	hostGatewayName = "host.docker.internal"

	// certificateDir is where every container finds the shared test certificate (localtestv2.CertificateFileName).
	certificateDir = "/certs"
	// legacyCertificateFile is the path Events, Notifications and Receipt read their signing certificate from:
	// they never bind AccessTokenSettings, so the production SigningCredentialsResolver reads its default,
	// ../accesstoken/accesstokencredentials.pfx from /app. The pinned images have nothing there, so the certificate is
	// mounted at that path too, in every container like the directory; this goes once those three images link the
	// path to the directory.
	legacyCertificateFile = "/accesstoken/accesstokencredentials.pfx"

	// devImagePrefix names the image a --dev build produces: localtest-v2-dev-<container>.
	devImagePrefix = "localtest-v2-dev-"

	// pinnedTagPrefix marks a tag that names one build of the research images; --latest replaces it with latestTag.
	pinnedTagPrefix = "sha-"
	latestTag       = "latest"
	digestSeparator = "@sha256:"
)

// stack is the embedded manifest. It is checked by its package's tests, so an invalid one never ships.
func stack() *manifest.Manifest {
	return manifest.MustDefault()
}

// containerOf is the runtime's container name of a manifest container.
func containerOf(name string) string {
	return containerPrefix + name
}

// DevBuild is a --dev build of one container: the build context and the Dockerfile, both absolute.
type DevBuild struct {
	Context    string
	Dockerfile string
}

// Options configures the environment.
type Options struct {
	// Dev are the containers built from source instead of pulled, by manifest name.
	Dev map[string]DevBuild
	// Groups are the optional groups that are on, sorted; the default group always is.
	Groups   []string
	CertDir  string
	Topology envtopology.Local
	// LatestImages runs the research images at "latest" instead of their pinned sha- tag.
	LatestImages bool
	RelabelBinds bool
}

func defaultOptions(certDir string) *Options {
	return &Options{
		Dev:          nil,
		Groups:       nil,
		CertDir:      certDir,
		Topology:     envtopology.NewLocal(envtopology.DefaultIngressPortString()),
		LatestImages: false,
		RelabelBinds: false,
	}
}

// selected lists the containers the options start, in start order: the default group's and the enabled groups' root
// containers and everything they depend on.
func selected(opts *Options) []string {
	return stack().Select(append([]string{manifest.DefaultGroup}, opts.Groups...))
}

// containerNames lists the selected containers' runtime names in start order, for logs and status.
func containerNames(opts *Options) []string {
	names := selected(opts)
	out := make([]string, 0, len(names))
	for _, name := range names {
		out = append(out, containerOf(name))
	}
	return out
}

// readinessProbes returns the readiness check of a container, run before what depends on it starts; nil runs none.
type readinessProbes func(target healthTarget) func(ctx context.Context) error

// resources turns the selected containers into the devenv resource graph: the network, then per container its image
// (pulled, or built for --dev) and the container.
func resources(opts *Options, probes readinessProbes) []resource.Resource {
	network := &resource.Network{
		Enabled: nil,
		Name:    networkName,
		Driver:  "bridge",
		Labels:  nil,
		Lifecycle: resource.LifecycleOptions{
			HandleDestroyError: nil,
			RetainOnDestroy:    false,
		},
	}
	names := selected(opts)
	services := serviceVariables(names)
	out := make([]resource.Resource, 0, 1+2*len(names))
	out = append(out, network)
	images := map[resource.ResourceID]bool{}
	for _, name := range names {
		image := containerImage(opts, name)
		if !images[image.ID()] {
			images[image.ID()] = true
			out = append(out, image)
		}
		var probe func(ctx context.Context) error
		if probes != nil {
			probe = probes(healthTargetOf(name))
		}
		out = append(out, containerResource(opts, name, services, image, resource.Ref(network), probe))
	}
	return out
}

// serviceVariables announce every running HTTP container to every container, the way Aspire's service discovery
// does: services__<name>__http__0=http://<name>:<port>, the container's name being its network alias.
func serviceVariables(running []string) map[string]string {
	vars := map[string]string{}
	for _, name := range running {
		c := stack().Containers[name]
		if c.IsHTTP() {
			vars["services__"+name+"__http__0"] = "http://" + name + ":" + strconv.Itoa(c.HTTPPort())
		}
	}
	return vars
}

func containerImage(opts *Options, name string) resource.ImageResource {
	if build, ok := opts.Dev[name]; ok {
		return &resource.BuiltImage{
			Enabled:     nil,
			ContextPath: filepath.ToSlash(build.Context),
			Dockerfile:  filepath.ToSlash(build.Dockerfile),
			Build:       types.BuildOptions{CacheFrom: nil, CacheTo: nil},
			Tag:         devImagePrefix + name,
		}
	}
	c := stack().Containers[name]
	tag := c.Tag
	if opts.LatestImages && strings.HasPrefix(tag, pinnedTagPrefix) {
		tag = latestTag
	}
	return &resource.PulledImage{Enabled: nil, Ref: c.Registry + ":" + tag, PullPolicy: pullPolicy(tag)}
}

// pullPolicy pulls a tag that names one build (a sha- pin or a digest) once, and re-pulls a moving tag (latest, tt02) on
// every start, keeping the local copy when the registry cannot be reached.
func pullPolicy(tag string) resource.PullPolicy {
	if strings.HasPrefix(tag, pinnedTagPrefix) || strings.Contains(tag, digestSeparator) {
		return resource.PullIfNotPresent
	}
	return resource.PullAlwaysAllowStale
}

func containerResource(
	opts *Options,
	name string,
	services map[string]string,
	image resource.ImageResource,
	network resource.ResourceRef,
	probe func(ctx context.Context) error,
) *resource.Container {
	c := stack().Containers[name]
	deps := make([]resource.ResourceRef, 0, len(c.DependsOn))
	for _, dep := range c.DependsOn {
		deps = append(deps, resource.RefID(resource.ContainerID(containerOf(dep))))
	}
	var ports []types.PortMapping
	if name == frontDoor {
		// Every interface, not loopback only: the containers reach the public origin through the host gateway.
		ports = []types.PortMapping{{
			HostPort:      opts.Topology.IngressPort(),
			ContainerPort: strconv.Itoa(c.HTTPPort()),
			HostIP:        "",
			Protocol:      "",
		}}
	}
	return &resource.Container{
		HealthCheck: nil,
		Name:        containerOf(name),
		Image:       resource.Ref(image),
		Enabled:     nil,
		Networks:    []resource.ResourceRef{network},
		DependsOn:   deps,
		Ports:       ports,
		Volumes:     containerVolumes(opts, c),
		Env:         containerEnv(c, services),
		Labels:      nil,
		Command:     nil,
		ExtraHosts:  extraHosts(opts),
		Lifecycle: resource.ContainerLifecycleOptions{
			LifecycleOptions: resource.LifecycleOptions{
				HandleDestroyError: nil,
				RetainOnDestroy:    false,
			},
			WaitForReady:   true,
			ReadinessProbe: probe,
		},
		NetworkAliases: []string{name},
		RestartPolicy:  "",
		User:           "",
		UsernsMode:     "",
	}
}

// containerEnv is the container's own environment from the manifest, then the services__ variables.
func containerEnv(c manifest.Container, services map[string]string) []string {
	env := make([]string, 0, len(c.Envs)+len(services))
	for _, key := range slices.Sorted(maps.Keys(c.Envs)) {
		env = append(env, key+"="+c.Envs[key])
	}
	for _, key := range slices.Sorted(maps.Keys(services)) {
		env = append(env, key+"="+services[key])
	}
	return env
}

// volumeName is the runtime's name of the manifest's volume id.
func volumeName(id string) string {
	return volumePrefix + id
}

// volumeNames are the runtime's names of every volume in the manifest, sorted.
func volumeNames() []string {
	ids := stack().VolumeIDs()
	names := make([]string, 0, len(ids))
	for _, id := range ids {
		names = append(names, volumeName(id))
	}
	return names
}

// containerVolumes are the shared certificate, read-only, and the container's named volumes.
func containerVolumes(opts *Options, c manifest.Container) []types.VolumeMount {
	relabel := types.SELinuxRelabelNone
	if opts.RelabelBinds {
		relabel = types.SELinuxRelabelShared
	}
	volumes := make([]types.VolumeMount, 0, 2+len(c.Volumes))
	volumes = append(volumes,
		types.VolumeMount{
			HostPath:       opts.CertDir,
			ContainerPath:  certificateDir,
			Type:           types.VolumeMountTypeBind,
			SELinuxRelabel: relabel,
			ReadOnly:       true,
		},
		types.VolumeMount{
			HostPath:       filepath.Join(opts.CertDir, localtestv2.CertificateFileName),
			ContainerPath:  legacyCertificateFile,
			Type:           types.VolumeMountTypeBind,
			SELinuxRelabel: relabel,
			ReadOnly:       true,
		},
	)
	for _, id := range slices.Sorted(maps.Keys(c.Volumes)) {
		volumes = append(volumes, types.VolumeMount{
			HostPath:       volumeName(id),
			ContainerPath:  c.Volumes[id],
			Type:           types.VolumeMountTypeVolume,
			SELinuxRelabel: types.SELinuxRelabelNone,
			ReadOnly:       false,
		})
	}
	return volumes
}

// extraHosts resolves the public host names and hostGatewayName to the host gateway, where the front door's port is
// published and the apps run.
func extraHosts(opts *Options) []string {
	hosts := []string{
		opts.Topology.AppHostName(),
		opts.Topology.PDFHostName(),
		opts.Topology.WorkflowEngineHostName(),
		opts.Topology.FrontendDevServerHostName(),
		opts.Topology.ArbeidsflateHostName(),
		hostGatewayName,
	}
	entries := make([]string, 0, len(hosts))
	for _, host := range hosts {
		entries = append(entries, host+":"+hostGateway)
	}
	return entries
}
