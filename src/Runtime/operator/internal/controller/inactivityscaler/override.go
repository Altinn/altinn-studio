package inactivityscaler

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

var errInvalidForcedClusterState = errors.New("invalid forced cluster state")

const (
	runtimeOperatorNamespace     = "runtime-operator"
	forceStateConfigMapName      = "inactivity-scaler-override"
	forceStateConfigMapNamespace = runtimeOperatorNamespace
	forceStateConfigMapStateKey  = "state"
	forceStateAutoValue          = "auto"
)

// +kubebuilder:rbac:groups="",resources=configmaps,verbs=get

func (r *InactivityScalerReconciler) resolveClusterStateWithOverride(
	ctx context.Context,
	serviceOwner,
	environment string,
	now time.Time,
	appCount int,
) (clusterState, bool) {
	state := resolveClusterState(serviceOwner, environment, now, appCount)
	override, hasOverride, err := r.forcedClusterStateFromConfigMap(ctx)
	if err != nil {
		r.logger.Error(
			err,
			"failed to resolve forced-state override, using computed state",
			"serviceOwner",
			serviceOwner,
			"environment",
			environment,
		)
		return state, false
	}
	if hasOverride {
		return override, true
	}
	return state, false
}

func (r *InactivityScalerReconciler) forcedClusterStateFromConfigMap(ctx context.Context) (clusterState, bool, error) {
	cm := &corev1.ConfigMap{}
	key := client.ObjectKey{Name: forceStateConfigMapName, Namespace: forceStateConfigMapNamespace}
	if err := r.k8sReader.Get(ctx, key, cm); err != nil {
		if apierrors.IsNotFound(err) {
			return stateNormal, false, nil
		}
		return stateNormal, false, fmt.Errorf("get configmap %s/%s: %w", key.Namespace, key.Name, err)
	}
	return parseForcedClusterState(cm.Data[forceStateConfigMapStateKey])
}

func parseForcedClusterState(raw string) (clusterState, bool, error) {
	value := strings.TrimSpace(strings.ToLower(raw))
	switch value {
	case "", forceStateAutoValue:
		return stateNormal, false, nil
	case string(stateNormal):
		return stateNormal, true, nil
	case string(stateTTDOffhours):
		return stateTTDOffhours, true, nil
	case string(stateNoApps):
		return stateNoApps, true, nil
	case string(stateTTDOffhoursNoApps):
		return stateTTDOffhoursNoApps, true, nil
	default:
		return stateNormal, false, fmt.Errorf(
			"%w: configmap %s/%s key %q has invalid value %q (valid: auto, %s, %s, %s, %s)",
			errInvalidForcedClusterState,
			forceStateConfigMapNamespace,
			forceStateConfigMapName,
			forceStateConfigMapStateKey,
			value,
			stateNormal,
			stateTTDOffhours,
			stateNoApps,
			stateTTDOffhoursNoApps,
		)
	}
}
