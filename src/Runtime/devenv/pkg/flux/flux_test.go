package flux

import (
	"context"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/fluxcd/flux2/v2/pkg/manifestgen"
	"github.com/fluxcd/flux2/v2/pkg/manifestgen/install"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"altinn.studio/devenv/pkg/cabundle"
)

var (
	errTransientFluxManifestDownload    = errors.New("failed to download manifests.tar.gz, status: 504 Gateway Timeout")
	errNonTransientFluxManifestDownload = errors.New("failed to download manifests.tar.gz, status: 404 Not Found")
)

func TestNewCABundleInstallPatch(t *testing.T) {
	caFile := t.TempDir() + "/ca.pem"
	if err := os.WriteFile(caFile, []byte("test-ca"), 0o600); err != nil {
		t.Fatalf("write CA file: %v", err)
	}
	t.Setenv(cabundle.EnvStudioCABundle, caFile)

	patch, configured, err := newCABundleInstallPatch()
	if err != nil {
		t.Fatalf("newCABundleInstallPatch() error = %v", err)
	}
	if !configured {
		t.Fatal("newCABundleInstallPatch() configured = false, want true")
	}

	configMap := patch.configMap()
	if configMap.GetKind() != "ConfigMap" {
		t.Fatalf("configMap kind = %q", configMap.GetKind())
	}
	if configMap.GetName() != fluxCABundleConfigMap {
		t.Fatalf("configMap name = %q", configMap.GetName())
	}
	data, found, err := unstructured.NestedString(configMap.Object, "data", fluxCABundleKey)
	if err != nil || !found {
		t.Fatalf("missing CA data: found=%v err=%v", found, err)
	}
	if data != "test-ca" {
		t.Fatalf("CA data = %q", data)
	}
}

func TestInsertCABundleConfigMapAfterFluxNamespace(t *testing.T) {
	namespace := &unstructured.Unstructured{}
	namespace.SetKind("Namespace")
	namespace.SetName("flux-system")
	deployment := fluxDeployment("source-controller")
	configMap := (&caBundleInstallPatch{data: "test-ca", digest: "test-digest"}).configMap()

	got := insertCABundleConfigMap([]*unstructured.Unstructured{namespace, deployment}, configMap)

	if len(got) != 3 {
		t.Fatalf("object count = %d, want 3", len(got))
	}
	if got[0] != namespace {
		t.Fatalf("first object = %s/%s, want flux namespace", got[0].GetKind(), got[0].GetName())
	}
	if got[1] != configMap {
		t.Fatalf("second object = %s/%s, want CA ConfigMap", got[1].GetKind(), got[1].GetName())
	}
	if got[2] != deployment {
		t.Fatalf("third object = %s/%s, want deployment", got[2].GetKind(), got[2].GetName())
	}
}

func TestInsertCABundleConfigMapFirstWithoutFluxNamespace(t *testing.T) {
	deployment := fluxDeployment("source-controller")
	configMap := (&caBundleInstallPatch{data: "test-ca", digest: "test-digest"}).configMap()

	got := insertCABundleConfigMap([]*unstructured.Unstructured{deployment}, configMap)

	if len(got) != 2 {
		t.Fatalf("object count = %d, want 2", len(got))
	}
	if got[0] != configMap {
		t.Fatalf("first object = %s/%s, want CA ConfigMap", got[0].GetKind(), got[0].GetName())
	}
	if got[1] != deployment {
		t.Fatalf("second object = %s/%s, want deployment", got[1].GetKind(), got[1].GetName())
	}
}

func TestPatchDeploymentsAddsCABundle(t *testing.T) {
	obj := fluxDeployment("source-controller")
	patchDeployments(
		[]*unstructured.Unstructured{obj},
		LocalInstallOptions(),
		&caBundleInstallPatch{data: "test-ca", digest: "test-digest"},
	)

	container := firstContainer(t, obj)
	assertEnv(t, container, "NPM_CONFIG_CAFILE", cabundle.ContainerPath)
	assertEnv(t, container, cabundle.EnvVarsKey, cabundle.EnvVarCSV())
	assertVolumeMount(t, container)
	assertCABundleVolume(t, obj)
	assertAnnotation(t, obj, fluxCABundleDigestAnno, "test-digest")
}

func TestPatchDeploymentsAddsCABundleToNotificationController(t *testing.T) {
	obj := fluxDeployment("notification-controller")
	patchDeployments(
		[]*unstructured.Unstructured{obj},
		LocalInstallOptions(),
		&caBundleInstallPatch{data: "test-ca", digest: "test-digest"},
	)

	container := firstContainer(t, obj)
	assertEnv(t, container, "NPM_CONFIG_CAFILE", cabundle.ContainerPath)
	assertEnv(t, container, cabundle.EnvVarsKey, cabundle.EnvVarCSV())
	assertVolumeMount(t, container)
	assertCABundleVolume(t, obj)
	assertAnnotation(t, obj, fluxCABundleDigestAnno, "test-digest")

	args, found, err := unstructured.NestedStringSlice(container, "args")
	if err != nil || !found {
		t.Fatalf("missing args: found=%v err=%v", found, err)
	}
	if len(args) != 1 || args[0] != "--enable-leader-election" {
		t.Fatalf("notification-controller args = %v, want unchanged leader election arg", args)
	}
}

func TestGenerateInstallManifestRetriesTransientDownloadFailure(t *testing.T) {
	restore := replaceInstallGenerate(t, func(attempt int) (*manifestgen.Manifest, error) {
		if attempt == 1 {
			return nil, errTransientFluxManifestDownload
		}
		return &manifestgen.Manifest{Content: "ok"}, nil
	})
	defer restore()

	restoreDelay := replaceInstallGenerateRetryDelay(t, time.Nanosecond)
	defer restoreDelay()

	manifest, err := generateInstallManifest(context.Background(), install.MakeDefaultOptions())
	if err != nil {
		t.Fatalf("generateInstallManifest() error = %v", err)
	}
	if manifest != "ok" {
		t.Fatalf("manifest = %q, want ok", manifest)
	}
}

func TestGenerateInstallManifestDoesNotRetryNonTransientFailure(t *testing.T) {
	var attempts int
	restore := replaceInstallGenerate(t, func(attempt int) (*manifestgen.Manifest, error) {
		attempts = attempt
		return nil, errNonTransientFluxManifestDownload
	})
	defer restore()

	_, err := generateInstallManifest(context.Background(), install.MakeDefaultOptions())
	if err == nil {
		t.Fatal("generateInstallManifest() error = nil, want error")
	}
	if attempts != 1 {
		t.Fatalf("attempts = %d, want 1", attempts)
	}
}

func TestGenerateInstallManifestHonorsContextBetweenRetries(t *testing.T) {
	restore := replaceInstallGenerate(t, func(int) (*manifestgen.Manifest, error) {
		return nil, errTransientFluxManifestDownload
	})
	defer restore()

	restoreDelay := replaceInstallGenerateRetryDelay(t, time.Hour)
	defer restoreDelay()

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err := generateInstallManifest(ctx, install.MakeDefaultOptions())
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("generateInstallManifest() error = %v, want context.Canceled", err)
	}
}

func replaceInstallGenerate(
	t *testing.T,
	replacement func(attempt int) (*manifestgen.Manifest, error),
) func() {
	t.Helper()

	original := installGenerate
	var attempts int
	installGenerate = func(opts install.Options, manifestsBase string) (*manifestgen.Manifest, error) {
		attempts++
		return replacement(attempts)
	}

	return func() {
		installGenerate = original
	}
}

func replaceInstallGenerateRetryDelay(t *testing.T, replacement time.Duration) func() {
	t.Helper()

	original := fluxInstallGenerateRetryDelay
	fluxInstallGenerateRetryDelay = replacement
	return func() {
		fluxInstallGenerateRetryDelay = original
	}
}

func fluxDeployment(name string) *unstructured.Unstructured {
	return &unstructured.Unstructured{
		Object: map[string]any{
			"apiVersion": "apps/v1",
			"kind":       "Deployment",
			"metadata": map[string]any{
				"name":      name,
				"namespace": "flux-system",
			},
			"spec": map[string]any{
				"template": map[string]any{
					"spec": map[string]any{
						"containers": []any{
							map[string]any{
								"name": "manager",
								"args": []any{"--enable-leader-election"},
								"env": []any{
									map[string]any{"name": "NPM_CONFIG_CAFILE", "value": "/old-ca.pem"},
									map[string]any{"name": "KEEP_ME", "value": "true"},
								},
								"volumeMounts": []any{
									map[string]any{"name": "old-ca", "mountPath": cabundle.ContainerPath},
								},
							},
						},
						"volumes": []any{
							map[string]any{"name": fluxCABundleVolume, "emptyDir": map[string]any{}},
						},
					},
				},
			},
		},
	}
}

func firstContainer(t *testing.T, obj *unstructured.Unstructured) map[string]any {
	t.Helper()

	containers, found, err := unstructured.NestedSlice(obj.Object, "spec", "template", "spec", "containers")
	if err != nil || !found || len(containers) == 0 {
		t.Fatalf("missing containers: found=%v err=%v", found, err)
	}
	container, ok := containers[0].(map[string]any)
	if !ok {
		t.Fatalf("container has type %T", containers[0])
	}
	return container
}

func assertEnv(t *testing.T, container map[string]any, name, want string) {
	t.Helper()

	env, found, err := unstructured.NestedSlice(container, "env")
	if err != nil || !found {
		t.Fatalf("missing env: found=%v err=%v", found, err)
	}
	for _, value := range env {
		envMap, ok := value.(map[string]any)
		if ok && envMap["name"] == name && envMap["value"] == want {
			return
		}
	}
	t.Fatalf("missing env %s=%s in %v", name, want, env)
}

func assertVolumeMount(t *testing.T, container map[string]any) {
	t.Helper()

	mounts, found, err := unstructured.NestedSlice(container, "volumeMounts")
	if err != nil || !found {
		t.Fatalf("missing volumeMounts: found=%v err=%v", found, err)
	}
	for _, mount := range mounts {
		mountMap, ok := mount.(map[string]any)
		if ok && mountMap["name"] == fluxCABundleVolume && mountMap["mountPath"] == cabundle.ContainerPath {
			return
		}
	}
	t.Fatalf("missing CA volumeMount in %v", mounts)
}

func assertCABundleVolume(t *testing.T, obj *unstructured.Unstructured) {
	t.Helper()

	volumes, found, err := unstructured.NestedSlice(obj.Object, "spec", "template", "spec", "volumes")
	if err != nil || !found {
		t.Fatalf("missing volumes: found=%v err=%v", found, err)
	}
	for _, volume := range volumes {
		volumeMap, ok := volume.(map[string]any)
		if ok && volumeMap["name"] == fluxCABundleVolume {
			configMap, ok := volumeMap["configMap"].(map[string]any)
			if !ok || configMap["name"] != fluxCABundleConfigMap {
				t.Fatalf("CA volume has configMap %v", volumeMap["configMap"])
			}
			return
		}
	}
	t.Fatalf("missing CA volume in %v", volumes)
}

func assertAnnotation(t *testing.T, obj *unstructured.Unstructured, name, want string) {
	t.Helper()

	got, found, err := unstructured.NestedString(obj.Object, "spec", "template", "metadata", "annotations", name)
	if err != nil || !found {
		t.Fatalf("missing annotation %s: found=%v err=%v", name, found, err)
	}
	if got != want {
		t.Fatalf("annotation %s = %q, want %q", name, got, want)
	}
}
