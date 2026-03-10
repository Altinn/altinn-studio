package kind

import (
	"context"
	"errors"
	"strings"
	"testing"

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
