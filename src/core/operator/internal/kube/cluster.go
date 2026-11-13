// Package kube is the operator's one connection to Kubernetes, and the one package that uses controller-runtime and
// client-go. It runs the process's work under a controller-runtime manager, with leader election and health probes,
// runs the Jobs of runs as a sandbox.Sandbox, and reviews tokens for internal/auth. The rest of the operator knows
// nothing of Kubernetes.
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

	// Import all Kubernetes client auth plugins (e.g. Azure, GCP, OIDC, etc.), so a local run can use the
	// kubeconfig's.
	_ "k8s.io/client-go/plugin/pkg/client/auth"
	"k8s.io/client-go/rest"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/healthz"
	metricsserver "sigs.k8s.io/controller-runtime/pkg/metrics/server"
)

const (
	gracefulShutdownTimeout = 30 * time.Second
	leaseDuration           = 30 * time.Second
	renewDeadline           = 20 * time.Second
	retryPeriod             = 5 * time.Second
)

// Options configure the cluster.
type Options struct {
	// RESTConfig connects to the API server. Without it, the cluster uses the kubeconfig or the pod's
	// ServiceAccount, as kubectl does.
	RESTConfig *rest.Config
	// ProbeAddress serves the health and readiness probes.
	ProbeAddress string
	// Namespaces are the namespaces whose run Jobs and pods the cache holds. Without any, as in staging, the cache
	// starts no informer for them.
	Namespaces []string
	// LeaderElect elects a leader, which runs the work that needs one, such as the garbage collector.
	LeaderElect bool
}

// Cluster runs the process's work in a Kubernetes cluster.
type Cluster struct {
	mgr ctrl.Manager
}

// Runnable is work that starts with the cluster and stops when its context ends. A Runnable with a method
// NeedLeaderElection that returns true runs on the leader only. Others start on every replica, once the cache has
// synced.
type Runnable interface {
	Start(ctx context.Context) error
}

// SetLogger makes controller-runtime and client-go log through logger.
func SetLogger(logger logr.Logger) {
	ctrl.SetLogger(logger)
}

// New sets up a cluster whose cache holds only the operator's own Jobs and pods, in the namespaces of the configured
// kinds. The operator's Role in those namespaces allows no more.
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
	}

	mgr, err := ctrl.NewManager(restConfig, ctrl.Options{
		Scheme:                        scheme,
		Metrics:                       metricsserver.Options{BindAddress: "0"},
		HealthProbeBindAddress:        opts.ProbeAddress,
		LeaderElection:                opts.LeaderElect,
		LeaderElectionID:              "core-operator.altinn.studio",
		LeaderElectionReleaseOnCancel: true,
		LeaseDuration:                 new(leaseDuration),
		RenewDeadline:                 new(renewDeadline),
		RetryPeriod:                   new(retryPeriod),
		GracefulShutdownTimeout:       new(gracefulShutdownTimeout),
		Cache:                         cache.Options{ByObject: byObject},
	})
	if err != nil {
		return nil, fmt.Errorf("create the manager: %w", err)
	}
	if err := mgr.AddHealthzCheck("healthz", healthz.Ping); err != nil {
		return nil, fmt.Errorf("add health check: %w", err)
	}
	if err := mgr.AddReadyzCheck("readyz", healthz.Ping); err != nil {
		return nil, fmt.Errorf("add ready check: %w", err)
	}
	return &Cluster{mgr: mgr}, nil
}

// Add runs r with the cluster.
func (c *Cluster) Add(r Runnable) error {
	if err := c.mgr.Add(r); err != nil {
		return fmt.Errorf("add to the manager: %w", err)
	}
	return nil
}

// Elected is closed once this replica leads, or at once without leader election.
func (c *Cluster) Elected() <-chan struct{} {
	return c.mgr.Elected()
}

// Start runs the cluster's work until ctx ends.
func (c *Cluster) Start(ctx context.Context) error {
	if err := c.mgr.Start(ctx); err != nil {
		return fmt.Errorf("run the manager: %w", err)
	}
	return nil
}

// Sandbox runs the Jobs of runs in the cluster.
func (c *Cluster) Sandbox() *Sandbox {
	return &Sandbox{Client: c.mgr.GetClient(), Reader: c.mgr.GetAPIReader()}
}

// TokenReviewer reviews tokens with the cluster's API server.
func (c *Cluster) TokenReviewer() TokenReviewer {
	return TokenReviewer{Client: c.mgr.GetClient()}
}
