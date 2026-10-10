package cdp

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"
	"testing"
	"time"
)

const testWriteTimeout = 5 * time.Second

type bufferWriteCloser struct {
	bytes.Buffer

	maxWrite int
}

func (w *bufferWriteCloser) Write(data []byte) (int, error) {
	if w.maxWrite > 0 && len(data) > w.maxWrite {
		data = data[:w.maxWrite]
	}
	count, err := w.Buffer.Write(data)
	if err != nil {
		return count, fmt.Errorf("write test buffer: %w", err)
	}
	return count, nil
}

func (w *bufferWriteCloser) Close() error { return nil }

func TestPipeTransportFraming(t *testing.T) {
	large := strings.Repeat("a", 128*1024)
	reader := io.NopCloser(strings.NewReader(`{"value":"first"}` + "\x00" + large + "\x00"))
	writer := &bufferWriteCloser{maxWrite: 5}
	transport := newPipeTransport(reader, writer, testWriteTimeout)
	for _, expected := range []string{`{"value":"first"}`, large} {
		payload, err := transport.ReadMessage()
		if err != nil || string(payload) != expected {
			t.Fatalf("ReadMessage() = %q, %v; expected %d bytes", payload, err, len(expected))
		}
	}
	if _, err := transport.ReadMessage(); !errors.Is(err, io.EOF) {
		t.Fatalf("ReadMessage() after final frame = %v; expected EOF", err)
	}
	value := map[string]string{"line": "one\ntwo", "nul": "\x00"}
	if err := transport.WriteJSON(t.Context(), value); err != nil {
		t.Fatal(err)
	}
	encoded, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(writer.Bytes(), append(encoded, 0)) {
		t.Fatalf("WriteJSON() framing = %q", writer.Bytes())
	}
}

func TestPipeTransportSkipsOversizedMessages(t *testing.T) {
	// Larger than the read buffer as well as the limit, so skipping spans several reads
	oversized := `{"id":7,"result":"` + strings.Repeat("x", 200*1024) + `"}`
	reader := io.NopCloser(strings.NewReader(oversized + "\x00" + `{"id":8}` + "\x00"))
	transport := newPipeTransport(reader, &bufferWriteCloser{}, testWriteTimeout)
	transport.maxMessageSize = 100 * 1024

	_, err := transport.ReadMessage()
	skipped, ok := errors.AsType[*oversizedMessageError](err)
	if !ok || !errors.Is(err, errPipeMessageTooLarge) {
		t.Fatalf("oversized read = %v", err)
	}
	if skipped.size != len(oversized) || !strings.HasPrefix(oversized, string(skipped.prefix)) ||
		len(skipped.prefix) != oversizedPrefixLength {
		t.Fatalf("skipped message = %d bytes, prefix %q", skipped.size, skipped.prefix)
	}
	if payload, err := transport.ReadMessage(); err != nil || string(payload) != `{"id":8}` {
		t.Fatalf("read after oversized message = %q, %v", payload, err)
	}

	if err := transport.WriteJSON(t.Context(), strings.Repeat("b", transport.maxMessageSize)); !errors.Is(
		err,
		errPipeMessageTooLarge,
	) {
		t.Fatalf("oversized write = %v", err)
	}
}

func TestPipeTransportRejectsTruncatedFrame(t *testing.T) {
	transport := newPipeTransport(io.NopCloser(strings.NewReader(`{"id":1}`)), &bufferWriteCloser{}, testWriteTimeout)
	if _, err := transport.ReadMessage(); !errors.Is(err, io.EOF) {
		t.Fatalf("truncated frame read = %v", err)
	}

	// An oversized message cut off by EOF is a read failure, not a skipped message
	transport = newPipeTransport(io.NopCloser(strings.NewReader(strings.Repeat("a", 64))), &bufferWriteCloser{},
		testWriteTimeout)
	transport.maxMessageSize = 16
	if _, err := transport.ReadMessage(); !errors.Is(err, io.EOF) {
		t.Fatalf("truncated oversized frame read = %v", err)
	}
}

type observedWriter struct {
	io.WriteCloser

	started chan struct{}
}

func (w *observedWriter) Write(data []byte) (int, error) {
	select {
	case <-w.started:
	default:
		close(w.started)
	}
	count, err := w.WriteCloser.Write(data)
	if err != nil {
		return count, fmt.Errorf("write observed pipe: %w", err)
	}
	return count, nil
}

// newBlockingTransport returns a transport whose writes block until the peer reads them.
func newBlockingTransport(t *testing.T, writeTimeout time.Duration) (*pipeTransport, *pipeTransport, chan struct{}) {
	t.Helper()
	reader, writer := io.Pipe()
	observed := &observedWriter{WriteCloser: writer, started: make(chan struct{})}
	transport := newPipeTransport(io.NopCloser(strings.NewReader("")), observed, writeTimeout)
	peer := newPipeTransport(reader, &bufferWriteCloser{}, testWriteTimeout)
	t.Cleanup(func() {
		if err := reader.Close(); err != nil {
			t.Error(err)
		}
		if err := transport.Close(); err != nil {
			t.Error(err)
		}
	})
	return transport, peer, observed.started
}

func TestPipeTransportCancelWaitingWriterPreservesConnection(t *testing.T) {
	transport, peer, started := newBlockingTransport(t, testWriteTimeout)
	first := make(chan error, 1)
	go func() { first <- transport.WriteJSON(t.Context(), map[string]int{"id": 1}) }()
	<-started
	ctx, cancel := context.WithCancel(t.Context())
	cancel()
	if err := transport.WriteJSON(ctx, map[string]int{"id": 2}); !errors.Is(err, context.Canceled) {
		t.Fatalf("queued write cancellation = %v", err)
	}
	payload, err := peer.ReadMessage()
	if err != nil || string(payload) != `{"id":1}` {
		t.Fatalf("active write was interrupted: %q, %v", payload, err)
	}
	if err := <-first; err != nil {
		t.Fatal(err)
	}
}

func TestPipeTransportFinishesFrameAfterCancellation(t *testing.T) {
	transport, peer, started := newBlockingTransport(t, testWriteTimeout)
	ctx, cancel := context.WithCancel(t.Context())
	result := make(chan error, 1)
	go func() { result <- transport.WriteJSON(ctx, map[string]int{"id": 1}) }()
	// The write is blocked mid-frame until the peer reads, cancel before it does
	<-started
	cancel()
	if payload, err := peer.ReadMessage(); err != nil || string(payload) != `{"id":1}` {
		t.Fatalf("canceled frame was truncated: %q, %v", payload, err)
	}
	if err := <-result; err != nil {
		t.Fatalf("canceled frame did not finish: %v", err)
	}
	go func() { result <- transport.WriteJSON(t.Context(), map[string]int{"id": 2}) }()
	if payload, err := peer.ReadMessage(); err != nil || string(payload) != `{"id":2}` {
		t.Fatalf("connection is unusable after a canceled frame: %q, %v", payload, err)
	}
	if err := <-result; err != nil {
		t.Fatal(err)
	}
}

func TestPipeTransportClosesStuckWrite(t *testing.T) {
	transport, peer, _ := newBlockingTransport(t, 10*time.Millisecond)
	// Nobody reads, so the frame can't be written
	if err := transport.WriteJSON(t.Context(), map[string]int{"id": 1}); !errors.Is(err, io.ErrClosedPipe) {
		t.Fatalf("stuck write = %v", err)
	}
	if _, err := peer.ReadMessage(); !errors.Is(err, io.EOF) {
		t.Fatalf("peer read after stuck write = %v", err)
	}
}
