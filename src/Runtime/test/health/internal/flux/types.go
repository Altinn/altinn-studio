package flux

import "time"

// Condition represents a Kubernetes condition in FluxCD resources
type Condition struct {
	Type               string    `json:"type"`
	Status             string    `json:"status"` // True, False, Unknown
	Reason             string    `json:"reason"`
	Message            string    `json:"message"`
	LastTransitionTime time.Time `json:"lastTransitionTime"`
}

// Status represents the status field of FluxCD resources
type Status struct {
	Conditions []Condition `json:"conditions"`
}

// Metadata represents the metadata field
type Metadata struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
}

// HelmRelease represents a FluxCD HelmRelease resource
type HelmRelease struct {
	APIVersion string   `json:"apiVersion"`
	Kind       string   `json:"kind"`
	Metadata   Metadata `json:"metadata"`
	Status     Status   `json:"status"`
}

// Kustomization represents a FluxCD Kustomization resource
type Kustomization struct {
	APIVersion string   `json:"apiVersion"`
	Kind       string   `json:"kind"`
	Metadata   Metadata `json:"metadata"`
	Status     Status   `json:"status"`
}

// GetLatestCondition returns conditions with the most recent timestamp
// If multiple conditions share the same latest timestamp, all are returned
// in their original order. Otherwise, only the most recent condition is returned.
func GetLatestCondition(conditions []Condition) []Condition {
	if len(conditions) == 0 {
		return nil
	}

	// Find the latest timestamp
	latestTime := conditions[0].LastTransitionTime
	for _, cond := range conditions[1:] {
		if cond.LastTransitionTime.After(latestTime) {
			latestTime = cond.LastTransitionTime
		}
	}

	// Collect all conditions with the latest timestamp
	var result []Condition
	for _, cond := range conditions {
		if cond.LastTransitionTime.Equal(latestTime) {
			result = append(result, cond)
		}
	}

	return result
}
