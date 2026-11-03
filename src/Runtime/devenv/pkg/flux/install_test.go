package flux

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"
	"testing/iotest"
	"time"
)

const testSourceControllerManifest = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
spec:
  template:
    spec:
      containers:
      - name: manager
        image: fluxcd/source-controller:v1.0.0
        args:
        - --events-addr=http://notification-controller.flux-system.svc.cluster.local./
        - --watch-all-namespaces
        - --log-level=info
        - --log-encoding=json
        - --enable-leader-election
        - --storage-path=/data
        - --storage-adv-addr=source-controller.$(RUNTIME_NAMESPACE).svc.cluster.local.
`

func TestBuildFluxManifestAppliesInstallDefaults(t *testing.T) {
	manifest, err := buildFluxManifest(map[string][]byte{
		"source-controller.yaml": []byte(testSourceControllerManifest),
		"policies.yaml":          []byte("apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: policies\n"),
		"rbac.yaml":              []byte("apiVersion: v1\nkind: ServiceAccount\nmetadata:\n  name: rbac\n"),
	}, []string{"source-controller"})
	if err != nil {
		t.Fatalf("buildFluxManifest() error = %v", err)
	}

	for _, want := range []string{
		"name: rbac-flux-system\n  namespace: flux-system",
		"app.kubernetes.io/version: " + fluxVersion,
		"kubernetes.io/os: linux",
		"image: ghcr.io/fluxcd/source-controller:v1.0.0",
		"- --events-addr=\n        - --watch-all-namespaces=true\n",
	} {
		if !strings.Contains(manifest, want) {
			t.Errorf("manifest does not contain %q:\n%s", want, manifest)
		}
	}
}

func TestReadTarGz(t *testing.T) {
	for _, tt := range []struct {
		name      string
		entries   []tar.Header
		wantError bool
	}{
		{"regular", []tar.Header{{Name: "rbac.yaml", Size: 1}}, false},
		{"parent", []tar.Header{{Name: "../rbac.yaml"}}, true},
		{"absolute", []tar.Header{{Name: "/rbac.yaml"}}, true},
		{"nested", []tar.Header{{Name: "roles/rbac.yaml"}}, true},
		{"windows", []tar.Header{{Name: `roles\rbac.yaml`}}, true},
		{"dot", []tar.Header{{Name: "."}}, true},
		{"dotdot", []tar.Header{{Name: ".."}}, true},
		{"symlink", []tar.Header{{Name: "rbac.yaml", Typeflag: tar.TypeSymlink, Linkname: "elsewhere"}}, true},
		{"duplicate", []tar.Header{{Name: "rbac.yaml"}, {Name: "rbac.yaml"}}, true},
		{"oversized", []tar.Header{{Name: "rbac.yaml", Size: fluxManifestsMaxSize}}, true},
		{"aggregate", []tar.Header{{Name: "one.yaml", Size: fluxManifestsMaxSize / 2}, {Name: "two.yaml", Size: fluxManifestsMaxSize / 2}}, true},
	} {
		t.Run(tt.name, func(t *testing.T) {
			var archive bytes.Buffer
			gz := gzip.NewWriter(&archive)
			tw := tar.NewWriter(gz)
			for _, header := range tt.entries {
				if err := tw.WriteHeader(&header); err != nil {
					t.Fatal(err)
				}
				if _, err := tw.Write(make([]byte, header.Size)); err != nil {
					t.Fatal(err)
				}
			}
			if err := tw.Close(); err != nil {
				t.Fatal(err)
			}
			if err := gz.Close(); err != nil {
				t.Fatal(err)
			}
			files, err := readTarGz(&archive)
			if tt.wantError {
				if !errors.Is(err, errFluxManifestArchive) {
					t.Fatalf("readTarGz() error = %v, want invalid archive", err)
				}
			} else if err != nil || len(files["rbac.yaml"]) != 1 {
				t.Fatalf("readTarGz() = %v, %v", files, err)
			}
		})
	}
}

func TestBuildFluxManifestRequiresRBAC(t *testing.T) {
	if _, err := buildFluxManifest(nil, nil); !errors.Is(err, errFluxManifestArchive) {
		t.Fatalf("buildFluxManifest() error = %v, want missing RBAC", err)
	}
}

func TestDownloadFluxManifestsPreservesStatus(t *testing.T) {
	original := http.DefaultClient
	t.Cleanup(func() { http.DefaultClient = original })
	for _, status := range []int{http.StatusServiceUnavailable, http.StatusNotFound} {
		http.DefaultClient = &http.Client{
			Transport: fluxManifestTransport(func(req *http.Request) (*http.Response, error) {
				deadline, ok := req.Context().Deadline()
				if !ok || time.Until(deadline) > fluxManifestsDownloadTimeout {
					t.Fatal("manifest request has no bounded deadline")
				}
				return &http.Response{
					StatusCode: status,
					Status:     fmt.Sprintf("%d %s", status, http.StatusText(status)),
					Body:       io.NopCloser(iotest.ErrReader(io.ErrUnexpectedEOF)),
				}, nil
			}),
		}
		_, err := downloadFluxManifests(t.Context())
		if err == nil || !strings.Contains(err.Error(), http.StatusText(status)) ||
			errors.Is(
				err,
				io.ErrUnexpectedEOF,
			) || isRetryableInstallGenerateError(err) != (status == http.StatusServiceUnavailable) {
			t.Fatalf("downloadFluxManifests() error = %v, want HTTP status without reading the body", err)
		}
	}
}

type fluxManifestTransport func(*http.Request) (*http.Response, error)

func (f fluxManifestTransport) RoundTrip(req *http.Request) (*http.Response, error) { return f(req) }
