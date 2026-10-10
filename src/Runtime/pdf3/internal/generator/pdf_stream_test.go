package generator

import (
	"context"
	"encoding/base64"
	"errors"
	"log/slog"
	"testing"

	"altinn.studio/pdf3/internal/cdp"
)

var errFakeCommand = errors.New("fake command failed")

// fakeStream answers IO.read with the given chunks and records the commands it receives.
type fakeStream struct {
	failAt  string
	chunks  []map[string]any
	methods []string
}

func (f *fakeStream) SendCommand(_ context.Context, method string, params any) (*cdp.CDPResponse, error) {
	f.methods = append(f.methods, method)
	if method == f.failAt {
		return nil, errFakeCommand
	}
	p, ok := params.(map[string]any)
	if !ok || p["handle"] != "stream-1" {
		return nil, errFakeCommand
	}
	if method == "IO.close" {
		return &cdp.CDPResponse{Result: map[string]any{}}, nil
	}
	chunk := f.chunks[0]
	f.chunks = f.chunks[1:]
	return &cdp.CDPResponse{Result: chunk}, nil
}

func (f *fakeStream) SendCommandBatch(context.Context, []cdp.Command) []*cdp.CommandResponse {
	panic("not used")
}

func TestReadPDFStream(t *testing.T) {
	printed := &cdp.CDPResponse{Result: map[string]any{"data": "", "stream": "stream-1"}}
	encode := base64.StdEncoding.EncodeToString

	stream := &fakeStream{chunks: []map[string]any{
		{"base64Encoded": true, "data": encode([]byte("%PDF-1.7 ")), "eof": false},
		{"base64Encoded": false, "data": "body", "eof": false},
		{"base64Encoded": true, "data": "", "eof": true},
	}}
	pdf, err := readPDFStream(t.Context(), slog.Default(), stream, printed)
	if err != nil || string(pdf) != "%PDF-1.7 body" {
		t.Fatalf("readPDFStream() = %q, %v", pdf, err)
	}
	if len(stream.methods) != 4 || stream.methods[3] != "IO.close" {
		t.Fatalf("commands = %v, expected three reads and a close", stream.methods)
	}

	failing := &fakeStream{failAt: "IO.read"}
	if _, err := readPDFStream(t.Context(), slog.Default(), failing, printed); !errors.Is(err, errFakeCommand) {
		t.Fatalf("failed read = %v", err)
	}

	// A complete PDF is returned even if closing the stream fails
	closeFails := &fakeStream{failAt: "IO.close", chunks: []map[string]any{{"data": "%PDF", "eof": true}}}
	if pdf, err := readPDFStream(
		t.Context(),
		slog.Default(),
		closeFails,
		printed,
	); err != nil ||
		string(pdf) != "%PDF" {
		t.Fatalf("readPDFStream() with failing close = %q, %v", pdf, err)
	}

	missing := &cdp.CDPResponse{Result: map[string]any{"data": ""}}
	if _, err := readPDFStream(
		t.Context(),
		slog.Default(),
		&fakeStream{},
		missing,
	); !errors.Is(
		err,
		errMissingPDFStream,
	) {
		t.Fatalf("missing stream = %v", err)
	}
}
