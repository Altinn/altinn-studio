package generator

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"testing"

	"altinn.studio/pdf3/internal/cdp"
)

var errUnexpectedCommand = errors.New("unexpected command")

// fakeStream answers IO.read with its chunks in order, and fails any other command: the stream is
// left to the context's dispose, so that nothing delays the response.
type fakeStream struct {
	chunks []map[string]any
}

func (f *fakeStream) SendCommand(_ context.Context, method string, _ any) (*cdp.CDPMessage, error) {
	if method != "IO.read" {
		return nil, fmt.Errorf("%w: %s", errUnexpectedCommand, method)
	}
	chunk := f.chunks[0]
	f.chunks = f.chunks[1:]
	return &cdp.CDPMessage{Result: chunk}, nil
}

func (f *fakeStream) SendCommandBatch(context.Context, []cdp.Command) []*cdp.CommandResponse {
	panic("not used")
}

func chunk(data string, eof bool) map[string]any {
	return map[string]any{"base64Encoded": true, "data": base64.StdEncoding.EncodeToString([]byte(data)), "eof": eof}
}

// Every e2e test reads its PDF from a real stream. These cover what they can't: a stream that
// misbehaves, a PDF over the size limit, and that reading sends nothing but IO.read.
func TestReadPDFStream(t *testing.T) {
	printed := &cdp.CDPMessage{Result: map[string]any{"stream": "stream-1"}}
	tests := []struct {
		wantErr error
		stream  *fakeStream
		name    string
		want    string
		maxSize int
	}{
		{
			name:    "chunks",
			stream:  &fakeStream{chunks: []map[string]any{chunk("%PDF-1.7 ", false), chunk("body", true)}},
			maxSize: 100,
			want:    "%PDF-1.7 body",
		},
		{
			name:    "stream stops advancing",
			stream:  &fakeStream{chunks: []map[string]any{chunk("%PDF", false), chunk("", false)}},
			maxSize: 100,
			wantErr: errStalledPDFStream,
		},
		{
			name:    "too large",
			stream:  &fakeStream{chunks: []map[string]any{chunk("%PDF-1.7 ", false), chunk("body", true)}},
			maxSize: 10,
			wantErr: errPDFTooLarge,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			pdf, err := readPDFStream(t.Context(), tt.stream, printed, tt.maxSize)
			if !errors.Is(err, tt.wantErr) || string(pdf) != tt.want {
				t.Fatalf("readPDFStream() = %q, %v; want %q, %v", pdf, err, tt.want, tt.wantErr)
			}
		})
	}
}
