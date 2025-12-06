package secretsync

import (
	"context"
	"fmt"

	rt "altinn.studio/operator/internal/runtime"
	"github.com/go-logr/logr"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
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

// Reconcile handles secret changes and syncs them according to mappings.
func (r *SecretSyncReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	tracer := r.runtime.Tracer()
	ctx, span := tracer.Start(ctx, "secretsync.Reconcile",
		trace.WithAttributes(
			attribute.String("name", req.Name),
			attribute.String("namespace", req.Namespace),
		),
	)
	defer span.End()

	mapping := r.findMapping(req.Name, req.Namespace)
	if mapping == nil {
		return ctrl.Result{}, nil
	}

	isSource := mapping.SourceName == req.Name && mapping.SourceNamespace == req.Namespace

	if isSource {
		return r.reconcileFromSource(ctx, span, *mapping)
	}
	return r.reconcileFromDest(ctx, span, *mapping)
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
		return r.deleteDestination(ctx, span, destKey)
	}
	if err != nil {
		span.RecordError(err)
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
		return r.deleteDestination(ctx, span, destKey)
	}
	if err != nil {
		span.RecordError(err)
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
		span.RecordError(err)
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
			span.RecordError(err)
			return ctrl.Result{}, fmt.Errorf("failed to create destination secret: %w", err)
		}
		r.logger.Info("created destination secret",
			"name", destKey.Name,
			"namespace", destKey.Namespace,
		)
		return ctrl.Result{}, nil
	}
	if err != nil {
		span.RecordError(err)
		return ctrl.Result{}, fmt.Errorf("failed to get destination secret: %w", err)
	}

	dest.Labels = copyLabels(source.Labels)
	dest.Labels["app.kubernetes.io/managed-by"] = "altinn-studio-operator"
	dest.Annotations = copyAnnotations(source.Annotations)
	dest.Type = source.Type
	dest.Data = destData

	if err := r.k8sClient.Update(ctx, dest); err != nil {
		span.RecordError(err)
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
	if mapping.BuildOutput == nil {
		return copyData(sourceData), nil
	}

	transformed, err := mapping.BuildOutput(ctx, r.k8sClient, sourceData)
	if err != nil {
		return nil, err
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
		span.RecordError(err)
		return ctrl.Result{}, fmt.Errorf("failed to get destination secret for deletion: %w", err)
	}

	if err := r.k8sClient.Delete(ctx, dest); err != nil && !apierrors.IsNotFound(err) {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to delete destination")
		return ctrl.Result{}, fmt.Errorf("failed to delete destination secret: %w", err)
	}
	r.logger.Info("deleted destination secret (source was deleted)",
		"name", destKey.Name,
		"namespace", destKey.Namespace,
	)
	return ctrl.Result{}, nil
}

func (r *SecretSyncReconciler) findMapping(name, namespace string) *SecretSyncMapping {
	for i := range r.mappings {
		m := &r.mappings[i]
		if m.SourceName == name && m.SourceNamespace == namespace {
			return m
		}
		if m.DestName == name && m.DestNamespace == namespace {
			return m
		}
	}
	return nil
}

// SetupWithManager registers the controller with the manager.
func (r *SecretSyncReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&corev1.Secret{}, builder.WithPredicates(r.secretPredicate())).
		Complete(r)
}

func (r *SecretSyncReconciler) secretPredicate() predicate.Predicate {
	return predicate.Funcs{
		CreateFunc: func(e event.CreateEvent) bool {
			return r.findMapping(e.Object.GetName(), e.Object.GetNamespace()) != nil
		},
		UpdateFunc: func(e event.UpdateEvent) bool {
			return r.findMapping(e.ObjectNew.GetName(), e.ObjectNew.GetNamespace()) != nil
		},
		DeleteFunc: func(e event.DeleteEvent) bool {
			return r.findMapping(e.Object.GetName(), e.Object.GetNamespace()) != nil
		},
		GenericFunc: func(e event.GenericEvent) bool {
			return r.findMapping(e.Object.GetName(), e.Object.GetNamespace()) != nil
		},
	}
}

// SyncAll synchronizes all mappings. Useful for testing and initial sync.
func (r *SecretSyncReconciler) SyncAll(ctx context.Context) error {
	tracer := r.runtime.Tracer()
	ctx, span := tracer.Start(ctx, "secretsync.SyncAll",
		trace.WithAttributes(attribute.Int("mappings", len(r.mappings))),
	)
	defer span.End()

	var lastErr error
	for _, mapping := range r.mappings {
		_, err := r.Reconcile(ctx, reconcile.Request{
			NamespacedName: client.ObjectKey{
				Name:      mapping.SourceName,
				Namespace: mapping.SourceNamespace,
			},
		})
		if err != nil {
			r.logger.Error(err, "failed to sync mapping",
				"sourceName", mapping.SourceName,
				"sourceNamespace", mapping.SourceNamespace,
			)
			lastErr = err
		}
	}

	if lastErr != nil {
		span.SetStatus(codes.Error, "one or more mappings failed")
	}
	return lastErr
}

func copyLabels(src map[string]string) map[string]string {
	if src == nil {
		return make(map[string]string)
	}
	dst := make(map[string]string, len(src))
	for k, v := range src {
		dst[k] = v
	}
	return dst
}

func copyAnnotations(src map[string]string) map[string]string {
	if src == nil {
		return nil
	}
	dst := make(map[string]string, len(src))
	for k, v := range src {
		dst[k] = v
	}
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
