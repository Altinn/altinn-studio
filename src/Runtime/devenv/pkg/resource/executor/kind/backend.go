// Package kindbackend applies local kind-cluster resource graph resources.
package kindbackend

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"sync"

	"altinn.studio/devenv/pkg/cabundle"
	containerclient "altinn.studio/devenv/pkg/container"
	"altinn.studio/devenv/pkg/kindclient"
	"altinn.studio/devenv/pkg/kubernetes"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/devenv/pkg/resource/executor"
	"altinn.studio/devenv/pkg/runtimes/kind/manifests"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/kind/pkg/apis/config/v1alpha4"
)

const (
	kindContextPrefix          = "kind-"
	defaultRegistryHostPort    = "5001"
	defaultRegistryServicePort = "5000"
)

var (
	errContainerClientRequired = errors.New("container client is required")
	errKindClusterNotResolved  = errors.New("kind cluster is not resolved")
	errUnsupportedKindResource = errors.New("unsupported kind backend resource")
	errRegistryEndpointInvalid = errors.New("registry endpoint must reference a container resource")
)

// Backend applies kind cluster resources.
type Backend struct {
	container containerclient.ContainerClient
	kind      kindOperations
	newKube   func(contextName string) (kubernetesOperations, error)
	clusters  map[resource.ResourceID]kubernetesOperations
	mu        sync.Mutex
}

type kindOperations interface {
	GetClusters() ([]string, error)
	CreateCluster(name string, config *v1alpha4.Cluster) error
	DeleteCluster(name string) error
	GetNodes(clusterName string) ([]string, error)
}

type kubernetesOperations interface {
	ApplyObjects(ctx context.Context, objs ...runtime.Object) (string, error)
	Get(ctx context.Context, gvr schema.GroupVersionResource, name, namespace string) error
}

// New creates a kind resource backend.
func New(containerClient containerclient.ContainerClient) (*Backend, error) {
	if containerClient == nil {
		return nil, errContainerClientRequired
	}
	return &Backend{
		container: containerClient,
		kind:      kindclient.New(),
		newKube:   newKubernetesClient,
		clusters:  make(map[resource.ResourceID]kubernetesOperations),
	}, nil
}

func newKubernetesClient(contextName string) (kubernetesOperations, error) {
	client, err := kubernetes.New(contextName)
	if err != nil {
		return nil, fmt.Errorf("create Kubernetes client: %w", err)
	}
	return client, nil
}

// Supports reports whether this backend can apply and observe r.
func (b *Backend) Supports(r resource.Resource) bool {
	switch r.(type) {
	case *resource.KindCluster:
		return true
	default:
		return false
	}
}

// Apply creates or updates one supported resource.
func (b *Backend) Apply(
	ctx context.Context,
	_ executor.BackendContext,
	r resource.Resource,
) (executor.Output, error) {
	switch res := r.(type) {
	case *resource.KindCluster:
		return executor.NoOutput{}, b.applyKindCluster(ctx, res)
	default:
		return nil, fmt.Errorf("%w: %T", errUnsupportedKindResource, r)
	}
}

// Observe reads current runtime state for one supported resource.
func (b *Backend) Observe(
	_ context.Context,
	_ executor.BackendContext,
	r resource.Resource,
) (executor.ObservedResource, error) {
	observed := executor.ObservedResource{
		Resource: r,
		Status:   executor.StatusReady,
		Managed:  false,
	}
	switch res := r.(type) {
	case *resource.KindCluster:
		exists, err := b.clusterExists(res.Name)
		if err != nil {
			return observed, err
		}
		observed.Type = executor.ResourceTypeKindCluster
		observed.RuntimeID = res.Name
		observed.Managed = exists
		if !exists {
			observed.Status = executor.StatusDestroyed
		}
	default:
		return executor.ObservedResource{}, fmt.Errorf("%w: %T", errUnsupportedKindResource, r)
	}
	return observed, nil
}

// Destroy removes one observed runtime resource.
func (b *Backend) Destroy(_ context.Context, id resource.ResourceID, observed executor.ObservedResource) error {
	if observed.Type != executor.ResourceTypeKindCluster {
		return nil
	}
	name, ok := resource.KindClusterNameFromID(id)
	if !ok {
		return fmt.Errorf("%w: %s", errKindClusterNotResolved, id)
	}
	if observed.RuntimeID != "" {
		name = observed.RuntimeID
	}
	if err := b.kind.DeleteCluster(name); err != nil {
		return fmt.Errorf("delete kind cluster %s: %w", name, err)
	}
	b.mu.Lock()
	delete(b.clusters, id)
	b.mu.Unlock()
	return nil
}

func (b *Backend) applyKindCluster(ctx context.Context, cluster *resource.KindCluster) error {
	exists, err := b.clusterExists(cluster.Name)
	if err != nil {
		return err
	}
	if !exists {
		if err := b.kind.CreateCluster(cluster.Name, clusterConfig(cluster)); err != nil {
			return fmt.Errorf("create kind cluster %s: %w", cluster.Name, err)
		}
	}
	if _, err := b.ensureKubernetesClient(resource.Ref(cluster)); err != nil {
		return err
	}
	if err := b.configureCABundle(ctx, cluster); err != nil {
		return err
	}
	return b.configureRegistryMirrors(ctx, cluster)
}

func (b *Backend) clusterExists(name string) (bool, error) {
	clusters, err := b.kind.GetClusters()
	if err != nil {
		return false, fmt.Errorf("list kind clusters: %w", err)
	}
	return slices.Contains(clusters, name), nil
}

func (b *Backend) ensureKubernetesClient(ref resource.ResourceRef) (kubernetesOperations, error) {
	id := ref.ID()
	if id == "" {
		return nil, errKindClusterNotResolved
	}
	b.mu.Lock()
	client, ok := b.clusters[id]
	b.mu.Unlock()
	if ok {
		return client, nil
	}

	clusterName, err := clusterNameFromRef(ref)
	if err != nil {
		return nil, err
	}
	kubeClient, err := b.newKube(kindContextPrefix + clusterName)
	if err != nil {
		return nil, fmt.Errorf("create Kubernetes client for %s: %w", clusterName, err)
	}
	b.mu.Lock()
	b.clusters[id] = kubeClient
	b.mu.Unlock()
	return kubeClient, nil
}

func clusterNameFromRef(ref resource.ResourceRef) (string, error) {
	name, ok := resource.KindClusterNameFromRef(ref)
	if !ok || name == "" {
		return "", fmt.Errorf("%w: %s", errKindClusterNotResolved, ref.ID())
	}
	return name, nil
}

func clusterConfig(cluster *resource.KindCluster) *v1alpha4.Cluster {
	switch strings.ToLower(cluster.Variant) {
	case "standard":
		return manifests.BuildStandardConfig(cluster.Name)
	default:
		return manifests.BuildMinimalConfig(cluster.Name)
	}
}

func (b *Backend) configureCABundle(ctx context.Context, cluster *resource.KindCluster) error {
	data, configured, err := caBundleData(cluster.TrustedCABundlePath)
	if err != nil {
		return err
	}
	if !configured {
		return nil
	}
	nodes, err := b.kind.GetNodes(cluster.Name)
	if err != nil {
		return fmt.Errorf("get kind nodes: %w", err)
	}
	for _, node := range nodes {
		if err := b.container.Exec(
			ctx,
			node,
			[]string{"mkdir", "-p", filepath.Dir(cabundle.ContainerPath)},
		); err != nil {
			return fmt.Errorf("create CA bundle directory in node %s: %w", node, err)
		}
		if err := b.container.ExecWithIO(
			ctx,
			node,
			[]string{"cp", "/dev/stdin", cabundle.ContainerPath},
			bytes.NewReader(data),
			nil,
			nil,
		); err != nil {
			return fmt.Errorf("copy CA bundle to node %s: %w", node, err)
		}
		if err := b.container.Exec(ctx, node, []string{"sh", "-c", cabundle.RegistrationScript()}); err != nil {
			return fmt.Errorf("register CA bundle in node %s: %w", node, err)
		}
	}
	return nil
}

func caBundleData(path string) ([]byte, bool, error) {
	if path != "" {
		data, err := os.ReadFile(path) //nolint:gosec // Path is desired-state input from the local graph.
		if err != nil {
			return nil, true, fmt.Errorf("read CA bundle %s: %w", path, err)
		}
		return data, true, nil
	}
	bundle, configured, err := cabundle.FromEnv()
	if err != nil {
		return nil, true, fmt.Errorf("resolve CA bundle: %w", err)
	}
	if !configured {
		return nil, false, nil
	}
	return bundle.Data, true, nil
}

func (b *Backend) configureRegistryMirrors(ctx context.Context, cluster *resource.KindCluster) error {
	mirrors := enabledRegistryMirrors(cluster.RegistryMirrors)
	if len(mirrors) == 0 {
		return nil
	}
	kube, err := b.ensureKubernetesClient(resource.Ref(cluster))
	if err != nil {
		return err
	}
	if applyErr := applyLocalRegistryConfigMap(ctx, kube, mirrors); applyErr != nil {
		return applyErr
	}
	nodes, err := b.kind.GetNodes(cluster.Name)
	if err != nil {
		return fmt.Errorf("get kind nodes: %w", err)
	}
	for _, mirror := range mirrors {
		endpoint, err := registryEndpointName(mirror.Endpoint)
		if err != nil {
			return err
		}
		if err := b.connectRegistryEndpoint(ctx, endpoint); err != nil {
			return err
		}
		if err := b.configureRegistryMirror(
			ctx,
			nodes,
			cluster.TrustedCABundlePath,
			mirror.Host,
			endpoint,
			mirror.Upstream,
		); err != nil {
			return err
		}
	}
	return nil
}

func enabledRegistryMirrors(mirrors []resource.KindRegistryMirror) []resource.KindRegistryMirror {
	enabled := make([]resource.KindRegistryMirror, 0, len(mirrors))
	for _, mirror := range mirrors {
		if mirror.IsEnabled() {
			enabled = append(enabled, mirror)
		}
	}
	return enabled
}

func applyLocalRegistryConfigMap(
	ctx context.Context,
	kube kubernetesOperations,
	mirrors []resource.KindRegistryMirror,
) error {
	for _, mirror := range mirrors {
		if !strings.HasPrefix(mirror.Host, "localhost:") {
			continue
		}
		hostPort := strings.TrimPrefix(mirror.Host, "localhost:")
		cm := &corev1.ConfigMap{
			TypeMeta:   metav1.TypeMeta{APIVersion: "v1", Kind: "ConfigMap"},
			ObjectMeta: metav1.ObjectMeta{Name: "local-registry-hosting", Namespace: "kube-public"},
			Data: map[string]string{
				"localRegistryHosting.v1": fmt.Sprintf(
					"host: \"localhost:%s\"\nhelp: \"https://kind.sigs.k8s.io/docs/user/local-registry/\"\n",
					firstNonEmptyString(hostPort, defaultRegistryHostPort),
				),
			},
		}
		if _, err := kube.ApplyObjects(ctx, cm); err != nil {
			return fmt.Errorf("apply local registry ConfigMap: %w", err)
		}
		return nil
	}
	return nil
}

func (b *Backend) configureRegistryMirror(
	ctx context.Context,
	nodes []string,
	trustedCABundlePath,
	registryHost,
	endpoint,
	upstream string,
) error {
	registryDir := "/etc/containerd/certs.d/" + registryHost
	hostsToml := registryHostsToml(endpoint, upstream)
	caData, caConfigured, err := caBundleData(trustedCABundlePath)
	if err != nil {
		return err
	}
	for _, node := range nodes {
		if err := b.container.Exec(ctx, node, []string{"mkdir", "-p", registryDir}); err != nil {
			return fmt.Errorf("create registry dir in node %s: %w", node, err)
		}
		if caConfigured {
			if err := b.container.ExecWithIO(
				ctx,
				node,
				[]string{"cp", "/dev/stdin", registryDir + "/ca.crt"},
				bytes.NewReader(caData),
				nil,
				nil,
			); err != nil {
				return fmt.Errorf("write registry CA in node %s: %w", node, err)
			}
		}
		if err := b.container.ExecWithIO(
			ctx,
			node,
			[]string{"cp", "/dev/stdin", registryDir + "/hosts.toml"},
			bytes.NewBufferString(hostsToml),
			nil,
			nil,
		); err != nil {
			return fmt.Errorf("write registry hosts.toml in node %s: %w", node, err)
		}
	}
	return nil
}

func (b *Backend) connectRegistryEndpoint(ctx context.Context, endpoint string) error {
	networks, err := b.container.ContainerNetworks(ctx, endpoint)
	if err != nil {
		return fmt.Errorf("inspect registry endpoint networks for %s: %w", endpoint, err)
	}
	if slices.Contains(networks, "kind") {
		return nil
	}
	if err := b.container.NetworkConnect(ctx, "kind", endpoint); err != nil {
		return fmt.Errorf("connect registry endpoint %s to kind network: %w", endpoint, err)
	}
	return nil
}

func registryHostsToml(endpoint, upstream string) string {
	if upstream != "" {
		return fmt.Sprintf(`server = "%s"

[host."http://%s:%s"]
  capabilities = ["pull", "resolve"]
`, upstream, endpoint, defaultRegistryServicePort)
	}
	return fmt.Sprintf("[host.\"http://%s:%s\"]\n", endpoint, defaultRegistryServicePort)
}

func registryEndpointName(ref resource.ResourceRef) (string, error) {
	name, ok := resource.ContainerNameFromRef(ref)
	if !ok || name == "" {
		return "", fmt.Errorf("%w: %s", errRegistryEndpointInvalid, ref.ID())
	}
	return name, nil
}

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

var _ executor.Backend = (*Backend)(nil)
