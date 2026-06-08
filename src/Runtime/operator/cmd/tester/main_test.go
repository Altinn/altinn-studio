package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/cabundle"
	"altinn.studio/operator/internal/config"
)

func TestOperatorCABundleWorkloadsPatchPreKustomizeDeploymentName(t *testing.T) {
	projectRoot, err := config.TryFindProjectRootByGoMod()
	if err != nil {
		t.Fatalf("find project root: %v", err)
	}

	prepared, err := cabundle.PrepareKubernetesArtifact(
		filepath.Join(projectRoot, "config"),
		&cabundle.Bundle{
			Data:   []byte("test-ca"),
			Digest: "test-digest",
		},
		operatorCABundleWorkloads(),
	)
	if err != nil {
		t.Fatalf("PrepareKubernetesArtifact() error = %v", err)
	}
	defer func() {
		if cleanupErr := prepared.Cleanup(); cleanupErr != nil {
			t.Fatalf("cleanup prepared artifact: %v", cleanupErr)
		}
	}()

	data, err := os.ReadFile(filepath.Join(prepared.Path, "manager", "manager.yaml"))
	if err != nil {
		t.Fatalf("read patched manager manifest: %v", err)
	}
	manifest := string(data)
	for _, want := range []string{
		"name: STUDIO_CA_BUNDLE",
		"value: /tmp/studio-ca-bundle.pem",
		"name: devenv-ca-bundle",
		"altinn.studio/devenv-ca-bundle-digest: test-digest",
	} {
		if !strings.Contains(manifest, want) {
			t.Fatalf("patched manager manifest missing %q:\n%s", want, manifest)
		}
	}
}
