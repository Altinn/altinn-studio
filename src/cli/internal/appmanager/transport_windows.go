//go:build windows

package appmanager

import (
	"context"
	"net"
	"net/http"
	"os/exec"
	"syscall"

	"github.com/Microsoft/go-winio"

	"altinn.studio/studioctl/internal/config"
)

func transportForConfig(cfg *config.Config) *http.Transport {
	pipePath := `\\.\pipe\` + cfg.AppManagerNamedPipeName()
	return &http.Transport{
		DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
			return winio.DialPipeContext(ctx, pipePath)
		},
	}
}

func applyProcessAttrs(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
}
