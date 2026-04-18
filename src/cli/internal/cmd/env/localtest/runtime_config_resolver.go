package localtest

import (
	"context"
	"fmt"
	"os"
	"runtime"

	"altinn.studio/devenv/pkg/container"
)

type runtimeConfigResolver struct {
	client container.ContainerClient
}

func newRuntimeConfigResolver(client container.ContainerClient) *runtimeConfigResolver {
	return &runtimeConfigResolver{
		client: client,
	}
}

func (r *runtimeConfigResolver) Build(_ context.Context) (RuntimeConfig, error) {
	platform := r.client.Toolchain().Platform

	return RuntimeConfig{
		User:     runtimeContainerUser(),
		Platform: platform,
	}, nil
}

func runtimeContainerUser() string {
	// Keep empty on Windows because os.Getuid/getgid are unsupported there.
	if runtime.GOOS == "windows" {
		return ""
	}
	return fmt.Sprintf("%d:%d", os.Getuid(), os.Getgid())
}
