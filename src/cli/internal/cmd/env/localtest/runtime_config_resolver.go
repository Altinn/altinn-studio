package localtest

import (
	"context"
	"fmt"
	"net"
	"net/url"
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

func (r *runtimeConfigResolver) Build(ctx context.Context, portFlag int) (RuntimeConfig, error) {
	platform := r.client.Toolchain().Platform

	n := networking.NewNetworking(r.client, r.cfg, r.debugf)
	metadata, cached, err := n.ResolveNetworkMetadata(ctx)
	if err != nil {
		return RuntimeConfig{}, fmt.Errorf("resolve network metadata: %w", err)
	}
	if cached {
		r.debugf("using cached network metadata")
	}

	localAppURL := ResolveLocalAppURL()

	return RuntimeConfig{
		HostGateway:      metadata.HostGateway,
		LoadBalancerPort: strconv.Itoa(resolveLoadBalancerPort(portFlag)),
		LocalAppURL:      localAppURL,
		AppManagerURL:    ResolveAppManagerURL(localAppURL),
		User:             runtimeContainerUser(),
		Platform:         platform,
	}, nil
}

// DefaultLoadBalancerPortString returns the default localtest load balancer port as a string.
func DefaultLoadBalancerPortString() string {
	return strconv.Itoa(DefaultLoadBalancerPort)
}

// ResolveLocalAppURL returns the effective local app URL for localtest runtime and app-manager defaults.
func ResolveLocalAppURL() string {
	if value := strings.TrimSpace(os.Getenv(localAppURLEnv)); value != "" {
		return value
	}

	return "http://host.docker.internal:5005"
}

// ResolveAppManagerURL rewrites the local app URL to the host-side address app-manager should proxy to.
func ResolveAppManagerURL(localAppURL string) string {
	parsed, err := url.Parse(localAppURL)
	if err != nil {
		return localAppURL
	}

	host := strings.ToLower(parsed.Hostname())
	switch host {
	case networking.LocalDomain, "host.docker.internal", "host.containers.internal":
		parsed.Host = rewriteHostPort("127.0.0.1", parsed.Port())
	case "":
		parsed.Host = rewriteHostPort("127.0.0.1", parsed.Port())
	}

	return parsed.String()
}

func resolveLoadBalancerPort(portFlag int) int {
	if portFlag == 0 {
		return DefaultLoadBalancerPort
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

func rewriteHostPort(host, port string) string {
	if port == "" {
		return host
	}
	return net.JoinHostPort(host, port)
}
