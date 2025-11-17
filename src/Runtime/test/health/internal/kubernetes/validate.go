package kubernetes

import (
	"fmt"
	"os/exec"
)

// ValidateKubectl checks if kubectl is installed and available.
// This is only needed for the exec subcommand which still uses kubectl directly.
func ValidateKubectl() error {
	cmd := exec.Command("kubectl", "version", "--client")
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("kubectl not found or not working: %w", err)
	}
	return nil
}
