package secretsync

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"slices"

	"go.opentelemetry.io/otel/trace"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"

	commontelemetry "altinn.studio/common/telemetry"
)

// +kubebuilder:rbac:groups=opentelemetry.io,resources=opentelemetrycollectors,verbs=get;patch

var collectorGVK = schema.GroupVersionKind{
	Group:   "opentelemetry.io",
	Version: "v1beta1",
	Kind:    "OpenTelemetryCollector",
}

// The operator's own field manager. Flux applies the collector with server-side apply and leaves fields other
// managers set alone, so the annotation survives Flux's reconciles.
const rolloutFieldOwner = "altinn-studio-operator"

// rolloutAbsent stands in for the hash while the destination doesn't exist. Removing the annotation wouldn't roll the
// pods: the OpenTelemetry Operator keeps a pod annotation in its Deployment after it leaves the collector.
const rolloutAbsent = "absent"

// rolloutAnnotation is the pod annotation that holds the hash of the destination's data.
func rolloutAnnotation(mapping SecretSyncMapping) string {
	return "secretsync.altinn.studio/" + mapping.DestName
}

// rolloutCollector sets the collector's pod annotation to the hash of the destination's data, or to rolloutAbsent once
// the destination is gone. A collector that never had the destination gets no annotation. It reads the destination from the client's cache, which may not have this reconcile's
// write yet; the write's own watch event reconciles again and sees it.
func (r *SecretSyncReconciler) rolloutCollector(
	ctx context.Context,
	span trace.Span,
	mapping SecretSyncMapping,
) error {
	desired := rolloutAbsent
	dest := &corev1.Secret{}
	err := r.k8sClient.Get(ctx, client.ObjectKey{Name: mapping.DestName, Namespace: mapping.DestNamespace}, dest)
	switch {
	case apierrors.IsNotFound(err):
	case err != nil:
		commontelemetry.SetError(span, "get_destination_secret", err)
		return fmt.Errorf("get destination secret for rollout: %w", err)
	default:
		desired = hashData(dest.Data)
	}

	collector := &unstructured.Unstructured{}
	collector.SetGroupVersionKind(collectorGVK)
	collectorKey := client.ObjectKey{Name: mapping.RolloutCollector, Namespace: mapping.DestNamespace}
	err = r.k8sClient.Get(ctx, collectorKey, collector)
	// Without the collector, or the OpenTelemetry Operator, there are no pods to roll. A collector created later
	// starts with the destination as it is then.
	if apierrors.IsNotFound(err) || meta.IsNoMatchError(err) {
		return nil
	}
	if err != nil {
		commontelemetry.SetError(span, "get_collector", err)
		return fmt.Errorf("get OpenTelemetryCollector %s: %w", collectorKey, err)
	}

	key := rolloutAnnotation(mapping)
	annotations, _, err := unstructured.NestedStringMap(collector.Object, "spec", "podAnnotations")
	if err != nil {
		commontelemetry.SetError(span, "read_collector_pod_annotations", err)
		return fmt.Errorf("read pod annotations of OpenTelemetryCollector %s: %w", collectorKey, err)
	}
	current, found := annotations[key]
	if (!found && desired == rolloutAbsent) || (found && current == desired) {
		return nil
	}

	// A merge patch touches only this annotation.
	patch, err := json.Marshal(map[string]any{
		"spec": map[string]any{"podAnnotations": map[string]any{key: desired}},
	})
	if err != nil {
		return fmt.Errorf("marshal rollout patch: %w", err)
	}
	err = r.k8sClient.Patch(
		ctx,
		collector,
		client.RawPatch(types.MergePatchType, patch),
		client.FieldOwner(rolloutFieldOwner),
	)
	if err != nil {
		commontelemetry.SetError(span, "patch_collector", err)
		return fmt.Errorf("patch OpenTelemetryCollector %s: %w", collectorKey, err)
	}
	r.logger.Info("rolling collector for its secret",
		"collector", collectorKey.String(),
		"secret", mapping.DestName,
	)
	return nil
}

// hashData hashes a secret's data in key order.
func hashData(data map[string][]byte) string {
	keys := make([]string, 0, len(data))
	for k := range data {
		keys = append(keys, k)
	}
	slices.Sort(keys)
	h := sha256.New()
	for _, k := range keys {
		h.Write([]byte(k))
		h.Write([]byte{0})
		h.Write(data[k])
		h.Write([]byte{0})
	}
	return hex.EncodeToString(h.Sum(nil))
}
