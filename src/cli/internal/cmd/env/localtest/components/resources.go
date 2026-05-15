package components

import (
	"fmt"
	"os"
	"path/filepath"
	"slices"

	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/osutil"
)

const localtestStorageDir = "AltinnPlatformLocal"

// ContainerSpec defines a container to run.
type ContainerSpec struct {
	HealthCheck    *types.HealthCheck
	Name           string
	Ports          []types.PortMapping
	Environment    map[string]string
	Volumes        []types.VolumeMount
	ExtraHosts     []string
	NetworkAliases []string
	Dependencies   []string
	Command        []string
	UseDefaultUser bool // When true, ignore host user override and use the image's default user.
}

// Options holds options for building the resource graph.
type Options struct {
	DevConfig         *DevImageConfig
	RuntimeUser       string // "uid:gid" to run containers as (prevents root-owned bind mount files)
	Images            config.ImagesConfig
	Paths             Paths
	Topology          envtopology.Local
	ImageMode         ImageMode
	DevWorkflowEngine bool
	IncludeMonitoring bool
	IncludePgAdmin    bool
}

// Paths contains localtest data paths used by component resources.
type Paths struct {
	DataDir  string
	InfraDir string
}

// NewPaths derives localtest component paths from the configured data directory.
func NewPaths(dataDir string) Paths {
	return Paths{
		DataDir:  dataDir,
		InfraDir: filepath.Join(dataDir, "infra"),
	}
}

// LocaltestStoragePath returns the host path used for localtest persisted storage.
func LocaltestStoragePath(dataDir string) string {
	return filepath.Join(dataDir, localtestStorageDir)
}

// EnsureLocaltestStorageDir creates the localtest persisted storage directory.
func EnsureLocaltestStorageDir(dataDir string) error {
	if err := os.MkdirAll(LocaltestStoragePath(dataDir), osutil.DirPermDefault); err != nil {
		return fmt.Errorf("create localtest storage directory: %w", err)
	}
	return nil
}

func newPort(hostPort, containerPort string) types.PortMapping {
	return types.PortMapping{
		HostPort:      hostPort,
		ContainerPort: containerPort,
		HostIP:        "127.0.0.1",
		Protocol:      "",
	}
}

func newVolume(hostPath, containerPath string) types.VolumeMount {
	return types.VolumeMount{
		HostPath:      hostPath,
		ContainerPath: containerPath,
		ReadOnly:      false,
		Type:          types.VolumeMountTypeBind,
	}
}

func newReadOnlyVolume(hostPath, containerPath string) types.VolumeMount {
	return types.VolumeMount{
		HostPath:      hostPath,
		ContainerPath: containerPath,
		ReadOnly:      true,
		Type:          types.VolumeMountTypeBind,
	}
}

func newNamedVolume(name, containerPath string) types.VolumeMount {
	return types.VolumeMount{
		HostPath:      name,
		ContainerPath: containerPath,
		ReadOnly:      false,
		Type:          types.VolumeMountTypeVolume,
	}
}

func newContainerSpec(
	name string,
	ports []types.PortMapping,
	env map[string]string,
	volumes []types.VolumeMount,
	networkAliases, deps, cmd []string,
) *ContainerSpec {
	return &ContainerSpec{
		HealthCheck:    nil,
		Name:           name,
		Ports:          ports,
		Environment:    env,
		Volumes:        volumes,
		ExtraHosts:     nil,
		NetworkAliases: networkAliases,
		Dependencies:   deps,
		Command:        cmd,
		UseDefaultUser: false,
	}
}

func buildCacheOptions(ref string) types.BuildOptions {
	if ref == "" || !config.IsCI() {
		return types.BuildOptions{
			CacheFrom: nil,
			CacheTo:   nil,
		}
	}

	opts := types.BuildOptions{
		CacheFrom: []string{"type=registry,ref=" + ref},
		CacheTo:   nil,
	}
	if config.IsTruthyEnv(os.Getenv(config.EnvRegistryCacheWrite)) {
		opts.CacheTo = []string{"type=registry,ref=" + ref + ",mode=max"}
	}
	return opts
}

func resourceEnabledRef(enabled bool) *bool {
	if enabled {
		return nil
	}
	return new(false)
}

func imageRef(ref, name string, enabled bool) string {
	if enabled {
		return ref
	}
	return "disabled.local/" + name + ":disabled"
}

func newContainerResource(
	spec *ContainerSpec,
	imageRes resource.ImageResource,
	network resource.ResourceRef,
	user string,
	enabled *bool,
) *resource.Container {
	containerUser := user
	if spec.UseDefaultUser {
		containerUser = ""
	}

	return &resource.Container{
		HealthCheck: spec.HealthCheck,
		Name:        spec.Name,
		Image:       resource.Ref(imageRes),
		Enabled:     enabled,
		Networks:    []resource.ResourceRef{network},
		DependsOn:   containerDependencyRefs(spec.Dependencies),
		Ports:       spec.Ports,
		Volumes:     spec.Volumes,
		Env:         toEnvSlice(spec.Environment),
		Labels:      nil,
		Command:     spec.Command,
		ExtraHosts:  spec.ExtraHosts,
		Lifecycle: resource.ContainerLifecycleOptions{
			LifecycleOptions: resource.LifecycleOptions{
				HandleDestroyError: nil,
				RetainOnDestroy:    false,
			},
			WaitForReady: true,
		},
		NetworkAliases: spec.NetworkAliases,
		RestartPolicy:  "",
		User:           containerUser,
	}
}

func containerDependencyRefs(names []string) []resource.ResourceRef {
	if len(names) == 0 {
		return nil
	}
	refs := make([]resource.ResourceRef, len(names))
	for i, name := range names {
		refs[i] = resource.RefID(resource.ContainerID(name))
	}
	return refs
}

func toEnvSlice(env map[string]string) []string {
	if len(env) == 0 {
		return nil
	}
	result := make([]string, 0, len(env))
	keys := make([]string, 0, len(env))
	for k := range env {
		keys = append(keys, k)
	}
	slices.Sort(keys)
	for _, k := range keys {
		result = append(result, k+"="+env[k])
	}
	return result
}
