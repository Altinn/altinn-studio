package kubernetes

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"
)

// KubernetesClient wraps kubectl CLI operations
type KubernetesClient struct {
	kubectlBin string
}

// New creates a new KubernetesClient with the given kubectl binary path
func New(kubectlBinPath string) (*KubernetesClient, error) {
	if _, err := os.Stat(kubectlBinPath); err != nil {
		return nil, fmt.Errorf("kubectl binary stat error: %w", err)
	}
	return &KubernetesClient{
		kubectlBin: kubectlBinPath,
	}, nil
}

// ApplyManifest applies Kubernetes manifest YAML content using kubectl apply
// This function is idempotent - it can be called multiple times safely
func (c *KubernetesClient) ApplyManifest(yaml string) (string, error) {
	cmd := exec.Command(c.kubectlBin, "apply", "-f", "-")
	cmd.Stdin = strings.NewReader(yaml)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("failed to apply manifest: %w\nOutput: %s", err, string(output))
	}
	return string(output), nil
}

// Get checks if a Kubernetes resource exists
// Returns nil if the resource exists, error otherwise
func (c *KubernetesClient) Get(resource, name, namespace string) error {
	args := []string{"get", resource}
	if name != "" {
		args = append(args, name)
	}
	if namespace != "" {
		args = append(args, "-n", namespace)
	}

	cmd := exec.Command(c.kubectlBin, args...)
	if err := cmd.Run(); err != nil {
		return err
	}
	return nil
}

// CRDExists checks if a CustomResourceDefinition exists in the cluster
// Returns true if the CRD exists, false otherwise
func (c *KubernetesClient) CRDExists(crdName string) (bool, error) {
	cmd := exec.Command(c.kubectlBin, "get", "crd", crdName)
	output, err := cmd.CombinedOutput()
	if err != nil {
		// Check if it's a NotFound error (CRD doesn't exist)
		if strings.Contains(string(output), "NotFound") {
			return false, nil
		}
		// Real error - return it with context
		return false, fmt.Errorf("failed to check CRD existence: %w\nOutput: %s", err, string(output))
	}
	return true, nil
}

// GetWithJSONPath retrieves a specific field from a Kubernetes resource using JSONPath
// Returns the field value as a string, or error if the resource doesn't exist or JSONPath is invalid
func (c *KubernetesClient) GetWithJSONPath(resource, name, namespace, jsonPath string) (string, error) {
	args := []string{"get", resource}
	if name != "" {
		args = append(args, name)
	}
	if namespace != "" {
		args = append(args, "-n", namespace)
	}
	args = append(args, "-o", "jsonpath="+jsonPath)

	cmd := exec.Command(c.kubectlBin, args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("failed to get resource with jsonpath: %w\nOutput: %s", err, string(output))
	}

	return strings.TrimSpace(string(output)), nil
}

// ConfigUseContext sets the kubectl context
func (c *KubernetesClient) ConfigUseContext(contextName string) error {
	cmd := exec.Command(c.kubectlBin, "config", "use-context", contextName)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to set kubectl context: %w", err)
	}
	return nil
}

// RolloutStatus waits for a deployment rollout to complete
// Returns an error if the rollout fails or times out
func (c *KubernetesClient) RolloutStatus(deployment, namespace string, timeout time.Duration) error {
	args := []string{
		"rollout", "status",
		"deployment/" + deployment,
		"-n", namespace,
	}

	if timeout > 0 {
		args = append(args, fmt.Sprintf("--timeout=%s", timeout))
	}

	cmd := exec.Command(c.kubectlBin, args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed waiting for %s: %w\nOutput: %s", deployment, err, string(output))
	}

	return nil
}

// LogOptions configures how logs should be collected
type LogOptions struct {
	// Namespace to collect logs from
	Namespace string

	// LabelSelector to filter pods (e.g., "app=pdf3-proxy")
	LabelSelector string

	// ContainerName to collect logs from (if empty, collects from all containers)
	ContainerName string

	// OutputPath where logs should be written (if empty, returns logs as string)
	OutputPath string

	// SinceSeconds only return logs newer than a relative duration (0 means all logs)
	SinceSeconds int

	// Prefix each log line with the pod name
	Prefix bool

	// IgnoreErrors continues collecting logs even if some containers fail
	IgnoreErrors bool
}

// CollectLogs collects logs from pods matching the specified criteria
// If OutputPath is specified, writes logs to that file. Otherwise returns logs as error message.
func (c *KubernetesClient) CollectLogs(opts LogOptions) error {
	args := []string{"logs"}

	if opts.Namespace != "" {
		args = append(args, "-n", opts.Namespace)
	}

	if opts.LabelSelector != "" {
		args = append(args, "-l", opts.LabelSelector)
	}

	if opts.ContainerName != "" {
		args = append(args, "-c", opts.ContainerName)
	}

	if opts.Prefix {
		args = append(args, "--prefix=true")
	}

	if opts.SinceSeconds > 0 {
		args = append(args, fmt.Sprintf("--since=%ds", opts.SinceSeconds))
	}

	if opts.IgnoreErrors {
		args = append(args, "--ignore-errors=true")
	}

	cmd := exec.Command(c.kubectlBin, args...)

	// If output path is specified, write directly to file
	if opts.OutputPath != "" {
		outFile, err := os.Create(opts.OutputPath)
		if err != nil {
			return fmt.Errorf("failed to create log file: %w", err)
		}
		defer func() { _ = outFile.Close() }()

		cmd.Stdout = outFile
		cmd.Stderr = outFile

		if err := cmd.Run(); err != nil {
			// Log the error but don't fail - some containers might not have logs
			_, _ = fmt.Fprintf(outFile, "\nWarning: kubectl logs command failed: %v\n", err)
		}

		return nil
	}

	// Otherwise return output as part of error if command fails
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to collect logs: %w\nOutput: %s", err, string(output))
	}

	return nil
}
