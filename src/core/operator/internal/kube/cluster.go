// Package kube is the only connection of the operator to Kubernetes. It is the only package that uses
// controller-runtime and client-go. It runs the process under a controller-runtime manager, runs the Jobs of runs as a
// sandbox.Sandbox, and reviews tokens for internal/auth.
package kube

import (
	"context"
	"fmt"
	"time"

	"github.com/go-logr/logr"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	corev1client "k8s.io/client-go/kubernetes/typed/core/v1"

	// Load the client auth plugins, so that a local run can use the auth plugins of the kubeconfig.
	_ "k8s.io/client-go/plugin/pkg/client/auth"
	"k8s.io/client-go/rest"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/healthz"
	metricsserver "sigs.k8s.io/controller-runtime/pkg/metrics/server"
)

const gracefulShutdownTimeout = 30 * time.Second

type Options struct {
	// RESTConfig connects to the API server. Without it, the cluster uses the kubeconfig or the pod's
	// ServiceAccount, as kubectl does.
	RESTConfig *rest.Config
	// ProbeAddress serves the health and readiness probes.
	ProbeAddress string
	// Namespaces are the namespaces whose run Jobs, pods and quotas the cache holds. Without any, the cache starts no
	// informer for them.
	Namespaces []string
}

type Cluster struct {
	manager ctrl.Manager
	pods    corev1client.PodsGetter
}

// Runnable is work that starts with the cluster and stops when its context ends. A Runnable with a method
// NeedLeaderElection that returns true runs on the leader only. Others start on each replica after the cache sync.
type Runnable interface {
	Start(ctx context.Context) error
}

// SetLogger makes controller-runtime and client-go log through logger.
func SetLogger(logger logr.Logger) {
	ctrl.SetLogger(logger)
}

// New sets up a cluster whose cache holds only the operator's own Jobs, pods and quotas in the namespaces of the
// configured kinds. The operator's Role in those namespaces allows no more.
func New(opts Options) (*Cluster, error) {
	restConfig := opts.RESTConfig
	if restConfig == nil {
		var err error
		if restConfig, err = ctrl.GetConfig(); err != nil {
			return nil, fmt.Errorf("load the Kubernetes configuration: %w", err)
		}
	}
	scheme := runtime.NewScheme()
	if err := clientgoscheme.AddToScheme(scheme); err != nil {
		return nil, fmt.Errorf("register the Kubernetes types: %w", err)
	}

	managed := labels.SelectorFromSet(labels.Set{LabelManagedBy: ManagedBy})
	byObject := make(map[client.Object]cache.ByObject)
	if len(opts.Namespaces) > 0 {
		namespaces := make(map[string]cache.Config, len(opts.Namespaces))
		for _, namespace := range opts.Namespaces {
			namespaces[namespace] = cache.Config{}
		}
		byObject[&batchv1.Job{}] = cache.ByObject{Label: managed, Namespaces: namespaces}
		byObject[&corev1.Pod{}] = cache.ByObject{Label: managed, Namespaces: namespaces}
		byObject[&corev1.ResourceQuota{}] = cache.ByObject{Namespaces: namespaces}
	}

	manager, err := ctrl.NewManager(restConfig, ctrl.Options{
		Scheme:                  scheme,
		Metrics:                 metricsserver.Options{BindAddress: "0"},
		HealthProbeBindAddress:  opts.ProbeAddress,
		GracefulShutdownTimeout: new(gracefulShutdownTimeout),
		Cache:                   cache.Options{ByObject: byObject},
	})
	if err != nil {
		return nil, fmt.Errorf("create the manager: %w", err)
	}
	if err := manager.AddHealthzCheck("healthz", healthz.Ping); err != nil {
		return nil, fmt.Errorf("add health check: %w", err)
	}
	if err := manager.AddReadyzCheck("readyz", healthz.Ping); err != nil {
		return nil, fmt.Errorf("add ready check: %w", err)
	}
	pods, podsErr := corev1client.NewForConfig(restConfig)
	if podsErr != nil {
		return nil, fmt.Errorf("create the client for pod logs: %w", podsErr)
	}
	return &Cluster{manager: manager, pods: pods}, nil
}

func (c *Cluster) Add(r Runnable) error {
	if err := c.manager.Add(r); err != nil {
		return fmt.Errorf("add to the manager: %w", err)
	}
	return nil
}

func (c *Cluster) Start(ctx context.Context) error {
	if err := c.manager.Start(ctx); err != nil {
		return fmt.Errorf("run the manager: %w", err)
	}
	return nil
}

func (c *Cluster) Sandbox() *Sandbox {
	return &Sandbox{Client: c.manager.GetClient(), Reader: c.manager.GetAPIReader(), Pods: c.pods}
}

func (c *Cluster) TokenReviewer() TokenReviewer {
	return TokenReviewer{Client: c.manager.GetClient()}
}
