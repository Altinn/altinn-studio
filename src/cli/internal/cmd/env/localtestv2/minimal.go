package localtestv2

import (
	"context"
	"errors"
	"fmt"
	"maps"
	"slices"
	"strconv"
	"strings"

	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/studioctl/internal/localtestv2"
	"altinn.studio/studioctl/internal/localtestv2/manifest"
)

// Minimal mode (env up --minimal) starts the manifest's minimal group in place of the default one: the front door,
// Storage and the workflow engine, and Postgres. The front door emulates the rest of the default group's HTTP
// containers, and nothing persists: every manifest volume of a started container is a tmpfs.
const (
	// ModeMinimal is the mode env status reports for minimal mode.
	ModeMinimal = "minimal"

	// appRoutesFileVariable is the front door's file of registered app routes. Empty keeps the routes in memory.
	appRoutesFileVariable = "Proxy__AppRoutesFile"

	// nothingToReset is what env reset says in minimal mode, which has no volumes.
	nothingToReset = "minimal mode keeps no data; nothing to reset"
)

// tmpfsMode makes every minimal-mode tmpfs writable for the image's own non-root user (Storage, the front door's app
// user), as the named volume was: a tmpfs mount point is root's, 0755, whatever the image's directory was.
const tmpfsMode = "mode=1777"

// tmpfsOptions bound a minimal-mode tmpfs, by manifest volume id: Storage's blobs are the app's uploads.
//
//nolint:gochecknoglobals // A constant table.
var tmpfsOptions = map[string]string{"storage-blobs": "size=1g," + tmpfsMode}

var (
	errMinimalWithGroups = errors.New(
		"--with and --without select optional groups of the default stack; the optional groups need the real " +
			"Register, Authentication and others, so they cannot run in minimal mode: drop --minimal",
	)
	errMinimalDev   = errors.New("not in minimal mode")
	errMinimalGroup = errors.New("the " + manifest.MinimalGroup + " group is not an optional group; use --minimal")
)

// emulated lists the containers the front door emulates in minimal mode: every HTTP container of the default group
// that the minimal group does not start. They are in the order the default group names its roots (the order env status
// prints), then any dependency of theirs in start order. Nil outside minimal mode.
func emulated(opts *Options) []string {
	if !opts.Minimal {
		return nil
	}
	running := selected(opts)
	group, _ := stack().Group(manifest.DefaultGroup)
	var out []string
	for _, name := range append(slices.Clone(group.Containers), stack().Select([]string{manifest.DefaultGroup})...) {
		if stack().Containers[name].IsHTTP() && !slices.Contains(running, name) && !slices.Contains(out, name) {
			out = append(out, name)
		}
	}
	return out
}

// frontDoorAddress is the front door's address in the network, which every emulated service's variable names.
func frontDoorAddress() string {
	return "http://" + frontDoor + ":" + strconv.Itoa(stack().Containers[frontDoor].HTTPPort())
}

// minimalEnv is what minimal mode adds to a container's environment: the front door keeps its app routes in memory.
func minimalEnv(opts *Options, name string) map[string]string {
	if !opts.Minimal || name != frontDoor {
		return nil
	}
	return map[string]string{appRoutesFileVariable: ""}
}

// manifestVolume mounts one of a container's manifest volumes: the named volume, or in minimal mode a tmpfs at its path.
func manifestVolume(opts *Options, id, path string) types.VolumeMount {
	if opts.Minimal {
		return types.VolumeMount{
			HostPath:       "",
			ContainerPath:  path,
			Type:           types.VolumeMountTypeTmpfs,
			SELinuxRelabel: types.SELinuxRelabelNone,
			Options:        tmpfsOptionsOf(id),
			ReadOnly:       false,
		}
	}
	return types.VolumeMount{
		HostPath:       volumeName(id),
		ContainerPath:  path,
		Type:           types.VolumeMountTypeVolume,
		SELinuxRelabel: types.SELinuxRelabelNone,
		Options:        "",
		ReadOnly:       false,
	}
}

// checkMinimal refuses what minimal mode cannot run: the optional groups, and a dev build of a container it does
// not start.
func checkMinimal(opts UpOptions) error {
	if !opts.Minimal {
		return nil
	}
	if len(opts.With) > 0 || len(opts.Without) > 0 {
		return errMinimalWithGroups
	}
	minimal := defaultOptions("", "")
	minimal.Minimal = true
	running := selected(minimal)
	for _, name := range slices.Sorted(maps.Keys(opts.DevComponents)) {
		if slices.Contains(running, name) {
			continue
		}
		if slices.Contains(emulated(minimal), name) {
			return fmt.Errorf(
				"%w: --dev-%s: %s is emulated in the localtest container in minimal mode; build it with the "+
					"default stack (drop --minimal)",
				errMinimalDev, name, name,
			)
		}
		if _, known := stack().Containers[name]; known {
			return fmt.Errorf(
				"%w: --dev-%s: minimal mode starts only %s", errMinimalDev, name, strings.Join(running, ", "),
			)
		}
	}
	return nil
}

// stopOnSwitch stops the running environment when it runs in the other mode or at another public origin: a switch
// between the default stack and minimal mode, or to another host or port, is down, then up, so no container of one
// keeps running beside the other.
func (e *Env) stopOnSwitch(ctx context.Context, opts *Options) error {
	state, up, err := localtestv2.ReadState(e.cfg)
	if err != nil {
		return fmt.Errorf("read localtest-v2 state: %w", err)
	}
	current := state.Origin()
	if !up || (state.Minimal == opts.Minimal && current.Host == opts.Origin.Host && current.Port == opts.Origin.Port) {
		return nil
	}
	hasResources, err := e.hasManagedResources(ctx)
	if err != nil || !hasResources {
		return err
	}
	if err := e.teardown(ctx, stoppingMessage); err != nil {
		return fmt.Errorf("stop the environment running in the other mode or at the other origin: %w", err)
	}
	return nil
}

// tmpfsOptionsOf are the options of the tmpfs for a manifest volume id.
func tmpfsOptionsOf(id string) string {
	if options, ok := tmpfsOptions[id]; ok {
		return options
	}
	return tmpfsMode
}
