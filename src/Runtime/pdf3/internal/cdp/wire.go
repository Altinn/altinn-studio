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

// Bound protocol reads while leaving room for large base64-encoded PDF responses
// as well as compiled scripts. The cache itself has a smaller independent limit.
const maxPipeMessageSize = 128 * 1024 * 1024

var errPipeMessageTooLarge = errors.New("CDP pipe message exceeds size limit")

type messageTransport interface {
	ReadMessage() ([]byte, error)
	WriteJSON(ctx context.Context, value any) error
	Close() error
}

type pipeTransport struct {
	read       io.ReadCloser
	write      io.WriteCloser
	buffer     *bufio.Reader
	writeToken chan struct{}
}

func newPipeTransport(read io.ReadCloser, write io.WriteCloser) *pipeTransport {
	return &pipeTransport{
		read:       read,
		write:      write,
		buffer:     bufio.NewReaderSize(read, 64*1024),
		writeToken: make(chan struct{}, 1),
	}
}

func (t *pipeTransport) ReadMessage() ([]byte, error) {
	var payload []byte
	for {
		fragment, err := t.buffer.ReadSlice(0)
		if len(payload)+len(fragment) > maxPipeMessageSize {
			return nil, errPipeMessageTooLarge
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

func (t *pipeTransport) WriteJSON(ctx context.Context, value any) error {
	payload, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("encode CDP pipe message: %w", err)
	}
	if len(payload)+1 > maxPipeMessageSize {
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
		return fmt.Errorf("write CDP pipe message: %w", ctx.Err())
	}
	// Let a healthy writer finish its frame when a request is canceled. If the
	// pipe stays blocked, the incomplete frame makes the connection unusable.
	writeFinished := make(chan struct{})
	defer close(writeFinished)
	stopCancel := context.AfterFunc(ctx, func() {
		timer := time.NewTimer(250 * time.Millisecond)
		defer timer.Stop()
		select {
		case <-writeFinished:
		case <-timer.C:
			_ = t.Close() //nolint:errcheck // Cancellation must close both streams; readers report the failure.
		}
	})
	defer stopCancel()
	for len(payload) > 0 {
		count, writeErr := t.write.Write(payload)
		if writeErr != nil {
			if ctx.Err() != nil {
				return fmt.Errorf("write CDP pipe message: %w", ctx.Err())
			}
			return fmt.Errorf("write CDP pipe message: %w", writeErr)
		}
		if count == 0 {
			return io.ErrShortWrite
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
