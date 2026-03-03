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
	Preflight(ctx context.Context) error
	Up(ctx context.Context, opts UpOptions) error
	Down(ctx context.Context) error
	Logs(ctx context.Context, opts LogsOptions) error
}

// UpOptions configures environment startup.
type UpOptions struct {
	Port        int
	Detach      bool
	Monitoring  bool
	OpenBrowser bool
}

// LogsOptions configures log streaming.
type LogsOptions struct {
	Component string
	Follow    bool
}
