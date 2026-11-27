package secretsync

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"slices"

	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

// +kubebuilder:rbac:groups=opentelemetry.io,resources=opentelemetrycollectors,verbs=get;patch

var collectorGVK = schema.GroupVersionKind{
	Group:   "opentelemetry.io",
	Version: "v1beta1",
	Kind:    "OpenTelemetryCollector",
}

// The runtime collectors' gateway, which reads apps' connection string into an environment variable when it starts.
var gatewayKey = client.ObjectKey{Namespace: "runtime-obs", Name: "otel-gateway"}

// gatewayRolloutAnnotation holds a hash of the copied connection string in the gateway's pod annotations, so the
// OpenTelemetry Operator rolls the pods when it changes.
const gatewayRolloutAnnotation = "secretsync.altinn.studio/apps-azure-monitor-secret"

// gatewayRolloutAbsent stands in for the hash once the copy is gone. Removing the annotation wouldn't roll the pods:
// the OpenTelemetry Operator keeps a pod annotation in its Deployment after it leaves the collector.
const gatewayRolloutAbsent = "absent"

// The operator's own field manager. Flux applies the collector with server-side apply and leaves fields other
// managers set alone, so the annotation survives Flux's reconciles.
const gatewayRolloutFieldOwner = "altinn-studio-operator"

// rollGateway sets the gateway's rollout annotation to the hash of the copy, or to gatewayRolloutAbsent once the copy
// is gone (dest is nil). A gateway that never had the copy gets no annotation, and nothing happens without the
// gateway or the OpenTelemetry Operator.
func rollGateway(ctx context.Context, k8sClient client.Client, dest *corev1.Secret) error {
	desired := gatewayRolloutAbsent
	if dest != nil {
		desired = hashData(dest.Data)
	}

	collector := &unstructured.Unstructured{}
	collector.SetGroupVersionKind(collectorGVK)
	err := k8sClient.Get(ctx, gatewayKey, collector)
	if apierrors.IsNotFound(err) || meta.IsNoMatchError(err) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("get OpenTelemetryCollector %s: %w", gatewayKey, err)
	}

	annotations, _, err := unstructured.NestedStringMap(collector.Object, "spec", "podAnnotations")
	if err != nil {
		return fmt.Errorf("read pod annotations of OpenTelemetryCollector %s: %w", gatewayKey, err)
	}
	current, found := annotations[gatewayRolloutAnnotation]
	if (!found && desired == gatewayRolloutAbsent) || (found && current == desired) {
		return nil
	}

	// A merge patch touches only this annotation.
	patch, err := json.Marshal(map[string]any{
		"spec": map[string]any{"podAnnotations": map[string]any{gatewayRolloutAnnotation: desired}},
	})
	if err != nil {
		return fmt.Errorf("marshal rollout patch: %w", err)
	}
	err = k8sClient.Patch(
		ctx,
		collector,
		client.RawPatch(types.MergePatchType, patch),
		client.FieldOwner(gatewayRolloutFieldOwner),
	)
	if err != nil {
		return fmt.Errorf("patch OpenTelemetryCollector %s: %w", gatewayKey, err)
	}
	log.FromContext(ctx).Info("rolling the gateway for apps' connection string", "collector", gatewayKey.String())
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
