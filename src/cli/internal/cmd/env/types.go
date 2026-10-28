// Package env defines contracts shared by env command implementations.
package env

import (
	"context"
	"errors"
	"flag"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/studioctl/internal/ui"
)

// ErrAlreadyStopped is returned when a runtime has no resources to stop.
var ErrAlreadyStopped = errors.New("environment already stopped")

// Runtime is one kind of local environment studioctl can run (`env up -r <name>`). A Runtime value serves one command:
// BindUpFlags registers the runtime's own `env up` flags, and the Env it returns starts with what was parsed into
// them.
type Runtime interface {
	// Name is the runtime's -r value.
	Name() string
	// UpUsage is the help of the runtime's own `env up` flags, one line each, aligned like the shared ones.
	UpUsage() []string
	// BindUpFlags registers the runtime's own `env up` flags on fs.
	BindUpFlags(fs *flag.FlagSet)
	// Env returns the runtime's environment on client. client may be nil for what needs no container runtime
	// (Installer).
	Env(client container.ContainerClient, out *ui.Output) Env
}

// Env manages one runtime's environment.
type Env interface {
	Name() string
	// Active reports whether any of the runtime's containers is running, read from the container runtime rather
	// than from a record studioctl keeps, so it holds after a reboot or a container removed by hand.
	Active(ctx context.Context) (bool, error)
	// Up checks the prerequisites and starts the environment with the runtime's bound flags and opts, or reports that
	// it already runs as asked.
	Up(ctx context.Context, opts UpOptions) (UpResult, error)
	Down(ctx context.Context) error
	Status(ctx context.Context) (*Status, error)
	Logs(ctx context.Context, opts LogsOptions) error
}

// Installer optionally extends Env with install-time local filesystem setup.
type Installer interface {
	OnInstall(ctx context.Context) error
}

// Resetter optionally extends Env with destructive persisted-data reset support.
type Resetter interface {
	Reset(ctx context.Context) error
}

// UpOptions are the `env up` options every runtime takes. A runtime's own options are its bound flags.
type UpOptions struct {
	Detach      bool
	OpenBrowser bool
}

// UpResult is what `env up` did.
type UpResult struct {
	// AlreadyRunning is set when the environment already ran as asked and nothing was started.
	AlreadyRunning bool
}

// LogsOptions configures log streaming.
type LogsOptions struct {
	Component string
	Follow    bool
	JSON      bool
}
