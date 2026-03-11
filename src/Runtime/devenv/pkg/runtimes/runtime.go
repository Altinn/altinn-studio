// Package runtimes defines the shared runtime abstraction used by devenv.
package runtimes

// ContainerRuntime defines the lifecycle operations supported by a runtime backend.
type ContainerRuntime interface {
	// Run ensures the container runtime runs
	// This function is idempotent
	Run() error

	// Stop ensures that the runtime is stopped
	// It is idempotent, so it is OK and returns a nil error if the runtime doesn't already run
	Stop() error
}
