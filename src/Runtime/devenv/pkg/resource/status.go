// Package resource provides a generalized IaC-style resource abstraction
// for managing infrastructure as a DAG of dependent resources.
package resource

import "fmt"

// Status represents the current state of a resource.
type Status int

const (
	// StatusUnknown means the resource state could not be determined.
	StatusUnknown Status = iota
	// StatusPending means the resource exists but is not ready to act yet.
	StatusPending
	// StatusCreating means reconciliation is actively creating the resource.
	StatusCreating
	// StatusReady means the resource is healthy and available.
	StatusReady
	// StatusFailed means reconciliation completed in a failed state.
	StatusFailed
	// StatusDestroying means reconciliation is actively removing the resource.
	StatusDestroying
	// StatusDestroyed means the resource no longer exists.
	StatusDestroyed
)

func (s Status) String() string {
	switch s {
	case StatusUnknown:
		return "unknown"
	case StatusPending:
		return "pending"
	case StatusCreating:
		return "creating"
	case StatusReady:
		return "ready"
	case StatusFailed:
		return "failed"
	case StatusDestroying:
		return "destroying"
	case StatusDestroyed:
		return "destroyed"
	default:
		return fmt.Sprintf("Status(%d)", s)
	}
}

// IsTerminal returns true if the status represents a final state.
func (s Status) IsTerminal() bool {
	return s == StatusReady || s == StatusFailed || s == StatusDestroyed
}

// IsHealthy returns true if the resource is in a healthy operational state.
func (s Status) IsHealthy() bool {
	return s == StatusReady
}
