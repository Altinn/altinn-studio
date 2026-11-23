// Package ocibackend applies OCI publishing resource graph resources.
package ocibackend

import (
	"context"
	"errors"
	"fmt"

	"altinn.studio/devenv/pkg/helm"
	"altinn.studio/devenv/pkg/oci"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/devenv/pkg/resource/executor"
)

var errUnsupportedResource = errors.New("unsupported OCI backend resource")

// Backend applies OCI artifact publication resources.
type Backend struct {
	oci  ociOperations
	helm helmOperations
}

type ociOperations interface {
	PushArtifact(url, path, source, revision string) error
}

type helmOperations interface {
	PushChart(chartPath, ociRef string) error
}

// New creates an OCI publishing resource backend.
func New() *Backend {
	return &Backend{
		oci:  oci.NewClient(),
		helm: helm.NewClient(),
	}
}

// Supports reports whether this backend can apply and observe r.
func (b *Backend) Supports(r resource.Resource) bool {
	switch r.(type) {
	case *resource.OCIArtifact:
		return true
	default:
		return false
	}
}

// Apply creates or updates one supported resource.
func (b *Backend) Apply(
	_ context.Context,
	_ executor.BackendContext,
	r resource.Resource,
) (executor.Output, error) {
	switch res := r.(type) {
	case *resource.OCIArtifact:
		return executor.NoOutput{}, b.applyOCIArtifact(res)
	default:
		return nil, fmt.Errorf("%w: %T", errUnsupportedResource, r)
	}
}

// Observe reads current runtime state for one supported resource.
func (b *Backend) Observe(
	_ context.Context,
	_ executor.BackendContext,
	r resource.Resource,
) (executor.ObservedResource, error) {
	switch r.(type) {
	case *resource.OCIArtifact:
		return executor.ObservedResource{
			Resource: r,
			Status:   executor.StatusReady,
			Type:     executor.ResourceTypeOCI,
			Managed:  false,
		}, nil
	default:
		return executor.ObservedResource{}, fmt.Errorf("%w: %T", errUnsupportedResource, r)
	}
}

// Destroy removes one observed runtime resource.
func (b *Backend) Destroy(context.Context, resource.ResourceID, executor.ObservedResource) error {
	return nil
}

func (b *Backend) applyOCIArtifact(artifact *resource.OCIArtifact) error {
	if artifact.Format == resource.OCIArtifactFormatHelmChart {
		return b.applyHelmChartArtifact(artifact)
	}
	source := artifact.Source
	if source == "" {
		source = "local"
	}
	revision := artifact.Revision
	if revision == "" {
		revision = "local"
	}
	if err := b.oci.PushArtifact(artifact.URL, artifact.Path, source, revision); err != nil {
		return fmt.Errorf("push OCI artifact %s: %w", artifact.Name, err)
	}
	return nil
}

func (b *Backend) applyHelmChartArtifact(artifact *resource.OCIArtifact) error {
	if err := b.helm.PushChart(artifact.Path, artifact.URL); err != nil {
		return fmt.Errorf("push helm chart artifact %s: %w", artifact.Name, err)
	}
	return nil
}

var _ executor.Backend = (*Backend)(nil)
