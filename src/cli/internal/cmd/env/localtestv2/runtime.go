package localtestv2

import (
	"flag"
	"strings"

	"altinn.studio/devenv/pkg/container"
	envtypes "altinn.studio/studioctl/internal/cmd/env"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/ui"
)

// UpOptions configures the localtest-v2 environment's startup: the shared options and the runtime's own flags.
type UpOptions struct {
	// DevComponents are the containers to build from source instead of pulling, by manifest name: the path to the
	// Dockerfile or to the directory holding it, empty for the current directory.
	DevComponents map[string]string
	// With and Without name the optional groups to start or leave out.
	With    []string
	Without []string
	Detach  bool
	// LatestImages runs the research images at "latest" instead of their pinned sha- tag.
	LatestImages bool
	OpenBrowser  bool
}

func noUpOptions() UpOptions {
	return UpOptions{
		DevComponents: nil,
		With:          nil,
		Without:       nil,
		Detach:        false,
		LatestImages:  false,
		OpenBrowser:   false,
	}
}

// Runtime is the localtest-v2 runtime: the platform's own services from the embedded manifest.
type Runtime struct {
	cfg   *config.Config
	flags UpOptions
}

// NewRuntime returns the localtest-v2 runtime for one command.
func NewRuntime(cfg *config.Config) *Runtime {
	return &Runtime{cfg: cfg, flags: noUpOptions()}
}

// Name returns the runtime name.
func (r *Runtime) Name() string {
	return Name
}

// UpUsage is the help of the runtime's own env up flags.
func (r *Runtime) UpUsage() []string {
	return []string{
		"  --latest         Run the research images at :latest instead of the pinned build",
		"  --dev-NAME[=PATH]",
		"                   Build the container NAME from PATH, a Dockerfile or a directory holding one",
		"                   (default: the current directory), and run it instead of the pinned image; NAME is one of",
		"                   " + strings.Join(DevContainers(), ", "),
		"  --with GROUP     Start an optional group: its containers and what they depend on (" +
			strings.Join(GroupNames(), ", ") + "; repeatable)",
		"  --without GROUP  Leave out an optional group's own containers (repeatable)",
	}
}

// BindUpFlags registers the runtime's own env up flags.
func (r *Runtime) BindUpFlags(fs *flag.FlagSet) {
	r.flags.DevComponents = map[string]string{}
	fs.BoolVar(&r.flags.LatestImages, "latest", false, "Run the research images at :latest")
	for _, name := range DevContainers() {
		fs.Var(
			&devFlag{name: name, dev: r.flags.DevComponents},
			"dev-"+name,
			"Build the container "+name+" from a Dockerfile",
		)
	}
	fs.Func("with", "Start an optional component group (repeatable)", func(value string) error {
		r.flags.With = append(r.flags.With, strings.TrimSpace(value))
		return nil
	})
	fs.Func("without", "Leave out an optional component group (repeatable)", func(value string) error {
		r.flags.Without = append(r.flags.Without, strings.TrimSpace(value))
		return nil
	})
}

// Env returns the localtest-v2 environment on client, starting with the bound flags.
//
//nolint:ireturn // the registry hands out runtimes by interface
func (r *Runtime) Env(client container.ContainerClient, out *ui.Output) envtypes.Env {
	env := NewEnv(r.cfg, out, client)
	env.flags = r.flags
	return env
}

// devFlag is --dev-<container>[=<path>]: a bare flag builds from the current directory (an empty path).
type devFlag struct {
	dev  map[string]string
	name string
}

func (d *devFlag) String() string {
	return ""
}

func (d *devFlag) Set(value string) error {
	value = strings.TrimSpace(value)
	if value == "true" {
		value = ""
	}
	d.dev[d.name] = value
	return nil
}

// IsBoolFlag lets the flag stand without a value.
func (d *devFlag) IsBoolFlag() bool {
	return true
}
