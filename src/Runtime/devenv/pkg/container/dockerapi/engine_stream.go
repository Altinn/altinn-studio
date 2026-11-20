package dockerapi

import (
	"bufio"
	"bytes"
	"context"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
)

var (
	errUpgradeRefused = errors.New("unable to upgrade to tcp")
	errDaemonStream   = errors.New("error from daemon in stream")
	errUnknownStream  = errors.New("unrecognized stream")
)

// hijackedConn is a connection the daemon took over after an HTTP upgrade.
// Reads go through the buffered reader that parsed the upgrade response.
type hijackedConn struct {
	net.Conn

	reader *bufio.Reader
	stop   func() bool
}

func (c *hijackedConn) Read(p []byte) (int, error) {
	return c.reader.Read(p) //nolint:wrapcheck // io.Reader must return io.EOF unwrapped.
}

// Close closes the connection and detaches it from the request context.
func (c *hijackedConn) Close() error {
	c.stop()
	return c.Conn.Close() //nolint:wrapcheck // Passed through from the connection.
}

// CloseWrite half-closes the connection so the process reads EOF on stdin.
func (c *hijackedConn) CloseWrite() error {
	if cw, ok := c.Conn.(interface{ CloseWrite() error }); ok {
		return cw.CloseWrite() //nolint:wrapcheck // Passed through from the connection.
	}
	return nil
}

// hijack sends a POST with Upgrade: tcp on a dedicated connection and returns it after 101 Switching Protocols.
// Unlike moby's client, cancelling ctx also closes the connection after the handshake, so a cancelled exec
// returns instead of waiting for the process.
func (e *engine) hijack(ctx context.Context, path string, body any) (*hijackedConn, error) {
	req, err := e.newRequest(ctx, http.MethodPost, path, nil, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Connection", "Upgrade")
	req.Header.Set("Upgrade", "tcp")

	conn, err := e.dial(ctx)
	if err != nil {
		return nil, connectError(e.daemon, err)
	}
	hc := &hijackedConn{Conn: conn, reader: bufio.NewReader(conn)}
	hc.stop = context.AfterFunc(ctx, func() { closeBestEffort(conn) })
	err = hc.upgrade(req)
	if err == nil {
		return hc, nil
	}
	closeBestEffort(hc)
	if ctx.Err() != nil {
		return nil, fmt.Errorf("attach %s: %w", path, ctx.Err())
	}
	return nil, err
}

func (c *hijackedConn) upgrade(req *http.Request) error {
	if err := req.Write(c.Conn); err != nil {
		return fmt.Errorf("send upgrade request: %w", err)
	}
	resp, err := http.ReadResponse(c.reader, req) //nolint:bodyclose // After a 101 the body is the connection.
	if err != nil {
		return fmt.Errorf("read upgrade response: %w", err)
	}
	if resp.StatusCode != http.StatusSwitchingProtocols {
		return fmt.Errorf("%w, received %d", errUpgradeRefused, resp.StatusCode)
	}
	return nil
}

const (
	streamStdin = iota
	streamStdout
	streamStderr
	streamSystemErr
)

// demux copies a multiplexed stdout/stderr stream as moby's stdcopy does. Each frame is an 8-byte header,
// [stream, 0, 0, 0, size as big-endian uint32], followed by size bytes of payload. A stream that ends
// within a frame ends the copy without an error.
func demux(stdout, stderr io.Writer, src io.Reader) error {
	var header [8]byte
	var payload bytes.Buffer
	for {
		if _, err := io.ReadFull(src, header[:]); err != nil {
			return endOfStream(err)
		}
		size := int64(binary.BigEndian.Uint32(header[4:]))
		payload.Reset()
		var dst io.Writer
		switch header[0] {
		case streamStdin, streamStdout:
			dst = stdout
		case streamStderr:
			dst = stderr
		case streamSystemErr:
		default:
			return fmt.Errorf("%w: %d", errUnknownStream, header[0])
		}
		if _, err := io.CopyN(&payload, src, size); err != nil {
			return endOfStream(err)
		}
		if header[0] == streamSystemErr {
			return fmt.Errorf("%w: %s", errDaemonStream, payload.Bytes())
		}
		if _, err := payload.WriteTo(dst); err != nil {
			return fmt.Errorf("write multiplexed stream: %w", err)
		}
	}
}

func endOfStream(err error) error {
	if err == nil || errors.Is(err, io.EOF) || errors.Is(err, io.ErrUnexpectedEOF) {
		return nil
	}
	return fmt.Errorf("copy multiplexed stream: %w", err)
}
