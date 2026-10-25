package localtest

import (
	"flag"

	"altinn.studio/devenv/pkg/container"
	envtypes "altinn.studio/studioctl/internal/cmd/env"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/ui"
)

// Name is the runtime's name on the command line (-r localtest).
const Name = "localtest"

// UpOptions configures the localtest environment's startup: the shared options and the runtime's own flags.
type UpOptions struct {
	Detach bool
	// DevWorkflowEngine routes the workflow engine to a process on the host (--dev-workflow-engine, hidden).
	DevWorkflowEngine bool
	Monitoring        bool
	OpenBrowser       bool
	PgAdmin           bool
}

// Runtime is the localtest runtime: localtest's emulation of the platform, with the PDF generator and the workflow
// engine.
type Runtime struct {
	cfg   *config.Config
	flags UpOptions
}

// NewRuntime returns the localtest runtime for one command.
func NewRuntime(cfg *config.Config) *Runtime {
	return &Runtime{
		cfg: cfg,
		flags: UpOptions{
			Detach:            false,
			DevWorkflowEngine: false,
			Monitoring:        false,
			OpenBrowser:       false,
			PgAdmin:           false,
		},
	}
}

// Name returns the runtime name.
func (r *Runtime) Name() string {
	return Name
}

// UpUsage is the help of the runtime's own env up flags. --dev-workflow-engine is left out on purpose: it is a
// contributor's switch.
func (r *Runtime) UpUsage() []string {
	return []string{
		"  --monitoring     Start monitoring stack",
		"  --pgadmin        Start pgAdmin for the workflow-engine database",
	}
}

// BindUpFlags registers the runtime's own env up flags.
func (r *Runtime) BindUpFlags(fs *flag.FlagSet) {
	fs.BoolVar(&r.flags.Monitoring, "monitoring", false, "Start monitoring stack")
	fs.BoolVar(&r.flags.PgAdmin, "pgadmin", false, "Start pgAdmin for the workflow-engine database")
	fs.BoolVar(&r.flags.DevWorkflowEngine, "dev-workflow-engine", false, "Route workflow-engine to a host process")
}

// Env returns the localtest environment on client, starting with the bound flags.
//
//nolint:ireturn // the registry hands out runtimes by interface
func (r *Runtime) Env(client container.ContainerClient, out *ui.Output) envtypes.Env {
	env := NewEnv(r.cfg, out, client)
	env.flags = r.flags
	return env
}
