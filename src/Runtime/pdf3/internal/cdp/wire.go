package cdp

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"time"
)

// maxPipeMessageSize bounds the messages we buffer. The largest message we expect is a PDF chunk
// (see readPDFStream in the generator), about 11 MB. A larger one, such as a page logging a string
// of tens of megabytes, ends the connection: the worker crashes and restarts, as when the browser
// exits.
const maxPipeMessageSize = 256 * 1024 * 1024

var errPipeMessageTooLarge = errors.New("CDP pipe message exceeds size limit")

type messageTransport interface {
	ReadMessage() ([]byte, error)
	WriteJSON(ctx context.Context, value any) error
	Close() error
}

// pipeTransport exchanges NUL-terminated JSON messages with Chrome over --remote-debugging-pipe.
type pipeTransport struct {
	read   io.ReadCloser
	write  io.WriteCloser
	buffer *bufio.Reader
	// writeToken serializes writers, so frames never interleave
	writeToken chan struct{}
	// writeTimeout bounds how long a started frame may take to write
	writeTimeout time.Duration
	// maxMessageSize is maxPipeMessageSize, smaller in tests
	maxMessageSize int
}

func newPipeTransport(read io.ReadCloser, write io.WriteCloser, writeTimeout time.Duration) *pipeTransport {
	return &pipeTransport{
		read:           read,
		write:          write,
		buffer:         bufio.NewReaderSize(read, 64*1024),
		writeToken:     make(chan struct{}, 1),
		writeTimeout:   writeTimeout,
		maxMessageSize: maxPipeMessageSize,
	}
}

// ReadMessage returns the next message.
func (t *pipeTransport) ReadMessage() ([]byte, error) {
	var payload []byte
	for {
		fragment, err := t.buffer.ReadSlice(0)
		if len(payload)+len(fragment) > t.maxMessageSize {
			return nil, fmt.Errorf("%w: more than %d bytes", errPipeMessageTooLarge, t.maxMessageSize)
		}
		payload = append(payload, fragment...)
		if err == nil {
			return payload[:len(payload)-1], nil
		}
		if !errors.Is(err, bufio.ErrBufferFull) {
			return nil, fmt.Errorf("read CDP pipe message: %w", err)
		}
	}
}

// WriteJSON writes value as one message. ctx only applies while waiting for another writer to
// finish: once a frame has started it is always completed, because a partial frame would corrupt
// the stream for every later command. If the browser doesn't take the frame within writeTimeout
// it is stuck, and the transport is closed so that the connection fails instead of hanging.
func (t *pipeTransport) WriteJSON(ctx context.Context, value any) error {
	payload, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("encode CDP pipe message: %w", err)
	}
	if len(payload)+1 > t.maxMessageSize {
		return errPipeMessageTooLarge
	}
	payload = append(payload, 0)

	select {
	case t.writeToken <- struct{}{}:
		defer func() { <-t.writeToken }()
	case <-ctx.Done():
		return fmt.Errorf("wait for CDP writer: %w", context.Cause(ctx))
	}
	if ctx.Err() != nil {
		return fmt.Errorf("wait for CDP writer: %w", context.Cause(ctx))
	}

	stuck := time.AfterFunc(t.writeTimeout, func() {
		_ = t.Close() //nolint:errcheck // The blocked write and the reader report the failure.
	})
	defer stuck.Stop()
	for len(payload) > 0 {
		count, writeErr := t.write.Write(payload)
		if writeErr == nil && count == 0 {
			writeErr = io.ErrShortWrite
		}
		if writeErr != nil {
			// The frame may be incomplete, nothing written after it would be understood
			_ = t.Close() //nolint:errcheck // The write error is what the caller needs.
			return fmt.Errorf("write CDP pipe message: %w", writeErr)
		}
		payload = payload[count:]
	}
	return nil
}

func (t *pipeTransport) Close() error {
	var failures []error
	for _, endpoint := range []io.Closer{t.read, t.write} {
		if err := endpoint.Close(); err != nil && !errors.Is(err, os.ErrClosed) {
			failures = append(failures, err)
		}
	}
	if err := errors.Join(failures...); err != nil {
		return fmt.Errorf("close CDP pipe: %w", err)
	}
	return nil
}
