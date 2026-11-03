// Package appinventory finds the service owner's apps in the cluster and reports how many run.
package appinventory

import (
	"context"
	"fmt"
	"strings"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
	appsv1 "k8s.io/api/apps/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"altinn.studio/operator/internal/telemetry"

	rt "altinn.studio/operator/internal/runtime"
)

// Namespace is the namespace the apps are deployed to.
const Namespace = "default"

const releaseLabel = "release"

// CountMetric is the gauge of the service owner's apps in the cluster by state: running when the
// app's Deployment has a ready replica, and not_running otherwise, as when the inactivity scaler
// has scaled it to zero or the app fails to start.
const (
	CountMetric     = "altinn.operator.app.count"
	stateAttribute  = "altinn.operator.app.state"
	stateRunning    = "running"
	stateNotRunning = "not_running"
)

// +kubebuilder:rbac:groups=apps,resources=deployments,verbs=get;list;watch

// IsAppDeployment reports whether a Deployment is one of the service owner's apps. The app's
// Helm release names both the Deployment and its release label after the service owner.
func IsAppDeployment(serviceOwner string, deployment *appsv1.Deployment) bool {
	if deployment == nil || serviceOwner == "" {
		return false
	}
	prefix := serviceOwner + "-"
	return strings.HasPrefix(deployment.Name, prefix) && strings.HasPrefix(deployment.Labels[releaseLabel], prefix)
}

// RegisterCountMetric registers CountMetric, which lists the app Deployments through reader at
// each collection.
func RegisterCountMetric(runtime rt.Runtime, reader client.Reader) error {
	_, err := runtime.Meter().Int64ObservableGauge(
		CountMetric,
		metric.WithUnit("{app}"),
		metric.WithDescription("The service owner's apps in the cluster, by whether they run."),
		metric.WithInt64Callback(func(ctx context.Context, observer metric.Int64Observer) error {
			if !telemetry.IsLeader() {
				return nil
			}
			list := &appsv1.DeploymentList{}
			if err := reader.List(ctx, list, client.InNamespace(Namespace)); err != nil {
				// Not returned: a callback's error makes the reader drop the whole collection,
				// every other metric of the interval included.
				otel.Handle(fmt.Errorf("observe %s: list Deployments: %w", CountMetric, err))
				return nil
			}
			serviceOwner := runtime.GetOperatorContext().ServiceOwner.Id
			for state, count := range countByState(serviceOwner, list.Items) {
				observer.Observe(count, metric.WithAttributes(attribute.String(stateAttribute, state)))
			}
			return nil
		}),
	)
	if err != nil {
		return fmt.Errorf("register %s: %w", CountMetric, err)
	}
	return nil
}

func countByState(serviceOwner string, deployments []appsv1.Deployment) map[string]int64 {
	counts := map[string]int64{stateRunning: 0, stateNotRunning: 0}
	for i := range deployments {
		if !IsAppDeployment(serviceOwner, &deployments[i]) {
			continue
		}
		if deployments[i].Status.ReadyReplicas > 0 {
			counts[stateRunning]++
		} else {
			counts[stateNotRunning]++
		}
	}
	return counts
}
