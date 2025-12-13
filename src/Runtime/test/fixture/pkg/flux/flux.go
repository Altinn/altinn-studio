package flux

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/fluxcd/flux2/v2/pkg/manifestgen/install"
	helmv2 "github.com/fluxcd/helm-controller/api/v2"
	kustomizev1 "github.com/fluxcd/kustomize-controller/api/v1"
	"github.com/fluxcd/pkg/apis/meta"
	ociclient "github.com/fluxcd/pkg/oci/client"
	sourcev1 "github.com/fluxcd/source-controller/api/v1"

	"altinn.studio/runtime-fixture/pkg/kubernetes"
)

var (
	// Flux resource types for kubectl (kind.group format)
	helmRepositoryResource = strings.ToLower(sourcev1.HelmRepositoryKind) + "." + sourcev1.GroupVersion.Group
	helmReleaseResource    = strings.ToLower(helmv2.HelmReleaseKind) + "." + helmv2.GroupVersion.Group
	kustomizationResource  = strings.ToLower(kustomizev1.KustomizationKind) + "." + kustomizev1.GroupVersion.Group
	ociRepositoryResource  = strings.ToLower(sourcev1.OCIRepositoryKind) + "." + sourcev1.GroupVersion.Group
)

// FluxClient provides Flux operations using native Go packages
type FluxClient struct {
	kubeClient *kubernetes.KubernetesClient
	ociClient  *ociclient.Client
}

// New creates a new FluxClient with the given KubernetesClient
func New(kubeClient *kubernetes.KubernetesClient) (*FluxClient, error) {
	if kubeClient == nil {
		return nil, fmt.Errorf("kubeClient is required")
	}

	ociClient := ociclient.NewClient(ociclient.DefaultOptions())

	return &FluxClient{
		kubeClient: kubeClient,
		ociClient:  ociClient,
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
	opts := install.MakeDefaultOptions()
	opts.Components = components

	// Generate install manifests
	manifest, err := install.Generate(opts, "")
	if err != nil {
		return fmt.Errorf("failed to generate flux install manifests: %w", err)
	}

	// Apply manifests via kubectl
	if _, err := c.kubeClient.ApplyManifest(manifest.Content); err != nil {
		return fmt.Errorf("failed to apply flux install manifests: %w", err)
	}

	return nil
}

// PushArtifact pushes an OCI artifact to a registry
func (c *FluxClient) PushArtifact(url, path, source, revision string) error {
	ctx := context.Background()

	// Parse the OCI URL to strip the oci:// prefix
	ref, err := ociclient.ParseArtifactURL(url)
	if err != nil {
		return fmt.Errorf("invalid URL: %w", err)
	}

	metadata := ociclient.Metadata{
		Source:   source,
		Revision: revision,
	}

	_, err = c.ociClient.Push(ctx, ref, path,
		ociclient.WithPushMetadata(metadata),
		ociclient.WithPushLayerType(ociclient.LayerTypeTarball),
	)
	if err != nil {
		return fmt.Errorf("failed to push artifact to %s: %w", url, err)
	}

	return nil
}

// ReconcileHelmRepository reconciles a HelmRepository source
func (c *FluxClient) ReconcileHelmRepository(name, namespace string, opts ReconcileOptions) error {
	return c.reconcile(helmRepositoryResource, name, namespace, opts)
}

// ReconcileHelmRelease reconciles a HelmRelease resource
func (c *FluxClient) ReconcileHelmRelease(name, namespace string, withSource bool, opts ReconcileOptions) error {
	if withSource {
		if err := c.reconcileSource(helmReleaseResource, name, namespace, opts); err != nil {
			return err
		}
	}
	return c.reconcile(helmReleaseResource, name, namespace, opts)
}

// ReconcileKustomization reconciles a Kustomization resource
func (c *FluxClient) ReconcileKustomization(name, namespace string, withSource bool, opts ReconcileOptions) error {
	if withSource {
		if err := c.reconcileSource(kustomizationResource, name, namespace, opts); err != nil {
			return err
		}
	}
	return c.reconcile(kustomizationResource, name, namespace, opts)
}

// reconcileSource reconciles the source referenced by a HelmRelease or Kustomization
func (c *FluxClient) reconcileSource(resource, name, namespace string, opts ReconcileOptions) error {
	sourceRef, err := c.kubeClient.GetSourceRef(resource, name, namespace)
	if err != nil {
		return fmt.Errorf("failed to get sourceRef for %s/%s: %w", resource, name, err)
	}

	sourceResource := kindToResource(sourceRef.Kind)
	if sourceResource == "" {
		return fmt.Errorf("unknown source kind: %s", sourceRef.Kind)
	}

	return c.reconcile(sourceResource, sourceRef.Name, sourceRef.Namespace, opts)
}

// reconcile triggers reconciliation of a Flux resource by setting the reconcile annotation
func (c *FluxClient) reconcile(resource, name, namespace string, opts ReconcileOptions) error {
	timestamp := time.Now().Format(time.RFC3339Nano)

	if err := c.kubeClient.Annotate(resource, name, namespace, meta.ReconcileRequestAnnotation, timestamp); err != nil {
		return fmt.Errorf("failed to annotate %s/%s: %w", resource, name, err)
	}

	if !opts.ShouldWait {
		go func() {
			if err := c.waitForReady(resource, name, namespace, opts.Timeout); err != nil {
				fmt.Fprintf(os.Stderr, "Flux reconcile for %s/%s (namespace: %s) failed: %v\n", resource, name, namespace, err)
			}
		}()
		return nil
	}

	return c.waitForReady(resource, name, namespace, opts.Timeout)
}

// waitForReady polls until the resource's Ready condition is True or timeout
func (c *FluxClient) waitForReady(resource, name, namespace string, timeout time.Duration) error {
	ctx := context.Background()
	if timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, timeout)
		defer cancel()
	}

	identifier := fmt.Sprintf("%s/%s (namespace: %s)", resource, name, namespace)
	pollInterval := 100 * time.Millisecond

	for {
		if ctx.Err() != nil {
			return fmt.Errorf("timeout waiting for %s to become ready", identifier)
		}
		status, err := c.kubeClient.GetConditionStatus(resource, name, namespace, meta.ReadyCondition)
		if err == nil && strings.EqualFold(status, "True") {
			return nil
		}

		select {
		case <-ctx.Done():
			return fmt.Errorf("timeout waiting for %s to become ready", identifier)
		case <-time.After(pollInterval):
		default:
		}
	}
}

// kindToResource maps Flux kinds to kubectl resource types
func kindToResource(kind string) string {
	switch kind {
	case sourcev1.HelmRepositoryKind:
		return helmRepositoryResource
	case sourcev1.OCIRepositoryKind:
		return ociRepositoryResource
	case helmv2.HelmReleaseKind:
		return helmReleaseResource
	case kustomizev1.KustomizationKind:
		return kustomizationResource
	default:
		return ""
	}
}
