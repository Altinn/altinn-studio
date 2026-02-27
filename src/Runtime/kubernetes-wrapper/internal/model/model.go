// Package model contains API response models.
package model

// DeployedResource is the API model returned for a deployment-like resource.
type DeployedResource struct {
	Version string `json:"version,omitempty"`
	Release string `json:"release,omitempty"`
}
