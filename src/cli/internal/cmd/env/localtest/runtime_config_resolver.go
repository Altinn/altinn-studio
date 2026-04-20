package localtest

import (
	"context"
	"fmt"
	"os"
	"runtime"
	"strconv"
	"strings"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/networking"
)

// DefaultLoadBalancerPort is the default localtest load balancer port.
const DefaultLoadBalancerPort = 8000

const localAppURLEnv = "LocalPlatformSettings__LocalAppUrl"

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

func (r *runtimeConfigResolver) Build(ctx context.Context) (RuntimeConfig, error) {
	platform := r.client.Toolchain().Platform

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
		LoadBalancerPort: DefaultLoadBalancerPortString(),
		LocalAppURL:      ResolveLocalAppURL(),
		User:             runtimeContainerUser(),
		Platform:         platform,
	}, nil
}

// DefaultLoadBalancerPortString returns the default localtest load balancer port as a string.
func DefaultLoadBalancerPortString() string {
	return strconv.Itoa(DefaultLoadBalancerPort)
}

// ResolveLocalAppURL returns the effective local app URL for localtest runtime.
func ResolveLocalAppURL() string {
	if value := strings.TrimSpace(os.Getenv(localAppURLEnv)); value != "" {
		return value
	}

	return "http://host.docker.internal:5005"
}

func runtimeContainerUser() string {
	// Keep empty on Windows because os.Getuid/getgid are unsupported there.
	if runtime.GOOS == "windows" {
		return ""
	}
	return fmt.Sprintf("%d:%d", os.Getuid(), os.Getgid())
}
