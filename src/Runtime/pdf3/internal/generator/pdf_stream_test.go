package generator

import (
	"context"
	"encoding/base64"
	"errors"
	"log/slog"
	"testing"

	"altinn.studio/pdf3/internal/cdp"
)

var errCloseFailed = errors.New("close failed")

// closeFailingStream answers IO.read with its chunks in order and fails IO.close.
type closeFailingStream struct {
	chunks []map[string]any
}

func (f *closeFailingStream) SendCommand(_ context.Context, method string, _ any) (*cdp.CDPMessage, error) {
	if method == "IO.close" {
		return nil, errCloseFailed
	}
	chunk := f.chunks[0]
	f.chunks = f.chunks[1:]
	return &cdp.CDPMessage{Result: chunk}, nil
}

func (f *closeFailingStream) SendCommandBatch(context.Context, []cdp.Command) []*cdp.CommandResponse {
	panic("not used")
}

// Every e2e test reads its PDF from a real stream. This covers what they can't: a PDF that was read
// completely is returned even if closing the stream fails, since disposing the context releases it.
func TestReadPDFStreamIgnoresCloseFailure(t *testing.T) {
	encode := base64.StdEncoding.EncodeToString
	stream := &closeFailingStream{chunks: []map[string]any{
		{"base64Encoded": true, "data": encode([]byte("%PDF-1.7 ")), "eof": false},
		{"base64Encoded": true, "data": encode([]byte("body")), "eof": true},
	}}
	printed := &cdp.CDPMessage{Result: map[string]any{"stream": "stream-1"}}

	pdf, err := readPDFStream(t.Context(), slog.New(slog.DiscardHandler), stream, printed)
	if err != nil || string(pdf) != "%PDF-1.7 body" {
		t.Fatalf("readPDFStream() = %q, %v", pdf, err)
	}
}
