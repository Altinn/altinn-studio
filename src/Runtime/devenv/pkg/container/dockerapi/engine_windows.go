package dockerapi

import (
	"context"
	"net"
	"time"

	"github.com/Microsoft/go-winio"
)

const (
	defaultHost = "npipe:////./pipe/docker_engine"
	// pipeDialTimeout bounds the wait for a free pipe instance, as in moby's client.
	pipeDialTimeout = 32 * time.Second
)

func dialPipe(ctx context.Context, path string) (net.Conn, error) {
	ctx, cancel := context.WithTimeout(ctx, pipeDialTimeout)
	defer cancel()
	return winio.DialPipeContext(ctx, path) //nolint:wrapcheck // connectError words it.
}
