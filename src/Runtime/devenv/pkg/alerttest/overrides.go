package alerttest

import (
	"context"
	"encoding/json"
	"fmt"
	"slices"
	"strconv"
	"strings"
	"time"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"

	"altinn.studio/devenv/pkg/kubernetes"
)

// override sets one field of a stack object while a fault lasts. The Flux Kustomization that
// owns the object is suspended meanwhile, so it does not undo the change.
type override struct {
	gvr schema.GroupVersionResource
	// value is the field's value, or a func(original any) any computing it from the original.
	value         any
	name          string
	kustomization string
	// pointer is the field, as a JSON pointer such as /spec/replicaCount.
	pointer string
}

// savedField is a field's value before an override; Present is false when it was unset.
type savedField struct {
	Value   any  `json:"value,omitempty"`
	Present bool `json:"present"`
}

// apply saves the field's original value in an annotation on the object, unless an earlier,
// interrupted run already did, and sets the new value, computed from the original so a repeated
// run does not stack changes.
func (o override) apply(ctx context.Context, kube *kubernetes.KubernetesClient) error {
	object, saved, err := o.read(ctx, kube)
	if err != nil {
		return err
	}
	original, alreadySaved := saved[o.pointer]
	if !alreadySaved {
		current, present, err := lookupPointer(object, o.pointer)
		if err != nil {
			return err
		}
		original = savedField{Value: current, Present: present}
		saved[o.pointer] = original
		if err := o.patch(ctx, kube, types.MergePatchType, map[string]any{"metadata": map[string]any{
			"annotations": map[string]any{overrideAnnotation: mustJSON(saved)},
		}}); err != nil {
			return err
		}
	}
	value := o.value
	if compute, ok := value.(func(any) any); ok {
		value = compute(original.Value)
	}
	return o.patch(ctx, kube, types.JSONPatchType, []map[string]any{{"op": "add", "path": o.pointer, "value": value}})
}

// restore puts back the field apply saved, if it did.
func (o override) restore(ctx context.Context, kube *kubernetes.KubernetesClient) error {
	object, saved, err := o.read(ctx, kube)
	if err != nil {
		return err
	}
	original, ok := saved[o.pointer]
	if !ok {
		return nil
	}
	_, present, err := lookupPointer(object, o.pointer)
	if err != nil {
		return err
	}
	var ops []map[string]any
	switch {
	case original.Present:
		ops = append(ops, map[string]any{"op": "add", "path": o.pointer, "value": original.Value})
	case present:
		ops = append(ops, map[string]any{"op": "remove", "path": o.pointer})
	}
	delete(saved, o.pointer)
	annotation := "/metadata/annotations/" + strings.ReplaceAll(overrideAnnotation, "/", "~1")
	if len(saved) == 0 {
		ops = append(ops, map[string]any{"op": "remove", "path": annotation})
	} else {
		ops = append(ops, map[string]any{"op": "replace", "path": annotation, "value": mustJSON(saved)})
	}
	return o.patch(ctx, kube, types.JSONPatchType, ops)
}

func (o override) read(
	ctx context.Context,
	kube *kubernetes.KubernetesClient,
) (map[string]any, map[string]savedField, error) {
	object, err := getObject(ctx, kube, o.gvr, observabilityNamespace, o.name)
	if err != nil {
		return nil, nil, err
	}
	saved := map[string]savedField{}
	if encoded, ok := object.GetAnnotations()[overrideAnnotation]; ok {
		if err := json.Unmarshal([]byte(encoded), &saved); err != nil {
			return nil, nil, fmt.Errorf("decode %s on %s: %w", overrideAnnotation, o.name, err)
		}
	}
	return object.Object, saved, nil
}

func (o override) patch(
	ctx context.Context,
	kube *kubernetes.KubernetesClient,
	patchType types.PatchType,
	patch any,
) error {
	data, err := json.Marshal(patch)
	if err != nil {
		return fmt.Errorf("encode patch for %s: %w", o.name, err)
	}
	return patchObject(ctx, kube, o.gvr, observabilityNamespace, o.name, patchType, data)
}

// lookupPointer resolves a JSON pointer whose last segment may be absent.
func lookupPointer(object map[string]any, pointer string) (any, bool, error) {
	segments := strings.Split(strings.TrimPrefix(pointer, "/"), "/")
	var current any = object
	for i, segment := range segments {
		switch node := current.(type) {
		case map[string]any:
			value, ok := node[segment]
			if !ok && i == len(segments)-1 {
				return nil, false, nil
			}
			if !ok {
				return nil, false, fmt.Errorf("%w: %s at %q", errBadPointer, pointer, segment)
			}
			current = value
		case []any:
			index, err := strconv.Atoi(segment)
			if err != nil || index < 0 || index >= len(node) {
				return nil, false, fmt.Errorf("%w: %s at %q", errBadPointer, pointer, segment)
			}
			current = node[index]
		default:
			return nil, false, fmt.Errorf("%w: %s at %q", errBadPointer, pointer, segment)
		}
	}
	return current, true, nil
}

// withEnv sets one environment variable in a container's env list.
func withEnv(name, value string) func(any) any {
	return func(current any) any {
		existing, _ := current.([]any) //nolint:errcheck // An absent list is empty.
		env := slices.DeleteFunc(slices.Clone(existing), func(item any) bool {
			entry, ok := item.(map[string]any)
			return ok && entry["name"] == name
		})
		return append(env, map[string]any{"name": name, "value": value})
	}
}

// suspendKustomization suspends a Flux Kustomization, marking it so resumeKustomization only
// resumes what a test suspended, and waits for a reconciliation already under way to finish:
// one that started before the suspension, such as the one an earlier scenario's cleanup
// requested, still applies and would undo an override made meanwhile.
func suspendKustomization(ctx context.Context, kube *kubernetes.KubernetesClient, name string) error {
	kustomization, err := getObject(ctx, kube, kustomizationGVR, fluxNamespace, name)
	if err != nil {
		return err
	}
	if suspended, ok := nested(kustomization.Object, "spec", "suspend").(bool); !ok || !suspended {
		if err := patchMerge(ctx, kube, kustomizationGVR, fluxNamespace, name, map[string]any{
			"metadata": map[string]any{"annotations": map[string]any{suspendedByTest: "true"}},
			"spec":     map[string]any{"suspend": true},
		}); err != nil {
			return err
		}
	}
	return poll(ctx, rolloutWait, func() (bool, error) {
		object, err := getObject(ctx, kube, kustomizationGVR, fluxNamespace, name)
		if err != nil {
			return false, err
		}
		requested := object.GetAnnotations()["reconcile.fluxcd.io/requestedAt"]
		handled, ok := nested(object.Object, "status", "lastHandledReconcileAt").(string)
		return (requested == "" || ok && requested == handled) && !fluxReconciling(object.Object), nil
	})
}

// fluxReconciling reports whether a Flux object's conditions say it is reconciling.
func fluxReconciling(object map[string]any) bool {
	conditions, _ := nested(object, "status", "conditions").([]any) //nolint:errcheck // Absent is none.
	for _, item := range conditions {
		condition, ok := item.(map[string]any)
		if ok && ((condition["type"] == "Reconciling" && condition["status"] == "True") ||
			(condition["type"] == "Ready" && condition["status"] == "Unknown")) {
			return true
		}
	}
	return false
}

// resumeKustomization resumes the Kustomization if a test suspended it, and asks Flux to
// reconcile it now; it reports whether it did.
func resumeKustomization(ctx context.Context, kube *kubernetes.KubernetesClient, name string) (bool, error) {
	kustomization, err := getObject(ctx, kube, kustomizationGVR, fluxNamespace, name)
	if err != nil {
		return false, err
	}
	if _, ok := kustomization.GetAnnotations()[suspendedByTest]; !ok {
		return false, nil
	}
	err = patchMerge(ctx, kube, kustomizationGVR, fluxNamespace, name, map[string]any{
		"metadata": map[string]any{"annotations": map[string]any{
			suspendedByTest:                   nil,
			"reconcile.fluxcd.io/requestedAt": time.Now().UTC().Format(time.RFC3339Nano),
		}},
		"spec": map[string]any{"suspend": false},
	})
	return err == nil, err
}

func patchMerge(
	ctx context.Context,
	kube *kubernetes.KubernetesClient,
	gvr schema.GroupVersionResource,
	namespace, name string,
	patch map[string]any,
) error {
	return patchObject(ctx, kube, gvr, namespace, name, types.MergePatchType, []byte(mustJSON(patch)))
}

func getObject(
	ctx context.Context,
	kube *kubernetes.KubernetesClient,
	gvr schema.GroupVersionResource,
	namespace, name string,
) (*unstructured.Unstructured, error) {
	object, err := kube.GetResource(ctx, gvr, namespace, name)
	if err != nil {
		return nil, fmt.Errorf("read the stack: %w", err)
	}
	return object, nil
}

func patchObject(
	ctx context.Context,
	kube *kubernetes.KubernetesClient,
	gvr schema.GroupVersionResource,
	namespace, name string,
	patchType types.PatchType,
	data []byte,
) error {
	if err := kube.PatchResource(ctx, gvr, namespace, name, patchType, data); err != nil {
		return fmt.Errorf("change the stack: %w", err)
	}
	return nil
}

func mustJSON(value any) string {
	data, err := json.Marshal(value)
	if err != nil {
		panic(err)
	}
	return string(data)
}
