package inactivityscaler

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"

	"altinn.studio/operator/internal/operatorcontext"
	rt "altinn.studio/operator/internal/runtime"
	"github.com/go-logr/logr"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
	appsv1 "k8s.io/api/apps/v1"
	autoscalingv2 "k8s.io/api/autoscaling/v2"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/utils/ptr"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

const (
	defaultNamespace        = "default"
	runtimeGatewayNamespace = "runtime-gateway"
	runtimePdf3Namespace    = "runtime-pdf3"

	appReleaseLabelKey = "release"

	reconcileAnnotationKey      = "kustomize.toolkit.fluxcd.io/reconcile"
	reconcileDisabledValue      = "disabled"
	scalerManagedAnnotationKey  = "altinn.studio/inactivity-scaler"
	scalerBaselineAnnotationKey = "altinn.studio/inactivity-scaler-baseline"

	gatewayDeploymentName = "gateway"
	pdf3ProxyHpaName      = "pdf3-proxy-hpa"
	pdf3WorkerHpaName     = "pdf3-worker-hpa"

	scaleDownReplicaZero    = int32(0)
	scaleDownReplicaOne     = int32(1)
	desiredWorkdayStartHour = 6
	desiredWorkdayEndHour   = 18
	maxUpdateRetries        = 3
)

var (
	defaultPollInterval      = time.Minute
	osloLocation             = mustLoadLocation("Europe/Oslo")
	ttdScaleDownEnvironments = map[string]struct{}{
		"at22": {},
		"at23": {},
		"at24": {},
		"tt02": {},
		"yt01": {},
	}
)

// +kubebuilder:rbac:groups=apps,resources=deployments,verbs=get;list;watch;update
// +kubebuilder:rbac:groups=autoscaling,resources=horizontalpodautoscalers,verbs=get;list;watch;update

// clusterState is the desired scaling mode derived from service owner, environment,
// local time (Europe/Oslo), and whether any apps are deployed.
//
// Scaling paths:
// - normal: restore app deployments/HPAs, gateway, and pdf3 to baseline.
// - ttd_offhours: scale apps/gateway/pdf3 to 1 outside workhours for targeted ttd environments.
// - no_apps: keep gateway at 1 and scale pdf3 to 0 until an app deployment appears.
// - ttd_offhours_no_apps: same as no_apps for pdf3 (0), while app/gateway logic follows offhours/no-app rules.
type clusterState string

const (
	stateNormal            clusterState = "normal"
	stateTTDOffhours       clusterState = "ttd_offhours"
	stateNoApps            clusterState = "no_apps"
	stateTTDOffhoursNoApps clusterState = "ttd_offhours_no_apps"
)

func (s clusterState) scaleApps() bool {
	return s == stateTTDOffhours || s == stateTTDOffhoursNoApps
}

func (s clusterState) scaleGateway() bool {
	return s == stateTTDOffhours || s == stateNoApps || s == stateTTDOffhoursNoApps
}

func (s clusterState) pdf3ScaleTarget() (bool, int32) {
	switch s {
	case stateNoApps, stateTTDOffhoursNoApps:
		return true, scaleDownReplicaZero
	case stateTTDOffhours:
		return true, scaleDownReplicaOne
	default:
		return false, scaleDownReplicaOne
	}
}

type optionalInt32 struct {
	Set   bool  `json:"set"`
	Value int32 `json:"value,omitempty"`
}

type scaleBaseline struct {
	Replicas    optionalInt32 `json:"replicas,omitempty"`
	MinReplicas optionalInt32 `json:"minReplicas,omitempty"`
}

// InactivityScalerReconciler scales selected workloads down during inactivity.
// It runs periodically and applies a small state machine based on time and app presence.
type InactivityScalerReconciler struct {
	logger       logr.Logger
	k8sClient    client.Client
	runtime      rt.Runtime
	pollInterval time.Duration
	location     *time.Location
}

func NewReconciler(runtime rt.Runtime, k8sClient client.Client) *InactivityScalerReconciler {
	return &InactivityScalerReconciler{
		logger:       log.FromContext(context.Background()).WithName("inactivityscaler"),
		k8sClient:    k8sClient,
		runtime:      runtime,
		pollInterval: defaultPollInterval,
		location:     osloLocation,
	}
}

func NewReconcilerForTesting(
	runtime rt.Runtime,
	k8sClient client.Client,
	pollInterval time.Duration,
	location *time.Location,
) *InactivityScalerReconciler {
	if pollInterval <= 0 {
		pollInterval = defaultPollInterval
	}
	if location == nil {
		location = osloLocation
	}
	return &InactivityScalerReconciler{
		logger:       log.FromContext(context.Background()).WithName("inactivityscaler"),
		k8sClient:    k8sClient,
		runtime:      runtime,
		pollInterval: pollInterval,
		location:     location,
	}
}

func (r *InactivityScalerReconciler) NeedLeaderElection() bool {
	return true
}

func (r *InactivityScalerReconciler) Start(ctx context.Context) error {
	clock := r.runtime.GetClock()
	r.logger.Info("starting InactivityScaler controller", "pollInterval", r.pollInterval)

	if err := r.SyncAll(ctx); err != nil {
		r.logger.Error(err, "initial sync failed")
	}

	ticker := clock.NewTicker(r.pollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			r.logger.Info("exiting InactivityScaler controller")
			return nil
		case <-ticker.Chan():
			if err := r.SyncAll(ctx); err != nil {
				r.logger.Error(err, "sync failed")
			}
		}
	}
}

func (r *InactivityScalerReconciler) SyncAll(ctx context.Context) error {
	ctx, span := r.runtime.Tracer().Start(ctx, "inactivityscaler.SyncAll")
	defer span.End()

	opCtx := r.runtime.GetOperatorContext()
	if opCtx.Environment == operatorcontext.EnvironmentProd {
		span.SetAttributes(
			attribute.String("serviceOwner", opCtx.ServiceOwner.Id),
			attribute.String("environment", opCtx.Environment),
			attribute.Bool("skipped", true),
			attribute.String("skipReason", "prod"),
		)
		span.SetStatus(codes.Ok, "skipped in prod")
		return nil
	}
	appDeployments, err := r.listAppDeployments(ctx, opCtx.ServiceOwner.Id)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "list app deployments")
		return fmt.Errorf("list app deployments: %w", err)
	}
	deploymentNames := appDeploymentNameSet(appDeployments)
	appHpas, err := r.listAppHpas(ctx, deploymentNames)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "list app hpas")
		return fmt.Errorf("list app HPAs: %w", err)
	}

	now := r.runtime.GetClock().Now().In(r.location)
	state := resolveClusterState(opCtx.ServiceOwner.Id, opCtx.Environment, now, len(appDeployments))
	span.SetAttributes(
		attribute.String("serviceOwner", opCtx.ServiceOwner.Id),
		attribute.String("environment", opCtx.Environment),
		attribute.String("state", string(state)),
		attribute.Int("appDeployments", len(appDeployments)),
		attribute.Int("appHPAs", len(appHpas)),
	)

	r.logger.Info("reconciling inactivity scaler state",
		"state", state,
		"serviceOwner", opCtx.ServiceOwner.Id,
		"environment", opCtx.Environment,
		"appDeployments", len(appDeployments),
		"appHPAs", len(appHpas),
		"time", now.Format(time.RFC3339),
	)

	for i := range appDeployments {
		key := client.ObjectKey{Name: appDeployments[i].Name, Namespace: appDeployments[i].Namespace}
		if err := r.reconcileDeployment(ctx, key, state.scaleApps(), scaleDownReplicaOne); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, "reconcile app deployment")
			return err
		}
	}

	for i := range appHpas {
		key := client.ObjectKey{Name: appHpas[i].Name, Namespace: appHpas[i].Namespace}
		if err := r.reconcileHpa(ctx, key, state.scaleApps(), scaleDownReplicaOne); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, "reconcile app hpa")
			return err
		}
	}

	if err := r.reconcileDeployment(ctx, client.ObjectKey{Name: gatewayDeploymentName, Namespace: runtimeGatewayNamespace}, state.scaleGateway(), scaleDownReplicaOne); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "reconcile gateway")
		return err
	}
	pdf3ShouldScale, pdf3Target := state.pdf3ScaleTarget()
	if err := r.reconcileHpa(ctx, client.ObjectKey{Name: pdf3ProxyHpaName, Namespace: runtimePdf3Namespace}, pdf3ShouldScale, pdf3Target); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "reconcile pdf3-proxy")
		return err
	}
	if err := r.reconcileHpa(ctx, client.ObjectKey{Name: pdf3WorkerHpaName, Namespace: runtimePdf3Namespace}, pdf3ShouldScale, pdf3Target); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "reconcile pdf3-worker")
		return err
	}

	span.SetStatus(codes.Ok, "ok")
	return nil
}

func resolveClusterState(serviceOwner, environment string, now time.Time, appCount int) clusterState {
	noApps := appCount == 0
	ttdTarget := isTtdScaleDownTarget(serviceOwner, environment)
	offhours := !isWorkhours(now)

	switch {
	case noApps && ttdTarget && offhours:
		return stateTTDOffhoursNoApps
	case noApps:
		return stateNoApps
	case ttdTarget && offhours:
		return stateTTDOffhours
	default:
		return stateNormal
	}
}

func isTtdScaleDownTarget(serviceOwner, environment string) bool {
	if serviceOwner != "ttd" {
		return false
	}
	_, ok := ttdScaleDownEnvironments[environment]
	return ok
}

func isWorkhours(t time.Time) bool {
	weekday := t.Weekday()
	if weekday == time.Saturday || weekday == time.Sunday {
		return false
	}
	hour := t.Hour()
	return hour >= desiredWorkdayStartHour && hour < desiredWorkdayEndHour
}

func (r *InactivityScalerReconciler) listAppDeployments(ctx context.Context, serviceOwner string) ([]appsv1.Deployment, error) {
	list := &appsv1.DeploymentList{}
	if err := r.k8sClient.List(ctx, list, client.InNamespace(defaultNamespace)); err != nil {
		return nil, err
	}
	result := make([]appsv1.Deployment, 0, len(list.Items))
	for i := range list.Items {
		if isAppDeployment(serviceOwner, &list.Items[i]) {
			result = append(result, list.Items[i])
		}
	}
	sort.SliceStable(result, func(i, j int) bool { return result[i].Name < result[j].Name })
	return result, nil
}

func isAppDeployment(serviceOwner string, deployment *appsv1.Deployment) bool {
	if deployment == nil || serviceOwner == "" {
		return false
	}
	prefix := serviceOwner + "-"
	if !strings.HasPrefix(deployment.Name, prefix) {
		return false
	}
	releaseLabel := deployment.Labels[appReleaseLabelKey]
	return strings.HasPrefix(releaseLabel, prefix)
}

func appDeploymentNameSet(deployments []appsv1.Deployment) map[string]struct{} {
	result := make(map[string]struct{}, len(deployments))
	for i := range deployments {
		result[deployments[i].Name] = struct{}{}
	}
	return result
}

func (r *InactivityScalerReconciler) listAppHpas(ctx context.Context, appDeploymentNames map[string]struct{}) ([]autoscalingv2.HorizontalPodAutoscaler, error) {
	list := &autoscalingv2.HorizontalPodAutoscalerList{}
	if err := r.k8sClient.List(ctx, list, client.InNamespace(defaultNamespace)); err != nil {
		return nil, err
	}
	result := make([]autoscalingv2.HorizontalPodAutoscaler, 0, len(list.Items))
	for i := range list.Items {
		hpa := &list.Items[i]
		if hpa.Spec.ScaleTargetRef.Kind != "Deployment" {
			continue
		}
		if _, ok := appDeploymentNames[hpa.Spec.ScaleTargetRef.Name]; !ok {
			continue
		}
		result = append(result, *hpa)
	}
	sort.SliceStable(result, func(i, j int) bool { return result[i].Name < result[j].Name })
	return result, nil
}

func (r *InactivityScalerReconciler) reconcileDeployment(
	ctx context.Context,
	key client.ObjectKey,
	shouldScale bool,
	target int32,
) error {
	return r.reconcileWithRetry(
		ctx,
		"Deployment",
		key,
		func() client.Object { return &appsv1.Deployment{} },
		func(obj client.Object) (bool, error) {
			return applyDeploymentState(obj.(*appsv1.Deployment), shouldScale, target)
		},
	)
}

func (r *InactivityScalerReconciler) reconcileHpa(
	ctx context.Context,
	key client.ObjectKey,
	shouldScale bool,
	target int32,
) error {
	return r.reconcileWithRetry(
		ctx,
		"HorizontalPodAutoscaler",
		key,
		func() client.Object { return &autoscalingv2.HorizontalPodAutoscaler{} },
		func(obj client.Object) (bool, error) {
			return applyHpaState(obj.(*autoscalingv2.HorizontalPodAutoscaler), shouldScale, target)
		},
	)
}

func (r *InactivityScalerReconciler) reconcileWithRetry(
	ctx context.Context,
	kind string,
	key client.ObjectKey,
	newObj func() client.Object,
	applyState func(client.Object) (bool, error),
) error {
	ctx, span := r.runtime.Tracer().Start(
		ctx,
		"inactivityscaler.reconcileWithRetry",
		trace.WithAttributes(
			attribute.String("kind", kind),
			attribute.String("namespace", key.Namespace),
			attribute.String("name", key.Name),
		),
	)
	defer span.End()

	obj := newObj()
	if err := r.k8sClient.Get(ctx, key, obj); err != nil {
		if apierrors.IsNotFound(err) {
			return nil
		}
		span.RecordError(err)
		return fmt.Errorf("get %s %s/%s: %w", kind, key.Namespace, key.Name, err)
	}

	for attempt := 1; attempt <= maxUpdateRetries; attempt++ {
		changed, err := applyState(obj)
		if err != nil {
			span.RecordError(err)
			return fmt.Errorf("apply state %s %s/%s: %w", kind, key.Namespace, key.Name, err)
		}
		if !changed {
			return nil
		}

		if err := r.k8sClient.Update(ctx, obj); err == nil {
			return nil
		} else if !apierrors.IsConflict(err) {
			span.RecordError(err)
			return fmt.Errorf("update %s %s/%s: %w", kind, key.Namespace, key.Name, err)
		} else if attempt == maxUpdateRetries {
			span.RecordError(err)
			return fmt.Errorf("update %s %s/%s after %d retries: %w", kind, key.Namespace, key.Name, maxUpdateRetries, err)
		}

		obj = newObj()
		if err := r.k8sClient.Get(ctx, key, obj); err != nil {
			if apierrors.IsNotFound(err) {
				return nil
			}
			span.RecordError(err)
			return fmt.Errorf("refresh %s %s/%s: %w", kind, key.Namespace, key.Name, err)
		}
	}

	return nil
}

func applyDeploymentState(deployment *appsv1.Deployment, shouldScale bool, target int32) (bool, error) {
	changed := false
	baseline, hasBaseline, err := getScaleBaseline(deployment)
	if err != nil {
		return false, err
	}

	if shouldScale {
		if !hasBaseline {
			baseline = scaleBaseline{Replicas: optionalInt32FromPointer(deployment.Spec.Replicas)}
			if updated, setErr := setScaleBaseline(deployment, baseline); setErr != nil {
				return false, setErr
			} else {
				changed = changed || updated
			}
		}
		changed = setManagedByScaler(deployment, true) || changed
		changed = setReconcileDisabled(deployment, true) || changed
		if deployment.Spec.Replicas == nil || *deployment.Spec.Replicas != target {
			deployment.Spec.Replicas = ptr.To(target)
			changed = true
		}
		return changed, nil
	}

	if hasBaseline {
		if baseline.Replicas.Set {
			if deployment.Spec.Replicas == nil || *deployment.Spec.Replicas != baseline.Replicas.Value {
				deployment.Spec.Replicas = ptr.To(baseline.Replicas.Value)
				changed = true
			}
		} else if deployment.Spec.Replicas != nil {
			deployment.Spec.Replicas = nil
			changed = true
		}
		changed = removeScaleBaseline(deployment) || changed
	}
	changed = setManagedByScaler(deployment, false) || changed
	changed = setReconcileDisabled(deployment, false) || changed
	return changed, nil
}

func applyHpaState(hpa *autoscalingv2.HorizontalPodAutoscaler, shouldScale bool, target int32) (bool, error) {
	changed := false
	baseline, hasBaseline, err := getScaleBaseline(hpa)
	if err != nil {
		return false, err
	}

	if shouldScale {
		if !hasBaseline {
			baseline = scaleBaseline{MinReplicas: optionalInt32FromPointer(hpa.Spec.MinReplicas)}
			if updated, setErr := setScaleBaseline(hpa, baseline); setErr != nil {
				return false, setErr
			} else {
				changed = changed || updated
			}
		}
		changed = setManagedByScaler(hpa, true) || changed
		changed = setReconcileDisabled(hpa, true) || changed
		if hpa.Spec.MinReplicas == nil || *hpa.Spec.MinReplicas != target {
			hpa.Spec.MinReplicas = ptr.To(target)
			changed = true
		}
		return changed, nil
	}

	if hasBaseline {
		if baseline.MinReplicas.Set {
			if hpa.Spec.MinReplicas == nil || *hpa.Spec.MinReplicas != baseline.MinReplicas.Value {
				hpa.Spec.MinReplicas = ptr.To(baseline.MinReplicas.Value)
				changed = true
			}
		} else if hpa.Spec.MinReplicas != nil {
			hpa.Spec.MinReplicas = nil
			changed = true
		}
		changed = removeScaleBaseline(hpa) || changed
	}
	changed = setManagedByScaler(hpa, false) || changed
	changed = setReconcileDisabled(hpa, false) || changed
	return changed, nil
}

func optionalInt32FromPointer(v *int32) optionalInt32 {
	if v == nil {
		return optionalInt32{Set: false}
	}
	return optionalInt32{Set: true, Value: *v}
}

func setReconcileDisabled(obj client.Object, disabled bool) bool {
	if disabled {
		return setAnnotation(obj, reconcileAnnotationKey, reconcileDisabledValue)
	}
	return removeAnnotation(obj, reconcileAnnotationKey)
}

func setManagedByScaler(obj client.Object, managed bool) bool {
	if managed {
		return setAnnotation(obj, scalerManagedAnnotationKey, "true")
	}
	return removeAnnotation(obj, scalerManagedAnnotationKey)
}

func setScaleBaseline(obj client.Object, baseline scaleBaseline) (bool, error) {
	payload, err := json.Marshal(baseline)
	if err != nil {
		return false, fmt.Errorf("marshal scale baseline: %w", err)
	}
	return setAnnotation(obj, scalerBaselineAnnotationKey, string(payload)), nil
}

func getScaleBaseline(obj client.Object) (scaleBaseline, bool, error) {
	annotations := obj.GetAnnotations()
	if annotations == nil {
		return scaleBaseline{}, false, nil
	}
	value, ok := annotations[scalerBaselineAnnotationKey]
	if !ok || value == "" {
		return scaleBaseline{}, false, nil
	}
	baseline := scaleBaseline{}
	if err := json.Unmarshal([]byte(value), &baseline); err != nil {
		return scaleBaseline{}, false, fmt.Errorf("unmarshal scale baseline annotation on %s/%s: %w", obj.GetNamespace(), obj.GetName(), err)
	}
	return baseline, true, nil
}

func removeScaleBaseline(obj client.Object) bool {
	return removeAnnotation(obj, scalerBaselineAnnotationKey)
}

func setAnnotation(obj client.Object, key, value string) bool {
	annotations := obj.GetAnnotations()
	if annotations == nil {
		annotations = map[string]string{}
	}
	if current, ok := annotations[key]; ok && current == value {
		return false
	}
	annotations[key] = value
	obj.SetAnnotations(annotations)
	return true
}

func removeAnnotation(obj client.Object, key string) bool {
	annotations := obj.GetAnnotations()
	if annotations == nil {
		return false
	}
	if _, ok := annotations[key]; !ok {
		return false
	}
	delete(annotations, key)
	obj.SetAnnotations(annotations)
	return true
}

func mustLoadLocation(name string) *time.Location {
	loc, err := time.LoadLocation(name)
	if err != nil {
		panic(fmt.Sprintf("failed to load location %q: %v", name, err))
	}
	return loc
}
