package flux

import (
	"context"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"github.com/fluxcd/flux2/v2/pkg/manifestgen/install"
	helmv2 "github.com/fluxcd/helm-controller/api/v2"
	kustomizev1 "github.com/fluxcd/kustomize-controller/api/v1"
	"github.com/fluxcd/pkg/apis/meta"
	sourcev1 "github.com/fluxcd/source-controller/api/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	utilyaml "k8s.io/apimachinery/pkg/util/yaml"

	"altinn.studio/devenv/pkg/kubernetes"
)

var (
	// Flux GVRs - constructed directly from API packages to avoid discovery issues
	helmRepositoryGVR = sourcev1.GroupVersion.WithResource("helmrepositories")
	HelmReleaseGVR    = helmv2.GroupVersion.WithResource("helmreleases")
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

// InstallOptions configures Flux controller behavior during installation
type InstallOptions struct {
	// LeaderElection enables HA mode. Disable for single-instance local testing.
	LeaderElection bool
	// Concurrent is the number of parallel reconciles per controller.
	Concurrent int
	// RequeueDependency is the interval for retrying failed dependencies.
	RequeueDependency time.Duration
	// OptimizeProbes reduces probe delays for faster startup.
	OptimizeProbes bool
}

// LocalTestInstallOptions returns InstallOptions optimized for local testing
func LocalTestInstallOptions() InstallOptions {
	return InstallOptions{
		LeaderElection:    false,
		Concurrent:        8,
		RequeueDependency: 2 * time.Second,
		OptimizeProbes:    true,
	}
}

// Install installs Flux to the cluster with the specified components and options
func (c *FluxClient) Install(components []string, installOpts InstallOptions) error {
	opts := install.MakeDefaultOptions()
	opts.Components = components

	manifest, err := install.Generate(opts, "")
	if err != nil {
		return fmt.Errorf("failed to generate flux install manifests: %w", err)
	}

	objects, err := parseManifestYAML(manifest.Content)
	if err != nil {
		return fmt.Errorf("failed to parse flux manifests: %w", err)
	}

	patchDeployments(objects, installOpts)

	if _, err := c.kubeClient.ApplyObjects(objectsToRuntime(objects)...); err != nil {
		return fmt.Errorf("failed to apply flux install manifests: %w", err)
	}

	return nil
}

func parseManifestYAML(content string) ([]*unstructured.Unstructured, error) {
	decoder := utilyaml.NewYAMLOrJSONDecoder(strings.NewReader(content), 4096)
	var objects []*unstructured.Unstructured

	for {
		var obj unstructured.Unstructured
		if err := decoder.Decode(&obj); err != nil {
			if err == io.EOF {
				break
			}
			return nil, err
		}
		if len(obj.Object) == 0 {
			continue
		}
		objects = append(objects, &obj)
	}
	return objects, nil
}

func objectsToRuntime(objects []*unstructured.Unstructured) []runtime.Object {
	result := make([]runtime.Object, len(objects))
	for i, obj := range objects {
		result[i] = obj
	}
	return result
}

func patchDeployments(objects []*unstructured.Unstructured, opts InstallOptions) {
	for _, obj := range objects {
		if obj.GetKind() != "Deployment" || obj.GetNamespace() != "flux-system" {
			continue
		}
		if obj.GetName() == "notification-controller" {
			continue
		}

		containers, found, _ := unstructured.NestedSlice(obj.Object, "spec", "template", "spec", "containers")
		if !found || len(containers) == 0 {
			continue
		}

		container := containers[0].(map[string]interface{})
		patchContainerArgs(container, opts)
		if opts.OptimizeProbes {
			patchProbes(container)
		}

		containers[0] = container
		_ = unstructured.SetNestedSlice(obj.Object, containers, "spec", "template", "spec", "containers")
	}
}

func patchContainerArgs(container map[string]interface{}, opts InstallOptions) {
	argsRaw, found, _ := unstructured.NestedStringSlice(container, "args")
	if !found {
		argsRaw = []string{}
	}

	// Filter out args we want to control
	var args []string
	for _, arg := range argsRaw {
		if strings.HasPrefix(arg, "--enable-leader-election") ||
			strings.HasPrefix(arg, "--concurrent") ||
			strings.HasPrefix(arg, "--requeue-dependency") {
			continue
		}
		args = append(args, arg)
	}

	// Add our settings
	if opts.LeaderElection {
		args = append(args, "--enable-leader-election")
	}
	if opts.Concurrent > 0 {
		args = append(args, fmt.Sprintf("--concurrent=%d", opts.Concurrent))
	}
	if opts.RequeueDependency > 0 {
		args = append(args, fmt.Sprintf("--requeue-dependency=%s", opts.RequeueDependency))
	}

	container["args"] = toInterfaceSlice(args)
}

func patchProbes(container map[string]interface{}) {
	if probe, ok := container["readinessProbe"].(map[string]interface{}); ok {
		probe["periodSeconds"] = int64(2)
	}
	if probe, ok := container["livenessProbe"].(map[string]interface{}); ok {
		probe["periodSeconds"] = int64(5)
	}
}

func toInterfaceSlice(s []string) []interface{} {
	result := make([]interface{}, len(s))
	for i, v := range s {
		result[i] = v
	}
	return result
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
		if err := c.reconcileSource(HelmReleaseGVR, name, namespace, opts); err != nil {
			return err
		}
	}
	return c.reconcile(HelmReleaseGVR, name, namespace, opts)
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

// waitForReady watches until the resource's Ready condition is True or timeout
func (c *FluxClient) waitForReady(gvr schema.GroupVersionResource, name, namespace string, timeout time.Duration) error {
	ctx := context.Background()
	if timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, timeout)
		defer cancel()
	}

	return c.kubeClient.WatchCondition(ctx, gvr, name, namespace, meta.ReadyCondition, "True")
}

// kindToGVR maps Flux kinds to GVRs
func kindToGVR(kind string) schema.GroupVersionResource {
	switch kind {
	case sourcev1.HelmRepositoryKind:
		return helmRepositoryGVR
	case sourcev1.OCIRepositoryKind:
		return ociRepositoryGVR
	case helmv2.HelmReleaseKind:
		return HelmReleaseGVR
	case kustomizev1.KustomizationKind:
		return kustomizationGVR
	default:
		return schema.GroupVersionResource{}
	}
}
