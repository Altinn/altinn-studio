package cabundle

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

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

	patched, err := patchCABundleArtifactFile(path, &Bundle{Digest: "digest123"}, []KubernetesWorkload{
		{Deployment: "gateway", Container: "gateway"},
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
		"name: " + EnvStudioCABundle,
		"value: " + ContainerPath,
		"name: " + KubernetesVolumeName,
		"mountPath: " + ContainerPath,
		caBundleDigestAnnotation + ": digest123",
	} {
		if !strings.Contains(output, want) {
			t.Fatalf("patched manifest missing %q:\n%s", want, output)
		}
	}
}

func TestPatchCABundleArtifactFileRequiresMatchingDeployment(t *testing.T) {
	path := filepath.Join(t.TempDir(), "deployment.yaml")
	input := `apiVersion: apps/v1
kind: Deployment
metadata:
  name: other
spec:
  template:
    spec:
      containers:
        - name: gateway
`
	if err := os.WriteFile(path, []byte(input), 0o600); err != nil {
		t.Fatalf("write test manifest: %v", err)
	}

	patched, err := patchCABundleArtifactFile(path, &Bundle{Digest: "digest123"}, []KubernetesWorkload{
		{Deployment: "gateway", Container: "gateway"},
	})
	if err != nil {
		t.Fatalf("patchCABundleArtifactFile() error = %v", err)
	}
	if patched {
		t.Fatalf("patchCABundleArtifactFile() patched = true, want false")
	}
}

func TestPatchCABundleArtifactFilesSkipsKustomizationConfig(t *testing.T) {
	root := t.TempDir()
	kustomizationPath := filepath.Join(root, "kustomization.yaml")
	if err := os.WriteFile(kustomizationPath, []byte("resources:\n  - deployment.yaml\n"), 0o600); err != nil {
		t.Fatalf("write kustomization: %v", err)
	}

	patched, err := patchCABundleArtifactFiles(root, &Bundle{Digest: "digest123"}, []KubernetesWorkload{
		{Deployment: "gateway", Container: "gateway"},
	})
	if err != nil {
		t.Fatalf("patchCABundleArtifactFiles() error = %v", err)
	}
	if patched {
		t.Fatalf("patchCABundleArtifactFiles() patched = true, want false")
	}
}
