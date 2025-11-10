package container

import (
	"fmt"
	"io"
	"os/exec"

	"altinn.studio/runtime-fixture/pkg/container/docker"
	"altinn.studio/runtime-fixture/pkg/container/podman"
)

// ContainerClient provides a common interface for docker and podman operations
type ContainerClient interface {
	// Build builds a container image from a Dockerfile
	Build(context, dockerfile, tag string) error

	// Push pushes an image to a registry
	Push(image string) error

	// Run creates and runs a container with the specified arguments
	Run(args ...string) error

	// Inspect inspects a container with a format string and returns the output
	Inspect(target, format string) (string, error)

	// ImageInspect inspects an image with a format string and returns the output
	ImageInspect(image, format string) (string, error)

	// Exec executes a command in a container
	Exec(container string, args ...string) error

	// ExecWithStdin executes a command in a container with stdin
	ExecWithStdin(container string, stdin io.Reader, args ...string) error

	// NetworkConnect connects a container to a network
	NetworkConnect(network, container string) error

	// RunInteractive runs a container with stdin/stdout/stderr streaming
	RunInteractive(stdin io.Reader, stdout, stderr io.Writer, args ...string) error

	// Name returns the name of the container runtime ("docker" or "podman")
	Name() string
}

// Detect detects which container runtime is available on the system
// It tries docker first, then podman
func Detect() (ContainerClient, error) {
	// Try docker first
	if _, err := exec.LookPath("docker"); err == nil {
		return &docker.Cli{}, nil
	}

	// Try podman
	if _, err := exec.LookPath("podman"); err == nil {
		return &podman.Cli{}, nil
	}

	// TODO
	// - nerdctl?
	// - colima?
	// - apple/container?

	return nil, fmt.Errorf("neither docker nor podman is installed")
}

var _ ContainerClient = (*podman.Cli)(nil)
var _ ContainerClient = (*docker.Cli)(nil)
