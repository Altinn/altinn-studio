//go:build !windows

package dockerapi

import (
	"context"
	"errors"
	"net"
)

const defaultHost = "unix:///var/run/docker.sock"

var errPipeUnsupported = errors.New("named pipes are only supported on Windows")

func dialPipe(context.Context, string) (net.Conn, error) { return nil, errPipeUnsupported }
