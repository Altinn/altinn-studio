package kubernetes

import (
	"fmt"
	"path/filepath"
	"sync"

	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"
	metricsclientset "k8s.io/metrics/pkg/client/clientset/versioned"
	gatewayclientset "sigs.k8s.io/gateway-api/pkg/client/clientset/versioned"
)

// ClusterClient provides lazy-loaded Kubernetes clients for a specific context.
// Clients are only created when first accessed, improving performance for commands
// that don't need all client types.
type ClusterClient struct {
	config *rest.Config

	// Lazy-loaded clients (nil until first access)
	clientset     *kubernetes.Clientset
	metricsClient *metricsclientset.Clientset
	dynamicClient dynamic.Interface // For FluxCD CRDs
	gatewayClient *gatewayclientset.Clientset

	// Initialization guards ensure thread-safe single initialization
	clientsetOnce sync.Once
	metricsOnce   sync.Once
	dynamicOnce   sync.Once
	gatewayOnce   sync.Once

	// Error tracking from initialization attempts
	clientsetErr error
	metricsErr   error
	dynamicErr   error
	gatewayErr   error
}

// newClusterClient creates a new ClusterClient for the specified context.
// The REST config is loaded immediately, but actual clientsets are created lazily
// when first accessed via getter methods.
func newClusterClient(contextName string) (*ClusterClient, error) {
	kubeconfig := filepath.Join(homedir.HomeDir(), ".kube", "config")

	// Load config for this context
	config, err := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(
		&clientcmd.ClientConfigLoadingRules{ExplicitPath: kubeconfig},
		&clientcmd.ConfigOverrides{CurrentContext: contextName},
	).ClientConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to load config for context %s: %w", contextName, err)
	}

	return &ClusterClient{
		config: config,
	}, nil
}

// Clientset returns the core Kubernetes clientset, creating it on first access.
// Subsequent calls return the cached clientset.
func (c *ClusterClient) Clientset() (*kubernetes.Clientset, error) {
	c.clientsetOnce.Do(func() {
		c.clientset, c.clientsetErr = kubernetes.NewForConfig(c.config)
	})
	return c.clientset, c.clientsetErr
}

// MetricsClient returns the metrics API clientset, creating it on first access.
// Subsequent calls return the cached clientset.
func (c *ClusterClient) MetricsClient() (*metricsclientset.Clientset, error) {
	c.metricsOnce.Do(func() {
		c.metricsClient, c.metricsErr = metricsclientset.NewForConfig(c.config)
	})
	return c.metricsClient, c.metricsErr
}

// DynamicClient returns the dynamic client for CRDs (e.g., FluxCD resources),
// creating it on first access. Subsequent calls return the cached client.
func (c *ClusterClient) DynamicClient() (dynamic.Interface, error) {
	c.dynamicOnce.Do(func() {
		c.dynamicClient, c.dynamicErr = dynamic.NewForConfig(c.config)
	})
	return c.dynamicClient, c.dynamicErr
}

// GatewayClient returns the Gateway API clientset, creating it on first access.
// Subsequent calls return the cached clientset.
func (c *ClusterClient) GatewayClient() (*gatewayclientset.Clientset, error) {
	c.gatewayOnce.Do(func() {
		c.gatewayClient, c.gatewayErr = gatewayclientset.NewForConfig(c.config)
	})
	return c.gatewayClient, c.gatewayErr
}
