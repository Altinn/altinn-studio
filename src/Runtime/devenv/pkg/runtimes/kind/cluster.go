package kind

import (
	"fmt"
	"os"
	"slices"
)

func writeKindStdoutf(format string, args ...any) {
	if _, err := fmt.Fprintf(os.Stdout, format, args...); err != nil {
		return
	}
}

// clusterExists checks if a kind cluster with the given name exists.
func (r *KindContainerRuntime) clusterExists() (bool, error) {
	clusters, err := r.KindClient.GetClusters()
	if err != nil {
		return false, fmt.Errorf("checking kind clusters: %w", err)
	}

	if slices.Contains(clusters, r.clusterName) {
		return true, nil
	}

	return false, nil
}
