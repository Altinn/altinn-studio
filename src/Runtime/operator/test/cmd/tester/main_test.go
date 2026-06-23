package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/cabundle"
	"altinn.studio/devenv/pkg/projectroot"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/devenv/pkg/runtimes/kind"
)

func TestOperatorCABundleWorkloadsPatchPreKustomizeDeploymentName(t *testing.T) {
	projectRoot, err := projectroot.Find(projectroot.Marker)
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

func TestOperatorImageResourcesUsesDockerfilesRelativeToContexts(t *testing.T) {
	projectRoot := t.TempDir()

	resources, _ := operatorImageResources(projectRoot, &kind.KindContainerRuntime{})
	images := map[string]*resource.BuiltImage{}
	for _, res := range resources {
		image, ok := res.(*resource.BuiltImage)
		if ok {
			images[image.Tag] = image
		}
	}

	tests := []struct {
		tag         string
		contextPath string
		dockerfile  string
	}{
		{
			tag:         "operator-controller:latest",
			contextPath: projectRoot,
			dockerfile:  "Dockerfile",
		},
		{
			tag:         "operator-fakes:latest",
			contextPath: projectRoot,
			dockerfile:  "Dockerfile.fakes",
		},
		{
			tag:         "operator-localtestapp:latest",
			contextPath: filepath.Join(projectRoot, "test/app"),
			dockerfile:  "Dockerfile",
		},
	}

	for _, tt := range tests {
		t.Run(tt.tag, func(t *testing.T) {
			image := images[tt.tag]
			if image == nil {
				t.Fatalf("missing image resource %q", tt.tag)
			}
			if image.ContextPath != tt.contextPath {
				t.Fatalf("ContextPath = %q, want %q", image.ContextPath, tt.contextPath)
			}
			if image.Dockerfile != tt.dockerfile {
				t.Fatalf("Dockerfile = %q, want %q", image.Dockerfile, tt.dockerfile)
			}
		})
	}
}
