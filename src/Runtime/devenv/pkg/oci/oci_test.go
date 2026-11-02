package oci_test

import (
	"archive/tar"
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"

	"altinn.studio/devenv/pkg/oci"
	"altinn.studio/devenv/pkg/oci/ocitest"
)

// fluxTarSHA256 is the SHA-256 of the uncompressed tar that github.com/fluxcd/pkg/oci v0.62.0 builds from
// writeArtifact's directory.
const fluxTarSHA256 = "e950533922362123a6c3c251db908e446d54b7c8b3d06cf5cf16e16969cd3107"

func TestPushArtifactMatchesFlux(t *testing.T) {
	t.Parallel()
	for _, absolute := range []bool{false, true} {
		registry := ocitest.NewRegistry(t, absolute)
		dir := writeArtifact(t)

		err := oci.NewClient().PushArtifact("oci://"+registry.Host()+"/team/app:local", dir, "src", "main@sha1:abc")
		if err != nil {
			t.Fatalf("PushArtifact() error = %v", err)
		}

		manifest := registry.Manifest(t, "team/app:local")
		if manifest.SchemaVersion != 2 || manifest.MediaType != "application/vnd.oci.image.manifest.v1+json" {
			t.Errorf("manifest schema %d, media type %q", manifest.SchemaVersion, manifest.MediaType)
		}
		if manifest.Config.MediaType != "application/vnd.cncf.flux.config.v1+json" {
			t.Errorf("config media type = %q", manifest.Config.MediaType)
		}
		if config := registry.Blob(t, manifest.Config); string(config) != "{}" {
			t.Errorf("config = %s", config)
		}
		const createdKey = "org.opencontainers.image.created"
		created, err := time.Parse(time.RFC3339, manifest.Annotations[createdKey])
		if err != nil || time.Since(created) > time.Minute {
			t.Errorf("created annotation = %q", manifest.Annotations[createdKey])
		}
		delete(manifest.Annotations, createdKey)
		wantAnnotations := map[string]string{
			"org.opencontainers.image.source":   "src",
			"org.opencontainers.image.revision": "main@sha1:abc",
		}
		if !reflect.DeepEqual(manifest.Annotations, wantAnnotations) {
			t.Errorf("annotations = %v, want %v", manifest.Annotations, wantAnnotations)
		}
		if len(manifest.Layers) != 1 ||
			manifest.Layers[0].MediaType != "application/vnd.cncf.flux.content.v1.tar+gzip" {
			t.Fatalf("layers = %+v", manifest.Layers)
		}

		entries, tarSHA256 := ocitest.ReadTarball(t, registry.Blob(t, manifest.Layers[0]))
		want := []ocitest.Entry{
			{Name: ".", Type: tar.TypeDir, Mode: 0o755},
			{Name: "deploy.yaml", Type: tar.TypeReg, Mode: 0o644, Content: "kind: ConfigMap\n"},
			{Name: "kustomization.yaml", Type: tar.TypeReg, Mode: 0o644, Content: "resources:\n- deploy.yaml\n"},
			{Name: "sub", Type: tar.TypeDir, Mode: 0o755},
			{Name: "sub/run.sh", Type: tar.TypeReg, Mode: 0o755, Content: "#!/bin/sh\n"},
		}
		if !reflect.DeepEqual(entries, want) {
			t.Errorf("layer entries = %+v, want %+v", entries, want)
		}
		if tarSHA256 != fluxTarSHA256 {
			t.Errorf("layer tar SHA-256 = %s, want Flux's %s", tarSHA256, fluxTarSHA256)
		}
	}
}

func TestPushDefaultsToLatest(t *testing.T) {
	t.Parallel()
	registry := ocitest.NewRegistry(t, false)
	if err := oci.NewClient().PushArtifact("oci://"+registry.Host()+"/app", writeArtifact(t), "s", "r"); err != nil {
		t.Fatalf("PushArtifact() error = %v", err)
	}
	registry.Manifest(t, "app:latest")
}

func TestPushReportsRegistryFailures(t *testing.T) {
	t.Parallel()
	for _, step := range []string{"POST", "blob PUT", "manifest PUT"} {
		t.Run(step, func(t *testing.T) {
			t.Parallel()
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
				current := req.Method
				if current == http.MethodPut {
					current = "blob PUT"
					if strings.Contains(req.URL.Path, "/manifests/") {
						current = "manifest PUT"
					}
				}
				switch {
				case current == step:
					http.Error(w, `{"errors":[{"code":"DENIED"}]}`, http.StatusForbidden)
				case req.Method == http.MethodPost:
					w.Header().Set("Location", "session")
					w.WriteHeader(http.StatusAccepted)
				default:
					w.WriteHeader(http.StatusCreated)
				}
			}))
			t.Cleanup(server.Close)
			ref := "oci://" + strings.TrimPrefix(server.URL, "http://") + "/app:v1"
			err := oci.NewClient().Push(t.Context(), ref, oci.Blob{}, oci.Blob{}, nil)
			if err == nil || !strings.Contains(err.Error(), "403 Forbidden") ||
				!strings.Contains(err.Error(), "DENIED") {
				t.Fatalf("Push() error = %v, want the registry's status and body", err)
			}
		})
	}
}

func TestPushRejectsInvalidReference(t *testing.T) {
	t.Parallel()
	for _, ref := range []string{"localhost:5001/app", "oci://localhost:5001", "oci://localhost:5001/"} {
		if err := oci.NewClient().Push(t.Context(), ref, oci.Blob{}, oci.Blob{}, nil); err == nil {
			t.Errorf("Push(%q) error = nil", ref)
		}
	}
}

func TestPushCancelsInFlightRequest(t *testing.T) {
	t.Parallel()
	started := make(chan struct{})
	server := httptest.NewServer(http.HandlerFunc(func(_ http.ResponseWriter, req *http.Request) {
		close(started)
		<-req.Context().Done()
	}))
	t.Cleanup(server.Close)
	ctx, cancel := context.WithCancel(t.Context())
	defer cancel()
	result := make(chan error, 1)
	go func() {
		ref := "oci://" + strings.TrimPrefix(server.URL, "http://") + "/app:v1"
		result <- oci.NewClient().Push(ctx, ref, oci.Blob{}, oci.Blob{}, nil)
	}()
	<-started
	cancel()
	if err := <-result; !errors.Is(err, context.Canceled) {
		t.Fatalf("Push() error = %v, want cancellation", err)
	}
}

// writeArtifact writes a directory with fixed permissions, plus a symlink that Flux leaves out.
func writeArtifact(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	files := map[string]string{
		"kustomization.yaml": "resources:\n- deploy.yaml\n",
		"deploy.yaml":        "kind: ConfigMap\n",
		"sub/run.sh":         "#!/bin/sh\n",
	}
	for name, content := range files {
		file := filepath.Join(dir, name)
		if err := os.MkdirAll(filepath.Dir(file), 0o750); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(file, []byte(content), 0o600); err != nil {
			t.Fatal(err)
		}
	}
	modes := map[string]os.FileMode{
		".": 0o755, "sub": 0o755, "sub/run.sh": 0o755, "deploy.yaml": 0o644, "kustomization.yaml": 0o644,
	}
	for name, mode := range modes {
		if err := os.Chmod(filepath.Join(dir, name), mode); err != nil {
			t.Fatal(err)
		}
	}
	if err := os.Symlink("deploy.yaml", filepath.Join(dir, "link.yaml")); err != nil {
		t.Fatal(err)
	}
	return dir
}
