package cdp

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"time"
)

// maxPipeMessageSize bounds the messages we buffer. The largest message we expect is a PDF chunk
// (see readPDFStream in the generator), about 11 MB. Chrome can send larger ones, for example when
// a page logs a huge string, so ReadMessage skips those instead of failing the connection.
const maxPipeMessageSize = 32 * 1024 * 1024

// oversizedPrefixLength is how much of a skipped message is kept, enough to tell a command
// response (Chrome writes `{"id":N` first) from an event.
const oversizedPrefixLength = 64

var errPipeMessageTooLarge = errors.New("CDP pipe message exceeds size limit")

// oversizedMessageError reports a message that ReadMessage skipped because it was too large.
// The stream is still usable after it.
type oversizedMessageError struct {
	prefix []byte
	size   int
}

func (e *oversizedMessageError) Error() string {
	return fmt.Sprintf("%s: skipped %d bytes starting with %q", errPipeMessageTooLarge, e.size, e.prefix)
}

func (e *oversizedMessageError) Unwrap() error {
	return errPipeMessageTooLarge
}

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

// ReadMessage returns the next message. A message larger than the size limit is discarded up
// to its terminator and reported as an *oversizedMessageError, after which reading can continue.
func (t *pipeTransport) ReadMessage() ([]byte, error) {
	var payload []byte
	for {
		fragment, err := t.buffer.ReadSlice(0)
		if len(payload)+len(fragment) > t.maxMessageSize {
			return nil, t.skipMessage(payload, fragment, err)
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

// skipMessage discards the rest of the current message, payload and fragment being what was read
// of it so far, and err the result of the last read.
func (t *pipeTransport) skipMessage(payload, fragment []byte, err error) error {
	// The fragment is only valid until the next read, keep the prefix before reading on
	prefix := make([]byte, 0, oversizedPrefixLength)
	prefix = append(prefix, payload[:min(len(payload), oversizedPrefixLength)]...)
	prefix = append(prefix, fragment[:min(len(fragment), oversizedPrefixLength-len(prefix))]...)
	size := len(payload) + len(fragment)
	for errors.Is(err, bufio.ErrBufferFull) {
		fragment, err = t.buffer.ReadSlice(0)
		size += len(fragment)
	}
	if err != nil {
		return fmt.Errorf("read CDP pipe message: %w", err)
	}
	return &oversizedMessageError{prefix: bytes.TrimSuffix(prefix, []byte{0}), size: size - 1}
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
		return fmt.Errorf("wait for CDP writer: %w", ctx.Err())
	}
	if ctx.Err() != nil {
		return fmt.Errorf("wait for CDP writer: %w", ctx.Err())
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
