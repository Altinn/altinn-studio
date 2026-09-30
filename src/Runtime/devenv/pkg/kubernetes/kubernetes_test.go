package kubernetes

import (
	"errors"
	"strings"
	"testing"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
)

func TestObjectsManifestRendersTypedAndUnstructuredObjects(t *testing.T) {
	t.Parallel()

	manifest, err := ObjectsManifest([]runtime.Object{
		&corev1.Namespace{
			TypeMeta: metav1.TypeMeta{APIVersion: "v1", Kind: "Namespace"},
			ObjectMeta: metav1.ObjectMeta{
				Name: "runtime-test",
			},
		},
		&unstructured.Unstructured{Object: map[string]any{
			"apiVersion": "v1",
			"kind":       "ConfigMap",
			"metadata": map[string]any{
				"name":      "settings",
				"namespace": "runtime-test",
			},
		}},
	})
	if err != nil {
		t.Fatalf("ObjectsManifest() error = %v", err)
	}

	for _, want := range []string{
		"kind: Namespace",
		"name: runtime-test",
		"---\n",
		"kind: ConfigMap",
		"namespace: runtime-test",
	} {
		if !strings.Contains(manifest, want) {
			t.Fatalf("ObjectsManifest() missing %q:\n%s", want, manifest)
		}
	}
}

func TestObjectToUnstructuredRejectsNil(t *testing.T) {
	t.Parallel()

	if _, err := ObjectToUnstructured(nil); err == nil || !errors.Is(err, errObjectRequired) {
		t.Fatalf("ObjectToUnstructured(nil) error = %v, want %v", err, errObjectRequired)
	}
}
