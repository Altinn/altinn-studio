package studioctlserver

import (
	"context"
	"net"
	"net/http"

	"altinn.studio/studioctl/internal/config"
)

func transportForConfig(cfg *config.Config) *http.Transport {
	baseTransport, ok := http.DefaultTransport.(*http.Transport)
	if !ok {
		var transport http.Transport
		transport.DialContext = func(ctx context.Context, _, _ string) (net.Conn, error) {
			var d net.Dialer
			return d.DialContext(ctx, "unix", cfg.StudioctlServerSocketPath())
		}
		return &transport
	}

	transport := baseTransport.Clone()
	transport.DialContext = func(ctx context.Context, _, _ string) (net.Conn, error) {
		var d net.Dialer
		return d.DialContext(ctx, "unix", cfg.StudioctlServerSocketPath())
	}
	return transport
}
