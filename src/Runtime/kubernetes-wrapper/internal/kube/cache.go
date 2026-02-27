// Package kube provides Kubernetes client and informer abstractions.
package kube

import (
	"context"
	"errors"
	"fmt"

	appsv1 "k8s.io/api/apps/v1"
	"k8s.io/apimachinery/pkg/labels"
	informers "k8s.io/client-go/informers"
	"k8s.io/client-go/kubernetes"
	appslisters "k8s.io/client-go/listers/apps/v1"
	"k8s.io/client-go/tools/cache"
)

var errCacheSyncFailed = errors.New("failed waiting for informer cache sync")

// ResourceCache holds informer-backed listers for runtime resources.
type ResourceCache struct {
	factory informers.SharedInformerFactory

	deployments appslisters.DeploymentLister
	daemonSets  appslisters.DaemonSetLister

	synced []cache.InformerSynced
}

// NewResourceCache creates informer-backed caches for Deployments and DaemonSets.
func NewResourceCache(client kubernetes.Interface, namespace string) *ResourceCache {
	factory := informers.NewSharedInformerFactoryWithOptions(
		client,
		0,
		informers.WithNamespace(namespace),
	)

	deploymentInformer := factory.Apps().V1().Deployments()
	daemonSetInformer := factory.Apps().V1().DaemonSets()

	return &ResourceCache{
		factory:     factory,
		deployments: deploymentInformer.Lister(),
		daemonSets:  daemonSetInformer.Lister(),
		synced: []cache.InformerSynced{
			deploymentInformer.Informer().HasSynced,
			daemonSetInformer.Informer().HasSynced,
		},
	}
}

// Start starts informers and waits until caches are synchronized.
func (c *ResourceCache) Start(ctx context.Context) error {
	c.factory.Start(ctx.Done())

	if ok := cache.WaitForCacheSync(ctx.Done(), c.synced...); !ok {
		return fmt.Errorf("%w", errCacheSyncFailed)
	}

	return nil
}

// ListDeployments lists deployments from informer cache.
func (c *ResourceCache) ListDeployments(selector labels.Selector) ([]*appsv1.Deployment, error) {
	deployments, err := c.deployments.List(selector)
	if err != nil {
		return nil, fmt.Errorf("list deployments: %w", err)
	}
	return deployments, nil
}

// ListDaemonSets lists daemonsets from informer cache.
func (c *ResourceCache) ListDaemonSets(selector labels.Selector) ([]*appsv1.DaemonSet, error) {
	daemonSets, err := c.daemonSets.List(selector)
	if err != nil {
		return nil, fmt.Errorf("list daemonsets: %w", err)
	}
	return daemonSets, nil
}
