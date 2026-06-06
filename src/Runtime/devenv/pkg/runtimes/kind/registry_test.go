package kind

import (
	"context"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/cabundle"
	"altinn.studio/devenv/pkg/container"
	containermock "altinn.studio/devenv/pkg/container/mock"
)

func TestConnectProxyRegistriesToKindNetwork_MissingProxyContainer(t *testing.T) {
	t.Parallel()

	client := containermock.New()
	client.ContainerNetworksFunc = func(_ context.Context, _ string) ([]string, error) {
		return nil, container.ErrContainerNotFound
	}

	runtime := &KindContainerRuntime{ContainerClient: client}
	err := runtime.connectProxyRegistriesToKindNetwork(t.Context())
	if err == nil {
		t.Fatal("connectProxyRegistriesToKindNetwork() expected error, got nil")
	}
	if !errors.Is(err, container.ErrContainerNotFound) {
		t.Fatalf("connectProxyRegistriesToKindNetwork() error = %v, want ErrContainerNotFound", err)
	}
	if !strings.Contains(err.Error(), "proxy registry kind-registry-docker is not running") {
		t.Fatalf("connectProxyRegistriesToKindNetwork() error = %v, want actionable proxy message", err)
	}
}

func TestConfigureRegistryMirrorWritesCABundle(t *testing.T) {
	path := writeTestCABundle(t, "test-ca")
	t.Setenv(cabundle.EnvStudioCABundle, path)

	client := containermock.New()
	var caWrites int
	client.ExecWithIOFunc = func(
		_ context.Context,
		_ string,
		cmd []string,
		stdin io.Reader,
		_, _ io.Writer,
	) error {
		if len(cmd) == 3 && cmd[2] == "/etc/containerd/certs.d/docker.io/ca.crt" {
			data, err := io.ReadAll(stdin)
			if err != nil {
				t.Fatalf("read stdin: %v", err)
			}
			if string(data) != "test-ca" {
				t.Fatalf("CA data = %q, want test-ca", string(data))
			}
			caWrites++
		}
		return nil
	}

	runtime := &KindContainerRuntime{ContainerClient: client}
	err := runtime.configureRegistryMirror(
		t.Context(),
		[]string{"kind-node"},
		"docker.io",
		registryDockerName,
		"https://registry-1.docker.io",
	)
	if err != nil {
		t.Fatalf("configureRegistryMirror() error = %v", err)
	}
	if caWrites != 1 {
		t.Fatalf("CA writes = %d, want 1", caWrites)
	}
}

func TestRegisterCABundleInNodeUsesTrustStoreScript(t *testing.T) {
	client := containermock.New()
	var command []string
	client.ExecFunc = func(_ context.Context, _ string, cmd []string) error {
		command = cmd
		return nil
	}

	runtime := &KindContainerRuntime{ContainerClient: client}
	if err := runtime.registerCABundleInNode(t.Context(), "kind-node"); err != nil {
		t.Fatalf("registerCABundleInNode() error = %v", err)
	}

	if len(command) != 3 || command[0] != "sh" || command[1] != "-c" {
		t.Fatalf("command = %#v, want sh -c script", command)
	}
	if !strings.Contains(command[2], "update-ca-certificates") {
		t.Fatalf("script missing update-ca-certificates:\n%s", command[2])
	}
	if !strings.Contains(command[2], "update-ca-trust extract") {
		t.Fatalf("script missing update-ca-trust extract:\n%s", command[2])
	}
}

func writeTestCABundle(t *testing.T, content string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "ca.pem")
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatalf("write CA bundle: %v", err)
	}
	return path
}
