package oci_test

import (
	"archive/tar"
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

	registry := ocitest.NewRegistry(t)
	dir := writeArtifact(t)

	err := oci.NewClient().PushArtifact("oci://"+registry.Host()+"/team/app:local", dir, "src", "main@sha1:abc")
	if err != nil {
		t.Fatalf("PushArtifact() error = %v", err)
	}

	manifest := registry.Manifest(t, "team/app", "local")
	if manifest.SchemaVersion != 2 || manifest.MediaType != oci.ManifestMediaType {
		t.Errorf("manifest schema %d, media type %q", manifest.SchemaVersion, manifest.MediaType)
	}
	if manifest.Config.MediaType != oci.FluxConfigMediaType {
		t.Errorf("config media type = %q", manifest.Config.MediaType)
	}
	if config := registry.Blob(t, manifest.Config); string(config) != "{}" {
		t.Errorf("config = %s", config)
	}
	created, err := time.Parse(time.RFC3339, manifest.Annotations[oci.AnnotationCreated])
	if err != nil || time.Since(created) > time.Minute {
		t.Errorf("created annotation = %q", manifest.Annotations[oci.AnnotationCreated])
	}
	delete(manifest.Annotations, oci.AnnotationCreated)
	wantAnnotations := map[string]string{oci.AnnotationSource: "src", oci.AnnotationRevision: "main@sha1:abc"}
	if !reflect.DeepEqual(manifest.Annotations, wantAnnotations) {
		t.Errorf("annotations = %v, want %v", manifest.Annotations, wantAnnotations)
	}
	if len(manifest.Layers) != 1 || manifest.Layers[0].MediaType != oci.FluxContentMediaType {
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

func TestPushArtifactOfFile(t *testing.T) {
	t.Parallel()

	registry := ocitest.NewRegistry(t)
	file := filepath.Join(writeArtifact(t), "deploy.yaml")

	if err := oci.NewClient().PushArtifact("oci://"+registry.Host()+"/app", file, "src", "rev"); err != nil {
		t.Fatalf("PushArtifact() error = %v", err)
	}

	manifest := registry.Manifest(t, "app", "latest")
	entries, _ := ocitest.ReadTarball(t, registry.Blob(t, manifest.Layers[0]))
	want := []ocitest.Entry{{Name: "deploy.yaml", Type: tar.TypeReg, Mode: 0o644, Content: "kind: ConfigMap\n"}}
	if !reflect.DeepEqual(entries, want) {
		t.Errorf("layer entries = %+v, want %+v", entries, want)
	}
}

func TestPushFollowsAbsoluteLocationAndSkipsExistingBlobs(t *testing.T) {
	t.Parallel()

	registry := ocitest.NewRegistry(t)
	registry.UseAbsoluteLocation()
	client := oci.NewClient()
	ref := oci.Reference{Host: registry.Host(), Repository: "app", Tag: "v1"}
	config := oci.Blob{MediaType: "application/vnd.test.config+json", Data: []byte("{}")}
	layers := []oci.Blob{{MediaType: "application/vnd.test.layer", Data: []byte("layer")}}

	first, err := client.Push(t.Context(), ref, config, layers, nil)
	if err != nil {
		t.Fatalf("first Push() error = %v", err)
	}
	ref.Tag = "v2"
	second, err := client.Push(t.Context(), ref, config, layers, nil)
	if err != nil {
		t.Fatalf("second Push() error = %v", err)
	}

	if registry.Uploads() != 2 {
		t.Errorf("uploads = %d, want 2 because the second push reuses both blobs", registry.Uploads())
	}
	if first.Digest != second.Digest || first.MediaType != oci.ManifestMediaType {
		t.Errorf("manifest descriptors = %+v and %+v", first, second)
	}
}

func TestPushReportsRegistryError(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		if req.Method == http.MethodHead {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		http.Error(w, `{"errors":[{"code":"DENIED"}]}`, http.StatusForbidden)
	}))
	t.Cleanup(server.Close)
	ref := oci.Reference{Host: strings.TrimPrefix(server.URL, "http://"), Repository: "app", Tag: "v1"}
	config := oci.Blob{MediaType: "application/vnd.test.config+json", Data: []byte("{}")}

	_, err := oci.NewClient().Push(t.Context(), ref, config, nil, nil)

	if err == nil || !strings.Contains(err.Error(), "403 Forbidden") || !strings.Contains(err.Error(), "DENIED") {
		t.Fatalf("Push() error = %v, want the registry's status and body", err)
	}
}

func TestParseReference(t *testing.T) {
	t.Parallel()

	tests := []struct {
		raw     string
		want    oci.Reference
		wantErr bool
	}{
		{
			raw:  "oci://localhost:5001/app:local",
			want: oci.Reference{Host: "localhost:5001", Repository: "app", Tag: "local"},
		},
		{
			raw:  "oci://localhost:5001/a/b",
			want: oci.Reference{Host: "localhost:5001", Repository: "a/b", Tag: "latest"},
		},
		{raw: "localhost:5001/app:local", wantErr: true},
		{raw: "oci://localhost:5001", wantErr: true},
		{raw: "oci://localhost:5001/app@sha256:abc", wantErr: true},
		{raw: "oci://localhost:5001/app:", wantErr: true},
	}
	for _, test := range tests {
		got, err := oci.ParseReference(test.raw)
		if (err != nil) != test.wantErr || got != test.want {
			t.Errorf("ParseReference(%q) = %+v, %v; want %+v, error %t", test.raw, got, err, test.want, test.wantErr)
		}
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
