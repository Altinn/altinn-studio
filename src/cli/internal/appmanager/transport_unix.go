//go:build !windows

package appmanager

import (
	"context"
	"net"
	"net/http"
	"os/exec"
	"syscall"

	"altinn.studio/studioctl/internal/config"
)

func transportForConfig(cfg *config.Config) *http.Transport {
	baseTransport, ok := http.DefaultTransport.(*http.Transport)
	if !ok {
		var transport http.Transport
		transport.DialContext = func(ctx context.Context, _, _ string) (net.Conn, error) {
			var d net.Dialer
			return d.DialContext(ctx, "unix", cfg.AppManagerSocketPath())
		}
		return &transport
	}

	transport := baseTransport.Clone()
	transport.DialContext = func(ctx context.Context, _, _ string) (net.Conn, error) {
		var d net.Dialer
		return d.DialContext(ctx, "unix", cfg.AppManagerSocketPath())
	}
	return transport
}

func applyProcessAttrs(cmd *exec.Cmd) {
	var attr syscall.SysProcAttr
	attr.Setsid = true
	cmd.SysProcAttr = &attr
}
