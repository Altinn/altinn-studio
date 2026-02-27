package kube

import (
	"fmt"
	"net/http"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

// NewRESTConfig builds Kubernetes REST config from in-cluster credentials or KUBECONFIG.
func NewRESTConfig(kubeconfig string) (*rest.Config, error) {
	inClusterConfig, inClusterErr := rest.InClusterConfig()
	if inClusterErr == nil {
		return inClusterConfig, nil
	}

	if kubeconfig == "" {
		return nil, fmt.Errorf("failed in-cluster config and KUBECONFIG not set: %w", inClusterErr)
	}

	config, err := clientcmd.BuildConfigFromFlags("", kubeconfig)
	if err != nil {
		return nil, fmt.Errorf("failed building config from KUBECONFIG %q: %w", kubeconfig, err)
	}
	return config, nil
}

// WrapTransportWithTelemetry wraps outbound Kubernetes HTTP calls with OpenTelemetry instrumentation.
func WrapTransportWithTelemetry(cfg *rest.Config) {
	cfg.WrapTransport = func(rt http.RoundTripper) http.RoundTripper {
		if rt == nil {
			rt = http.DefaultTransport
		}
		return otelhttp.NewTransport(rt)
	}
}
