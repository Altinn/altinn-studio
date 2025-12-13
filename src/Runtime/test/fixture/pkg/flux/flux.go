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
	sourcev1 "github.com/fluxcd/source-controller/api/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"

	"altinn.studio/runtime-fixture/pkg/kubernetes"
)

var (
	// Flux GVRs - constructed directly from API packages to avoid discovery issues
	helmRepositoryGVR = sourcev1.GroupVersion.WithResource("helmrepositories")
	helmReleaseGVR    = helmv2.GroupVersion.WithResource("helmreleases")
	kustomizationGVR  = kustomizev1.GroupVersion.WithResource("kustomizations")
	ociRepositoryGVR  = sourcev1.GroupVersion.WithResource("ocirepositories")
)

// FluxClient provides Flux operations using native Go packages
type FluxClient struct {
	kubeClient *kubernetes.KubernetesClient
}

// New creates a new FluxClient with the given KubernetesClient
func New(kubeClient *kubernetes.KubernetesClient) (*FluxClient, error) {
	if kubeClient == nil {
		return nil, fmt.Errorf("kubeClient is required")
	}

	return &FluxClient{
		kubeClient: kubeClient,
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

// ReconcileHelmRepository reconciles a HelmRepository source.
// For OCI-type repositories, this is a no-op since they don't have reconciliation status.
func (c *FluxClient) ReconcileHelmRepository(name, namespace string, opts ReconcileOptions) error {
	// Check if this is an OCI-type repository - they don't have Ready status
	repoType, err := c.kubeClient.GetFieldString(helmRepositoryGVR, name, namespace, "spec", "type")
	if err == nil && repoType == "oci" {
		// OCI repositories are static references, no reconciliation needed
		return nil
	}
	return c.reconcile(helmRepositoryGVR, name, namespace, opts)
}

// ReconcileHelmRelease reconciles a HelmRelease resource
func (c *FluxClient) ReconcileHelmRelease(name, namespace string, withSource bool, opts ReconcileOptions) error {
	if withSource {
		if err := c.reconcileSource(helmReleaseGVR, name, namespace, opts); err != nil {
			return err
		}
	}
	return c.reconcile(helmReleaseGVR, name, namespace, opts)
}

// ReconcileKustomization reconciles a Kustomization resource
func (c *FluxClient) ReconcileKustomization(name, namespace string, withSource bool, opts ReconcileOptions) error {
	if withSource {
		if err := c.reconcileSource(kustomizationGVR, name, namespace, opts); err != nil {
			return err
		}
	}
	return c.reconcile(kustomizationGVR, name, namespace, opts)
}

// reconcileSource reconciles the source referenced by a HelmRelease or Kustomization
func (c *FluxClient) reconcileSource(gvr schema.GroupVersionResource, name, namespace string, opts ReconcileOptions) error {
	sourceRef, err := c.kubeClient.GetSourceRef(gvr, name, namespace)
	if err != nil {
		return fmt.Errorf("failed to get sourceRef for %s/%s: %w", gvr.Resource, name, err)
	}

	sourceGVR := kindToGVR(sourceRef.Kind)
	if sourceGVR.Resource == "" {
		return fmt.Errorf("unknown source kind: %s", sourceRef.Kind)
	}

	return c.reconcile(sourceGVR, sourceRef.Name, sourceRef.Namespace, opts)
}

// reconcile triggers reconciliation of a Flux resource by setting the reconcile annotation
func (c *FluxClient) reconcile(gvr schema.GroupVersionResource, name, namespace string, opts ReconcileOptions) error {
	timestamp := time.Now().Format(time.RFC3339Nano)

	if err := c.kubeClient.Annotate(gvr, name, namespace, meta.ReconcileRequestAnnotation, timestamp); err != nil {
		return fmt.Errorf("failed to annotate %s/%s: %w", gvr.Resource, name, err)
	}

	if !opts.ShouldWait {
		go func() {
			if err := c.waitForReady(gvr, name, namespace, opts.Timeout); err != nil {
				fmt.Fprintf(os.Stderr, "Flux reconcile for %s/%s (namespace: %s) failed: %v\n", gvr.Resource, name, namespace, err)
			}
		}()
		return nil
	}

	return c.waitForReady(gvr, name, namespace, opts.Timeout)
}

// waitForReady polls until the resource's Ready condition is True or timeout
func (c *FluxClient) waitForReady(gvr schema.GroupVersionResource, name, namespace string, timeout time.Duration) error {
	ctx := context.Background()
	if timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, timeout)
		defer cancel()
	}

	identifier := fmt.Sprintf("%s/%s (namespace: %s)", gvr.Resource, name, namespace)
	pollInterval := 100 * time.Millisecond

	for {
		if ctx.Err() != nil {
			return fmt.Errorf("timeout waiting for %s to become ready", identifier)
		}
		status, err := c.kubeClient.GetConditionStatus(gvr, name, namespace, meta.ReadyCondition)
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

// kindToGVR maps Flux kinds to GVRs
func kindToGVR(kind string) schema.GroupVersionResource {
	switch kind {
	case sourcev1.HelmRepositoryKind:
		return helmRepositoryGVR
	case sourcev1.OCIRepositoryKind:
		return ociRepositoryGVR
	case helmv2.HelmReleaseKind:
		return helmReleaseGVR
	case kustomizev1.KustomizationKind:
		return kustomizationGVR
	default:
		return schema.GroupVersionResource{}
	}
}
