package flux

import (
	"strings"
	"testing"
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
