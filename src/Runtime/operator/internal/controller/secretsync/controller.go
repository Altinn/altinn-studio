//nolint:govet // Production controller behavior is kept close to the pre-refactor implementation; suppress controller-local lint findings rather than riskier rewrites.
package secretsync

import (
	"context"
	"errors"
	"fmt"
	"maps"

	commontelemetry "altinn.studio/common/telemetry"
	"altinn.studio/operator/internal/telemetry"

	"github.com/go-logr/logr"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	rt "altinn.studio/operator/internal/runtime"
)

// +kubebuilder:rbac:groups="",resources=secrets,verbs=get;list;watch;create;update;delete
// +kubebuilder:rbac:groups=grafana.integreatly.org,resources=grafanas,verbs=get;list;watch

// SecretSyncReconciler watches secrets and syncs them across namespaces.
type SecretSyncReconciler struct {
	logger    logr.Logger
	k8sClient client.Client
	runtime   rt.Runtime
	mappings  []SecretSyncMapping
}

// NewReconciler creates a new SecretSync controller.
func NewReconciler(
	runtime rt.Runtime,
	k8sClient client.Client,
) *SecretSyncReconciler {
	return &SecretSyncReconciler{
		logger:    log.FromContext(context.Background()).WithName("secretsync"),
		k8sClient: k8sClient,
		runtime:   runtime,
		mappings:  DefaultMappings(),
	}
}

// NewReconcilerForTesting creates a reconciler with custom mappings for testing.
func NewReconcilerForTesting(
	runtime rt.Runtime,
	k8sClient client.Client,
	mappings []SecretSyncMapping,
) *SecretSyncReconciler {
	return &SecretSyncReconciler{
		logger:    log.FromContext(context.Background()).WithName("secretsync"),
		k8sClient: k8sClient,
		runtime:   runtime,
		mappings:  mappings,
	}
}

const controllerName = "secretsync"

// Reconcile handles secret changes and syncs them according to mappings.
func (r *SecretSyncReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	ctx, span := telemetry.StartRun(ctx, controllerName, "secretsync.Reconcile",
		telemetry.AttrObjectKind.String("Secret"),
		telemetry.AttrObjectNamespace.String(req.Namespace),
		telemetry.AttrObjectName.String(req.Name),
	)
	defer span.End()

	// A source can feed several destinations. Each one syncs on its own, so one that fails doesn't hold up the others.
	var syncErr error
	for _, mapping := range r.findMappings(req.Name, req.Namespace) {
		var err error
		if mapping.SourceName == req.Name && mapping.SourceNamespace == req.Namespace {
			_, err = r.reconcileFromSource(ctx, span, mapping)
		} else {
			_, err = r.reconcileFromDest(ctx, span, mapping)
		}
		syncErr = errors.Join(syncErr, err)
	}
	return ctrl.Result{}, syncErr
}

// reconcileFromSource syncs source -> dest when source changes.
func (r *SecretSyncReconciler) reconcileFromSource(
	ctx context.Context,
	span trace.Span,
	mapping SecretSyncMapping,
) (ctrl.Result, error) {
	sourceKey := client.ObjectKey{Name: mapping.SourceName, Namespace: mapping.SourceNamespace}
	destKey := client.ObjectKey{Name: mapping.DestName, Namespace: mapping.DestNamespace}

	source := &corev1.Secret{}
	err := r.k8sClient.Get(ctx, sourceKey, source)
	if apierrors.IsNotFound(err) {
		if !mapping.CanDeleteDest {
			return r.clearDestination(ctx, span, destKey, mapping)
		}
		return r.deleteDestination(ctx, span, destKey)
	}
	if err != nil {
		commontelemetry.SetError(span, "get_source_secret", err)
		return ctrl.Result{}, fmt.Errorf("failed to get source secret: %w", err)
	}

	return r.syncToDest(ctx, span, source, destKey, mapping)
}

// reconcileFromDest re-syncs from source when dest drifts.
func (r *SecretSyncReconciler) reconcileFromDest(
	ctx context.Context,
	span trace.Span,
	mapping SecretSyncMapping,
) (ctrl.Result, error) {
	sourceKey := client.ObjectKey{Name: mapping.SourceName, Namespace: mapping.SourceNamespace}
	destKey := client.ObjectKey{Name: mapping.DestName, Namespace: mapping.DestNamespace}

	source := &corev1.Secret{}
	err := r.k8sClient.Get(ctx, sourceKey, source)
	if apierrors.IsNotFound(err) {
		if !mapping.CanDeleteDest {
			return r.clearDestination(ctx, span, destKey, mapping)
		}
		return r.deleteDestination(ctx, span, destKey)
	}
	if err != nil {
		commontelemetry.SetError(span, "get_source_secret", err)
		return ctrl.Result{}, fmt.Errorf("failed to get source secret: %w", err)
	}

	return r.syncToDest(ctx, span, source, destKey, mapping)
}

func (r *SecretSyncReconciler) syncToDest(
	ctx context.Context,
	span trace.Span,
	source *corev1.Secret,
	destKey client.ObjectKey,
	mapping SecretSyncMapping,
) (ctrl.Result, error) {
	destData, err := r.buildDestData(ctx, source.Data, mapping)
	if err != nil {
		commontelemetry.SetError(span, "build_destination_data", err)
		return ctrl.Result{}, fmt.Errorf("failed to build destination data: %w", err)
	}

	dest := &corev1.Secret{}
	err = r.k8sClient.Get(ctx, destKey, dest)

	if apierrors.IsNotFound(err) {
		dest = &corev1.Secret{
			ObjectMeta: metav1.ObjectMeta{
				Name:        destKey.Name,
				Namespace:   destKey.Namespace,
				Labels:      copyLabels(source.Labels),
				Annotations: copyAnnotations(source.Annotations),
			},
			Type: source.Type,
			Data: destData,
		}
		dest.Labels["app.kubernetes.io/managed-by"] = "altinn-studio-operator"

		if err := r.k8sClient.Create(ctx, dest); err != nil {
			commontelemetry.SetError(span, "create_destination_secret", err)
			return ctrl.Result{}, fmt.Errorf("failed to create destination secret: %w", err)
		}
		r.logger.Info("created destination secret",
			"name", destKey.Name,
			"namespace", destKey.Namespace,
		)
		return ctrl.Result{}, nil
	}
	if err != nil {
		commontelemetry.SetError(span, "get_destination_secret", err)
		return ctrl.Result{}, fmt.Errorf("failed to get destination secret: %w", err)
	}

	dest.Labels = copyLabels(source.Labels)
	dest.Labels["app.kubernetes.io/managed-by"] = "altinn-studio-operator"
	dest.Annotations = copyAnnotations(source.Annotations)
	dest.Type = source.Type
	dest.Data = destData

	if err := r.k8sClient.Update(ctx, dest); err != nil {
		commontelemetry.SetError(span, "update_destination_secret", err)
		return ctrl.Result{}, fmt.Errorf("failed to update destination secret: %w", err)
	}
	r.logger.Info("synced destination secret",
		"name", destKey.Name,
		"namespace", destKey.Namespace,
	)
	return ctrl.Result{}, nil
}

func (r *SecretSyncReconciler) buildDestData(
	ctx context.Context,
	sourceData map[string][]byte,
	mapping SecretSyncMapping,
) (map[string][]byte, error) {
	if mapping.BuildData != nil {
		data, err := mapping.BuildData(ctx, r.k8sClient, sourceData)
		if err != nil {
			return nil, fmt.Errorf("transform secret data: %w", err)
		}
		return data, nil
	}
	if mapping.BuildOutput == nil {
		return copyData(sourceData), nil
	}

	transformed, err := mapping.BuildOutput(ctx, r.k8sClient, sourceData)
	if err != nil {
		return nil, fmt.Errorf("transform secret data: %w", err)
	}

	return map[string][]byte{
		mapping.DestKey: transformed,
	}, nil
}

func (r *SecretSyncReconciler) deleteDestination(
	ctx context.Context,
	span trace.Span,
	destKey client.ObjectKey,
) (ctrl.Result, error) {
	dest := &corev1.Secret{}
	err := r.k8sClient.Get(ctx, destKey, dest)
	if apierrors.IsNotFound(err) {
		return ctrl.Result{}, nil
	}
	if err != nil {
		commontelemetry.SetError(span, "get_destination_secret", err)
		return ctrl.Result{}, fmt.Errorf("failed to get destination secret for deletion: %w", err)
	}

	if err := r.k8sClient.Delete(ctx, dest); err != nil && !apierrors.IsNotFound(err) {
		commontelemetry.SetError(span, "delete_destination_secret", err)
		return ctrl.Result{}, fmt.Errorf("failed to delete destination secret: %w", err)
	}
	r.logger.Info("deleted destination secret (source was deleted)",
		"name", destKey.Name,
		"namespace", destKey.Namespace,
	)
	return ctrl.Result{}, nil
}

func (r *SecretSyncReconciler) clearDestination(
	ctx context.Context,
	span trace.Span,
	destKey client.ObjectKey,
	mapping SecretSyncMapping,
) (ctrl.Result, error) {
	dest := &corev1.Secret{}
	err := r.k8sClient.Get(ctx, destKey, dest)
	if apierrors.IsNotFound(err) {
		return ctrl.Result{}, nil
	}
	if err != nil {
		commontelemetry.SetError(span, "get_destination_secret", err)
		return ctrl.Result{}, fmt.Errorf("failed to get destination secret for clearing: %w", err)
	}

	if mapping.ClearOutput != nil {
		dest.Data = map[string][]byte{mapping.DestKey: mapping.ClearOutput()}
	} else {
		dest.Data = nil
	}

	if err := r.k8sClient.Update(ctx, dest); err != nil {
		commontelemetry.SetError(span, "clear_destination_secret", err)
		return ctrl.Result{}, fmt.Errorf("failed to clear destination secret: %w", err)
	}
	r.logger.Info("cleared destination secret (source was deleted)",
		"name", destKey.Name,
		"namespace", destKey.Namespace,
	)
	return ctrl.Result{}, nil
}

// findMappings returns the mappings that read the secret, and the mapping that writes it.
func (r *SecretSyncReconciler) findMappings(name, namespace string) []SecretSyncMapping {
	var found []SecretSyncMapping
	for _, m := range r.mappings {
		if (m.SourceName == name && m.SourceNamespace == namespace) ||
			(m.DestName == name && m.DestNamespace == namespace) {
			found = append(found, m)
		}
	}
	return found
}

func (r *SecretSyncReconciler) hasMapping(name, namespace string) bool {
	return len(r.findMappings(name, namespace)) > 0
}

// SetupWithManager registers the controller with the manager.
func (r *SecretSyncReconciler) SetupWithManager(mgr ctrl.Manager) error {
	if err := ctrl.NewControllerManagedBy(mgr).
		Named("secretsync").
		For(&corev1.Secret{}, builder.WithPredicates(r.secretPredicate())).
		Complete(telemetry.QuietOnCancel(r)); err != nil {
		return fmt.Errorf("complete SecretSync controller builder: %w", err)
	}
	return nil
}

func (r *SecretSyncReconciler) secretPredicate() predicate.Predicate {
	return predicate.Funcs{
		CreateFunc: func(e event.CreateEvent) bool {
			return r.hasMapping(e.Object.GetName(), e.Object.GetNamespace())
		},
		UpdateFunc: func(e event.UpdateEvent) bool {
			return r.hasMapping(e.ObjectNew.GetName(), e.ObjectNew.GetNamespace())
		},
		DeleteFunc: func(e event.DeleteEvent) bool {
			return r.hasMapping(e.Object.GetName(), e.Object.GetNamespace())
		},
		GenericFunc: func(e event.GenericEvent) bool {
			return r.hasMapping(e.Object.GetName(), e.Object.GetNamespace())
		},
	}
}

// SyncAll synchronizes all mappings. Useful for testing and initial sync.
func (r *SecretSyncReconciler) SyncAll(ctx context.Context) error {
	ctx, span := telemetry.StartRun(ctx, controllerName, "secretsync.SyncAll",
		attribute.Int("altinn.operator.secretsync.mappings", len(r.mappings)),
	)
	defer span.End()

	// Reconciling a source syncs every mapping that reads it, so each source is reconciled once.
	var syncErr error
	synced := make(map[client.ObjectKey]bool, len(r.mappings))
	for _, mapping := range r.mappings {
		sourceKey := client.ObjectKey{Name: mapping.SourceName, Namespace: mapping.SourceNamespace}
		if synced[sourceKey] {
			continue
		}
		synced[sourceKey] = true
		_, err := r.Reconcile(ctx, reconcile.Request{NamespacedName: sourceKey})
		if err != nil {
			syncErr = errors.Join(syncErr, err)
			if !errors.Is(err, context.Canceled) {
				r.logger.Error(err, "failed to sync mapping",
					"sourceName", mapping.SourceName,
					"sourceNamespace", mapping.SourceNamespace,
				)
			}
			// The run was stopped, so the remaining mappings would fail the same way.
			if ctx.Err() != nil {
				break
			}
		}
	}

	if syncErr != nil {
		commontelemetry.SetError(span, "sync_mappings", syncErr)
	}
	return syncErr
}

func copyLabels(src map[string]string) map[string]string {
	if src == nil {
		return make(map[string]string)
	}
	dst := make(map[string]string, len(src))
	maps.Copy(dst, src)
	return dst
}

func copyAnnotations(src map[string]string) map[string]string {
	if src == nil {
		return nil
	}
	dst := make(map[string]string, len(src))
	maps.Copy(dst, src)
	return dst
}

func copyData(src map[string][]byte) map[string][]byte {
	if src == nil {
		return nil
	}
	dst := make(map[string][]byte, len(src))
	for k, v := range src {
		cp := make([]byte, len(v))
		copy(cp, v)
		dst[k] = cp
	}
	return dst
}
