package flux

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"time"
)

// FluxClient wraps flux CLI operations
type FluxClient struct {
	fluxBin string
}

// New creates a new FluxClient with the given flux binary path
func New(fluxBinPath string) (*FluxClient, error) {
	if _, err := os.Stat(fluxBinPath); err != nil {
		return nil, fmt.Errorf("flux binary stat error: %w", err)
	}
	return &FluxClient{
		fluxBin: fluxBinPath,
	}, nil
}

// ReconcileOptions configures how a reconcile operation should be executed
type ReconcileOptions struct {
	// ShouldWait determines if the operation should block until completion (true)
	// or run asynchronously in a goroutine with logging (false)
	ShouldWait bool

	// Timeout specifies the maximum duration for the operation.
	// A value of 0 means no timeout.
	Timeout time.Duration
}

// DefaultReconcileOptions returns ReconcileOptions with sensible defaults
// (blocking with no timeout)
func DefaultReconcileOptions() ReconcileOptions {
	return ReconcileOptions{
		ShouldWait: true,
		Timeout:    0,
	}
}

// Install installs Flux to the cluster with the specified components
func (c *FluxClient) Install(components []string) error {
	args := []string{"install"}
	if len(components) > 0 {
		componentList := ""
		for i, comp := range components {
			if i > 0 {
				componentList += ","
			}
			componentList += comp
		}
		args = append(args, "--components="+componentList)
	}

	cmd := exec.Command(c.fluxBin, args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to install flux: %w\nOutput: %s", err, string(output))
	}

	return nil
}

// PushArtifact pushes an OCI artifact to a registry
func (c *FluxClient) PushArtifact(url, path, source, revision string) error {
	args := []string{
		"push", "artifact",
		url,
		"--path", path,
		"--source", source,
		"--revision", revision,
	}

	cmd := exec.Command(c.fluxBin, args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to push artifact: %w\nOutput: %s", err, string(output))
	}

	return nil
}

// ReconcileHelmRelease reconciles a HelmRelease resource
func (c *FluxClient) ReconcileHelmRelease(name, namespace string, withSource bool, opts ReconcileOptions) error {
	args := []string{
		"reconcile", "helmrelease",
		name,
		"-n", namespace,
	}

	if withSource {
		args = append(args, "--with-source")
	}

	return c.runReconcile("HelmRelease", name, namespace, args, opts)
}

// ReconcileKustomization reconciles a Kustomization resource
func (c *FluxClient) ReconcileKustomization(name, namespace string, withSource bool, opts ReconcileOptions) error {
	args := []string{
		"reconcile", "kustomization",
		name,
		"-n", namespace,
	}

	if withSource {
		args = append(args, "--with-source")
	}

	return c.runReconcile("Kustomization", name, namespace, args, opts)
}

// runReconcile executes a reconcile command with the given options
func (c *FluxClient) runReconcile(resourceType, name, namespace string, args []string, opts ReconcileOptions) error {
	if opts.ShouldWait {
		// Synchronous execution
		return c.runCommandSync(args, opts.Timeout)
	}

	// Asynchronous execution
	go c.runCommandAsync(resourceType, name, namespace, args, opts.Timeout)
	return nil
}

// runCommandSync runs a flux command synchronously and returns any errors
func (c *FluxClient) runCommandSync(args []string, timeout time.Duration) error {
	ctx := context.Background()
	if timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, timeout)
		defer cancel()
	}

	cmd := exec.CommandContext(ctx, c.fluxBin, args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			return fmt.Errorf("flux command timed out after %s: %w\nOutput: %s", timeout, err, string(output))
		}
		return fmt.Errorf("flux command failed: %w\nOutput: %s", err, string(output))
	}

	return nil
}

// runCommandAsync runs a flux command asynchronously in a goroutine, logging only on failure
func (c *FluxClient) runCommandAsync(resourceType, name, namespace string, args []string, timeout time.Duration) {
	ctx := context.Background()
	if timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, timeout)
		defer cancel()
	}

	identifier := fmt.Sprintf("%s/%s (namespace: %s)", resourceType, name, namespace)

	cmd := exec.CommandContext(ctx, c.fluxBin, args...)
	output, err := cmd.CombinedOutput()

	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			fmt.Fprintf(os.Stderr, "Flux reconcile for %s timed out after %s\nOutput: %s\n", identifier, timeout, string(output))
		} else {
			fmt.Fprintf(os.Stderr, "Flux reconcile for %s failed: %v\nOutput: %s\n", identifier, err, string(output))
		}
	}
}
