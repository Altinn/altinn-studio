package cabundle

import (
	"encoding/pem"
	"errors"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/cabundle/cabundletest"
)

func TestFromEnvUnset(t *testing.T) {
	t.Setenv(EnvStudioCABundle, "")

	bundle, configured, err := FromEnv()
	if err != nil {
		t.Fatalf("FromEnv() error = %v", err)
	}
	if configured {
		t.Fatal("FromEnv() configured = true, want false")
	}
	if bundle != nil {
		t.Fatalf("FromEnv() = %#v, want nil", bundle)
	}
}

func TestFromEnvMissingFile(t *testing.T) {
	t.Setenv(EnvStudioCABundle, filepath.Join(t.TempDir(), "missing.pem"))

	_, _, err := FromEnv()
	if err == nil {
		t.Fatal("FromEnv() expected error, got nil")
	}
	if !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("FromEnv() error = %v, want os.ErrNotExist", err)
	}
}

func TestFromEnvDirectory(t *testing.T) {
	t.Setenv(EnvStudioCABundle, t.TempDir())

	_, _, err := FromEnv()
	if err == nil {
		t.Fatal("FromEnv() expected error, got nil")
	}
	if !errors.Is(err, errCABundleNotRegular) {
		t.Fatalf("FromEnv() error = %v, want errCABundleNotRegular", err)
	}
}

func TestFromEnvValidFileReturnsAbsolutePath(t *testing.T) {
	tmp := t.TempDir()
	t.Chdir(tmp)
	if writeErr := os.WriteFile("ca.pem", cabundletest.PEM(t), 0o600); writeErr != nil {
		t.Fatalf("write bundle: %v", writeErr)
	}
	t.Setenv(EnvStudioCABundle, "ca.pem")

	bundle, configured, err := FromEnv()
	if err != nil {
		t.Fatalf("FromEnv() error = %v", err)
	}
	if !configured {
		t.Fatal("FromEnv() configured = false, want true")
	}
	if bundle == nil {
		t.Fatal("FromEnv() = nil, want bundle")
	}
	wantPath := filepath.Join(tmp, "ca.pem")
	if bundle.HostPath != wantPath {
		t.Fatalf("HostPath = %q, want %q", bundle.HostPath, wantPath)
	}
	if bundle.ContainerPath != ContainerPath {
		t.Fatalf("ContainerPath = %q, want %q", bundle.ContainerPath, ContainerPath)
	}
	if bundle.Digest == "" {
		t.Fatal("Digest is empty")
	}
}

func TestFromEnvRejectsABundleWithoutCertificate(t *testing.T) {
	for name, content := range map[string][]byte{
		"empty":                   nil,
		"not PEM":                 []byte("complete-test-ca-bundle\n"),
		"a key, no certificate":   pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: []byte("key")}),
		"a malformed certificate": pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: []byte("not DER")}),
	} {
		t.Run(name, func(t *testing.T) {
			path := filepath.Join(t.TempDir(), "ca.pem")
			if err := os.WriteFile(path, content, 0o600); err != nil {
				t.Fatalf("write bundle: %v", err)
			}
			t.Setenv(EnvStudioCABundle, path)

			bundle, configured, err := FromEnv()
			if !errors.Is(err, ErrNoCertificate) {
				t.Fatalf("FromEnv() error = %v, want ErrNoCertificate", err)
			}
			if !configured || bundle != nil {
				t.Fatalf("FromEnv() = %v, %v; want nil, configured", bundle, configured)
			}
			if !strings.Contains(err.Error(), path) {
				t.Fatalf("FromEnv() error = %v, want it to name %s", err, path)
			}
		})
	}
}

func TestFromEnvAcceptsASystemBundleWithComments(t *testing.T) {
	content := "# A system bundle has comments between certificates.\n" + string(cabundletest.PEM(t)) +
		"\n# Another\n" + string(cabundletest.PEM(t))
	path := filepath.Join(t.TempDir(), "ca-certificates.crt")
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatalf("write bundle: %v", err)
	}
	t.Setenv(EnvStudioCABundle, path)

	bundle, _, err := FromEnv()
	if err != nil {
		t.Fatalf("FromEnv() error = %v", err)
	}
	if string(bundle.Data) != content {
		t.Fatal("FromEnv() changed the bundle's content")
	}
}

// TestUsesOnlyTheStandardLibrary keeps the package importable by studioctl without Kubernetes or other modules;
// what needs them lives in kubeartifact.
func TestUsesOnlyTheStandardLibrary(t *testing.T) {
	files, err := filepath.Glob("*.go")
	if err != nil {
		t.Fatal(err)
	}
	for _, file := range files {
		if strings.HasSuffix(file, "_test.go") {
			continue
		}
		parsed, err := parser.ParseFile(token.NewFileSet(), file, nil, parser.ImportsOnly)
		if err != nil {
			t.Fatalf("parse %s: %v", file, err)
		}
		for _, spec := range parsed.Imports {
			path, err := strconv.Unquote(spec.Path.Value)
			if err != nil {
				t.Fatalf("%s: import %s: %v", file, spec.Path.Value, err)
			}
			if first, _, _ := strings.Cut(path, "/"); strings.Contains(first, ".") {
				t.Errorf("%s imports %s; keep cabundle on the standard library", file, path)
			}
		}
	}
}

func TestApplyKubernetesEnv(t *testing.T) {
	got := ApplyKubernetesEnv([]any{
		map[string]any{"name": "KEEP_ME", "value": "true"},
		map[string]any{"name": "SSL_CERT_FILE", "value": "/old/path.pem"},
		map[string]any{"name": EnvStudioCABundle, "value": ContainerPath},
		map[string]any{"name": EnvStudioCABundle, "value": ContainerPath},
	})

	if !hasEnv(got, "KEEP_ME", "true") {
		t.Fatalf("existing env was removed: %v", got)
	}
	if hasEnv(got, "SSL_CERT_FILE", "/old/path.pem") {
		t.Fatalf("old SSL_CERT_FILE was retained: %v", got)
	}
	for _, key := range EnvVars() {
		if !hasEnv(got, key, ContainerPath) {
			t.Fatalf("missing env %s=%s in %v", key, ContainerPath, got)
		}
	}
	if !hasEnv(got, EnvStudioCABundle, ContainerPath) {
		t.Fatalf("missing %s=%s in %v", EnvStudioCABundle, ContainerPath, got)
	}
	if !hasEnv(got, EnvVarsKey, EnvVarCSV()) {
		t.Fatalf("missing %s=%s in %v", EnvVarsKey, EnvVarCSV(), got)
	}
	if count := countEnv(got, EnvStudioCABundle); count != 1 {
		t.Fatalf("%s count = %d, want 1 in %v", EnvStudioCABundle, count, got)
	}
}

func TestApplyKubernetesVolumeMount(t *testing.T) {
	got := ApplyKubernetesVolumeMount([]any{
		map[string]any{"name": "tmp", "mountPath": "/tmp"},
		map[string]any{"name": "old-ca", "mountPath": ContainerPath},
	}, "devenv-ca-bundle", "ca-bundle.pem")

	if len(got) != 2 {
		t.Fatalf("volume mounts = %v, want 2 entries", got)
	}
	if !hasVolumeMount(got, "tmp", "/tmp") {
		t.Fatalf("existing unrelated mount was removed: %v", got)
	}
	if !hasVolumeMount(got, "devenv-ca-bundle", ContainerPath) {
		t.Fatalf("missing CA mount in %v", got)
	}
}

func TestKubernetesConfigMapVolume(t *testing.T) {
	volume := KubernetesConfigMapVolume("devenv-ca-bundle", "devenv-ca-bundle", "ca-bundle.pem")

	configMap, ok := volume["configMap"].(map[string]any)
	if !ok {
		t.Fatalf("configMap = %T, want map", volume["configMap"])
	}
	if configMap["name"] != "devenv-ca-bundle" {
		t.Fatalf("configMap name = %v", configMap["name"])
	}
}

func TestRegistrationScript(t *testing.T) {
	script := RegistrationScript()
	for _, want := range []string{
		"set -eu",
		"update-ca-certificates",
		"update-ca-trust extract",
		"/etc/ssl/certs/ca-certificates.crt",
		"/etc/ssl/cert.pem",
		"exit 1",
		ContainerPath,
	} {
		if !strings.Contains(script, want) {
			t.Fatalf("RegistrationScript() missing %q:\n%s", want, script)
		}
	}
}

func hasEnv(env []any, name, value string) bool {
	return slices.ContainsFunc(env, func(item any) bool {
		envMap, ok := item.(map[string]any)
		return ok && envMap["name"] == name && envMap["value"] == value
	})
}

func countEnv(env []any, name string) int {
	count := 0
	for _, item := range env {
		envMap, ok := item.(map[string]any)
		if ok && envMap["name"] == name {
			count++
		}
	}
	return count
}

func hasVolumeMount(mounts []any, name, path string) bool {
	return slices.ContainsFunc(mounts, func(item any) bool {
		mount, ok := item.(map[string]any)
		return ok && mount["name"] == name && mount["mountPath"] == path
	})
}
