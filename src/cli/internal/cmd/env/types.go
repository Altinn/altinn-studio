// Package env defines contracts shared by env command implementations.
package env

import (
	"context"
	"errors"
)

// ErrAlreadyStopped is returned when a runtime has no resources to stop.
var ErrAlreadyStopped = errors.New("environment already stopped")

// Env manages a development environment lifecycle.
type Env interface {
	Preflight(ctx context.Context, opts UpOptions) error
	Up(ctx context.Context, opts UpOptions) error
	Down(ctx context.Context) error
	Logs(ctx context.Context, opts LogsOptions) error
	Name() string
}

// Installer optionally extends Env with install-time local filesystem setup.
type Installer interface {
	OnInstall(ctx context.Context) error
}

// Resetter optionally extends Env with destructive persisted-data reset support.
type Resetter interface {
	Reset(ctx context.Context) error
}

// UpOptions configures environment startup.
type UpOptions struct {
	// DevComponents are the localtest-v2 containers to build from source instead of pulling, by manifest name: the
	// path to the Dockerfile or to the directory holding it, empty for the current directory.
	DevComponents map[string]string
	// With and Without name the optional localtest-v2 component groups to start or leave out, over their defaults.
	With              []string
	Without           []string
	Detach            bool
	DevWorkflowEngine bool
	// LatestImages runs the localtest-v2 research images at "latest" instead of their pinned sha- tag.
	LatestImages bool
	Monitoring   bool
	OpenBrowser  bool
	PgAdmin      bool
}

// LogsOptions configures log streaming.
type LogsOptions struct {
	Component string
	Follow    bool
	JSON      bool
}
