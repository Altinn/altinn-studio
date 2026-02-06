package runtimes

type ContainerRuntime interface {
	// Run ensures the container runtime runs
	// This function is idempotent
	Run() error

	// Stop ensures that the runtime is stopped
	// It is idempotent, so it is OK and returns a nil error if the runtime doesn't already run
	Stop() error
}
