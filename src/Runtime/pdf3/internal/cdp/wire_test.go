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
	transport := newPipeTransport(reader, writer)
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

func TestPipeTransportRejectsOversizedMessages(t *testing.T) {
	reader := io.NopCloser(strings.NewReader(strings.Repeat("a", maxPipeMessageSize+1)))
	transport := newPipeTransport(reader, &bufferWriteCloser{})
	if _, err := transport.ReadMessage(); !errors.Is(err, errPipeMessageTooLarge) {
		t.Fatalf("oversized read = %v", err)
	}
	if err := transport.WriteJSON(
		t.Context(),
		strings.Repeat("b", maxPipeMessageSize),
	); !errors.Is(
		err,
		errPipeMessageTooLarge,
	) {
		t.Fatalf("oversized write = %v", err)
	}
}

func TestPipeTransportRejectsTruncatedFrame(t *testing.T) {
	transport := newPipeTransport(io.NopCloser(strings.NewReader(`{"id":1}`)), &bufferWriteCloser{})
	if _, err := transport.ReadMessage(); !errors.Is(err, io.EOF) {
		t.Fatalf("truncated frame read = %v", err)
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

func TestPipeTransportCancelBlockedWrite(t *testing.T) {
	reader, writer := io.Pipe()
	observed := &observedWriter{WriteCloser: writer, started: make(chan struct{})}
	transport := newPipeTransport(io.NopCloser(strings.NewReader("")), observed)
	t.Cleanup(func() {
		if err := reader.Close(); err != nil {
			t.Error(err)
		}
		if err := transport.Close(); err != nil {
			t.Error(err)
		}
	})
	ctx, cancel := context.WithCancel(t.Context())
	defer cancel()
	result := make(chan error, 1)
	go func() { result <- transport.WriteJSON(ctx, map[string]int{"id": 1}) }()
	<-observed.started
	cancel()
	select {
	case err := <-result:
		if !errors.Is(err, context.Canceled) {
			t.Fatalf("blocked write cancellation = %v", err)
		}
	case <-time.After(time.Second):
		t.Fatal("blocked write did not respond to cancellation")
	}
}

func TestPipeTransportCancelWaitingWriterPreservesConnection(t *testing.T) {
	reader, writer := io.Pipe()
	observed := &observedWriter{WriteCloser: writer, started: make(chan struct{})}
	transport := newPipeTransport(io.NopCloser(strings.NewReader("")), observed)
	t.Cleanup(func() {
		if err := reader.Close(); err != nil {
			t.Error(err)
		}
		if err := transport.Close(); err != nil {
			t.Error(err)
		}
	})
	first := make(chan error, 1)
	go func() { first <- transport.WriteJSON(t.Context(), map[string]int{"id": 1}) }()
	<-observed.started
	ctx, cancel := context.WithCancel(t.Context())
	cancel()
	if err := transport.WriteJSON(ctx, map[string]int{"id": 2}); !errors.Is(err, context.Canceled) {
		t.Fatalf("queued write cancellation = %v", err)
	}
	peer := newPipeTransport(reader, &bufferWriteCloser{})
	payload, err := peer.ReadMessage()
	if err != nil || string(payload) != `{"id":1}` {
		t.Fatalf("active write was interrupted: %q, %v", payload, err)
	}
	if err := <-first; err != nil {
		t.Fatal(err)
	}
}

func TestPipeTransportFinishesFrameAfterCancellation(t *testing.T) {
	reader, writer := io.Pipe()
	observed := &observedWriter{WriteCloser: writer, started: make(chan struct{})}
	transport := newPipeTransport(io.NopCloser(strings.NewReader("")), observed)
	t.Cleanup(func() {
		if err := reader.Close(); err != nil {
			t.Error(err)
		}
		if err := transport.Close(); err != nil {
			t.Error(err)
		}
	})
	ctx, cancel := context.WithCancel(t.Context())
	defer cancel()
	result := make(chan error, 1)
	go func() { result <- transport.WriteJSON(ctx, map[string]int{"id": 1}) }()
	<-observed.started
	cancel()
	peer := newPipeTransport(reader, &bufferWriteCloser{})
	if payload, err := peer.ReadMessage(); err != nil || string(payload) != `{"id":1}` {
		t.Fatalf("canceled frame was truncated: %q, %v", payload, err)
	}
	if err := <-result; err != nil {
		t.Fatalf("canceled frame did not finish: %v", err)
	}
	// Give the cancellation callback time to run: it must not close a pipe whose
	// frame completed successfully.
	time.Sleep(300 * time.Millisecond)
	go func() { result <- transport.WriteJSON(t.Context(), map[string]int{"id": 2}) }()
	if payload, err := peer.ReadMessage(); err != nil || string(payload) != `{"id":2}` {
		t.Fatalf("completed frame cancellation closed connection: %q, %v", payload, err)
	}
	if err := <-result; err != nil {
		t.Fatal(err)
	}
}
