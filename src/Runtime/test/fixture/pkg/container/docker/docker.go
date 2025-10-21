package docker

import (
	"fmt"
	"io"
	"os/exec"
	"strings"
)

// Cli implements ContainerClient for Docker
type Cli struct{}

func (d *Cli) Build(context, dockerfile, tag string) error {
	cmd := exec.Command(d.Name(), "build", "-t", tag, "-f", dockerfile, context)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("docker build failed: %w\nOutput: %s", err, string(output))
	}
	return nil
}

func (d *Cli) Push(image string) error {
	cmd := exec.Command(d.Name(), "push", image)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("docker push failed: %w\nOutput: %s", err, string(output))
	}
	return nil
}

func (d *Cli) Run(args ...string) error {
	cmd := exec.Command(d.Name(), args...)
	return cmd.Run()
}

func (d *Cli) Inspect(target, format string) (string, error) {
	cmd := exec.Command(d.Name(), "inspect", "-f", format, target)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(output)), nil
}

func (d *Cli) ImageInspect(image, format string) (string, error) {
	cmd := exec.Command(d.Name(), "image", "inspect", image)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("failed to inspect image %s: %w\nOutput: %s", image, err, string(output))
	}
	return string(output), nil
}

func (d *Cli) Exec(container string, args ...string) error {
	execArgs := append([]string{"exec", container}, args...)
	cmd := exec.Command(d.Name(), execArgs...)
	return cmd.Run()
}

func (d *Cli) ExecWithStdin(container string, stdin io.Reader, args ...string) error {
	execArgs := append([]string{"exec", "-i", container}, args...)
	cmd := exec.Command(d.Name(), execArgs...)
	cmd.Stdin = stdin
	return cmd.Run()
}

func (d *Cli) NetworkConnect(network, container string) error {
	cmd := exec.Command(d.Name(), "network", "connect", network, container)
	return cmd.Run()
}

func (d *Cli) RunInteractive(stdin io.Reader, stdout, stderr io.Writer, args ...string) error {
	cmd := exec.Command(d.Name(), args...)
	cmd.Stdin = stdin
	cmd.Stdout = stdout
	cmd.Stderr = stderr
	return cmd.Run()
}

func (d *Cli) Name() string {
	return "docker"
}
