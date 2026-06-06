package harness

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/cabundle"
)

func TestDeploymentCABundlePatch(t *testing.T) {
	patch, err := deploymentCABundlePatch(&cabundle.Bundle{Digest: "abc123"}, Rollout{
		Deployment: "operator-controller-manager",
		Namespace:  "runtime-operator",
		Container:  "manager",
	})
	if err != nil {
		t.Fatalf("deploymentCABundlePatch() error = %v", err)
	}

	var decoded map[string]any
	if err := json.Unmarshal(patch, &decoded); err != nil {
		t.Fatalf("unmarshal patch: %v", err)
	}

	template := getMap(t, getMap(t, decoded, "spec"), "template")
	annotations := getMap(t, getMap(t, template, "metadata"), "annotations")
	if annotations[caBundleDigestAnnotation] != "abc123" {
		t.Fatalf("digest annotation = %v, want abc123", annotations[caBundleDigestAnnotation])
	}

	spec := getMap(t, template, "spec")
	containers := getSlice(t, spec, "containers")
	container := asMap(t, containers[0])
	if container["name"] != "manager" {
		t.Fatalf("container name = %v, want manager", container["name"])
	}
	if !hasCAEnv(getSlice(t, container, "env"), cabundle.EnvStudioCABundle) {
		t.Fatalf("missing %s env", cabundle.EnvStudioCABundle)
	}
	if !hasCAMount(getSlice(t, container, "volumeMounts")) {
		t.Fatalf("missing CA bundle volume mount")
	}
	volumes := getSlice(t, spec, "volumes")
	volume := asMap(t, volumes[0])
	if volume["name"] != cabundle.KubernetesVolumeName {
		t.Fatalf("volume name = %v, want %s", volume["name"], cabundle.KubernetesVolumeName)
	}
}

func TestPatchCABundleArtifactFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "deployment.yaml")
	input := `apiVersion: apps/v1
kind: Deployment
metadata:
  name: gateway
spec:
  template:
    metadata:
      annotations:
        existing: value
    spec:
      containers:
        - name: gateway
          env:
            - name: EXISTING
              value: keep
---
apiVersion: v1
kind: Service
metadata:
  name: gateway
`
	if err := os.WriteFile(path, []byte(input), 0o600); err != nil {
		t.Fatalf("write test manifest: %v", err)
	}

	patched, err := patchCABundleArtifactFile(path, &cabundle.Bundle{Digest: "digest123"}, []Rollout{
		{Deployment: "gateway", Container: "gateway", MountCABundle: true},
	})
	if err != nil {
		t.Fatalf("patchCABundleArtifactFile() error = %v", err)
	}
	if !patched {
		t.Fatalf("patchCABundleArtifactFile() patched = false, want true")
	}

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read patched manifest: %v", err)
	}
	output := string(data)
	for _, want := range []string{
		"name: EXISTING",
		"name: " + cabundle.EnvStudioCABundle,
		"value: " + cabundle.ContainerPath,
		"name: " + cabundle.KubernetesVolumeName,
		"mountPath: " + cabundle.ContainerPath,
		caBundleDigestAnnotation + ": digest123",
	} {
		if !strings.Contains(output, want) {
			t.Fatalf("patched manifest missing %q:\n%s", want, output)
		}
	}
}

func TestPatchCABundleArtifactFilesSkipsKustomizationConfig(t *testing.T) {
	root := t.TempDir()
	kustomizationPath := filepath.Join(root, "kustomization.yaml")
	if err := os.WriteFile(kustomizationPath, []byte("resources:\n  - deployment.yaml\n"), 0o600); err != nil {
		t.Fatalf("write kustomization: %v", err)
	}

	patched, err := patchCABundleArtifactFiles(root, &cabundle.Bundle{Digest: "digest123"}, []Rollout{
		{Deployment: "gateway", Container: "gateway", MountCABundle: true},
	})
	if err != nil {
		t.Fatalf("patchCABundleArtifactFiles() error = %v", err)
	}
	if patched {
		t.Fatalf("patchCABundleArtifactFiles() patched = true, want false")
	}
}

func getMap(t *testing.T, values map[string]any, key string) map[string]any {
	t.Helper()
	return asMap(t, values[key])
}

func getSlice(t *testing.T, values map[string]any, key string) []any {
	t.Helper()
	value, ok := values[key].([]any)
	if !ok {
		t.Fatalf("%s = %T, want []any", key, values[key])
	}
	return value
}

func asMap(t *testing.T, value any) map[string]any {
	t.Helper()
	result, ok := value.(map[string]any)
	if !ok {
		t.Fatalf("value = %T, want map[string]any", value)
	}
	return result
}

func hasCAEnv(env []any, name string) bool {
	for _, item := range env {
		entry, ok := item.(map[string]any)
		if !ok {
			continue
		}
		if entry["name"] == name && entry["value"] == cabundle.ContainerPath {
			return true
		}
	}
	return false
}

func hasCAMount(mounts []any) bool {
	for _, item := range mounts {
		mount, ok := item.(map[string]any)
		if !ok {
			continue
		}
		if mount["name"] == cabundle.KubernetesVolumeName && mount["mountPath"] == cabundle.ContainerPath {
			return true
		}
	}
	return false
}
