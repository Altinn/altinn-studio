package podman

import (
	"bytes"
	"fmt"
	"io"
	"os/exec"
	"strings"
)

// Cli implements ContainerClient for Podman
type Cli struct{}

func (p *Cli) Build(context, dockerfile, tag string) error {
	cmd := exec.Command(p.Name(), "build", "-t", tag, "-f", dockerfile, context)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("podman build failed: %w\nOutput: %s", err, string(output))
	}
	return nil
}

func (p *Cli) Push(image string) error {
	// Podman requires --tls-verify=false for insecure registries
	cmd := exec.Command(p.Name(), "push", "--tls-verify=false", image)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("podman push failed: %w\nOutput: %s", err, string(output))
	}
	return nil
}

func (p *Cli) Run(args ...string) error {
	cmd := exec.Command(p.Name(), args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("podman run failed: %w\nOutput: %s", err, string(output))
	}
	return nil
}

func (p *Cli) Inspect(target, format string) (string, error) {
	cmd := exec.Command(p.Name(), "inspect", "-f", format, target)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(output)), nil
}

func (p *Cli) ImageInspect(image, format string) (string, error) {
	args := []string{"image", "inspect"}
	if format != "" {
		args = append(args, "-f", format)
	}
	args = append(args, image)
	cmd := exec.Command(p.Name(), args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("failed to inspect image %s: %w\nOutput: %s", image, err, string(output))
	}
	return strings.TrimSpace(string(output)), nil
}

func (p *Cli) Exec(container string, args ...string) error {
	execArgs := append([]string{"exec", container}, args...)
	cmd := exec.Command(p.Name(), execArgs...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("podman exec failed: %w\nOutput: %s", err, string(output))
	}
	return nil
}

func (p *Cli) ExecWithStdin(container string, stdin io.Reader, args ...string) error {
	execArgs := append([]string{"exec", "-i", container}, args...)
	cmd := exec.Command(p.Name(), execArgs...)
	cmd.Stdin = stdin
	var output bytes.Buffer
	cmd.Stdout = &output
	cmd.Stderr = &output
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("podman exec failed: %w\nOutput: %s", err, output.String())
	}
	return nil
}

func (p *Cli) NetworkConnect(network, container string) error {
	cmd := exec.Command(p.Name(), "network", "connect", network, container)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("podman network connect failed: %w\nOutput: %s", err, string(output))
	}
	return nil
}

func (p *Cli) RunInteractive(stdin io.Reader, stdout, stderr io.Writer, args ...string) error {
	cmd := exec.Command(p.Name(), args...)
	cmd.Stdin = stdin
	cmd.Stdout = stdout
	cmd.Stderr = stderr
	return cmd.Run()
}

func (p *Cli) Name() string {
	return "podman"
}
