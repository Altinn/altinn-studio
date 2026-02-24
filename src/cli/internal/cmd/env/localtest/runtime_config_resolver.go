package localtest

import (
	"context"
	"fmt"
	"os"
	"runtime"
	"strconv"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/networking"
)

const defaultLoadBalancerPort = 8000

type runtimeConfigResolver struct {
	cfg    *config.Config
	client container.ContainerClient
	debugf func(format string, args ...any)
}

func newRuntimeConfigResolver(
	cfg *config.Config,
	client container.ContainerClient,
	debugf func(format string, args ...any),
) *runtimeConfigResolver {
	if debugf == nil {
		debugf = func(string, ...any) {}
	}
	return &runtimeConfigResolver{
		cfg:    cfg,
		client: client,
		debugf: debugf,
	}
}

func (r *runtimeConfigResolver) Build(ctx context.Context, portFlag int) (RuntimeConfig, error) {
	installation := r.client.Installation()

	n := networking.NewNetworking(r.client, r.cfg, r.debugf)
	metadata, cached, err := n.ResolveNetworkMetadata(ctx)
	if err != nil {
		return RuntimeConfig{}, fmt.Errorf("resolve network metadata: %w", err)
	}
	if cached {
		r.debugf("using cached network metadata")
	}

	return RuntimeConfig{
		HostGateway:      metadata.HostGateway,
		LoadBalancerPort: strconv.Itoa(resolveLoadBalancerPort(portFlag)),
		User:             runtimeContainerUser(),
		Installation:     installation,
	}, nil
}

func resolveLoadBalancerPort(portFlag int) int {
	if portFlag == 0 {
		return defaultLoadBalancerPort
	}
	return portFlag
}

func runtimeContainerUser() string {
	// Keep empty on Windows because os.Getuid/getgid are unsupported there.
	if runtime.GOOS == "windows" {
		return ""
	}
	return fmt.Sprintf("%d:%d", os.Getuid(), os.Getgid())
}
