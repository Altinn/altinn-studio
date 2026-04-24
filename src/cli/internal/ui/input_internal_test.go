package ui

import (
	"context"
	"errors"
	"io"
	"net"
	"strings"
	"testing"
	"time"
)

func TestReadLine_TrimsCRLF(t *testing.T) {
	t.Parallel()

	data, err := ReadLine(context.Background(), strings.NewReader("token\r\n"))
	if err != nil {
		t.Fatalf("ReadLine() error = %v", err)
	}
	if got, want := string(data), "token"; got != want {
		t.Fatalf("ReadLine() = %q, want %q", got, want)
	}
}

func TestReadLine_CancelDoesNotLeaveReaderBehind(t *testing.T) {
	t.Parallel()
	assertCancelDoesNotLeaveReaderBehind(
		t,
		ReadLine,
		"ReadLine",
	)
}

func TestReadLine_DoesNotReadPastNewline(t *testing.T) {
	t.Parallel()

	reader := strings.NewReader("token\nnext\n")

	data, err := ReadLine(context.Background(), reader)
	if err != nil {
		t.Fatalf("ReadLine() error = %v", err)
	}
	if got, want := string(data), "token"; got != want {
		t.Fatalf("ReadLine() = %q, want %q", got, want)
	}

	remaining, err := io.ReadAll(reader)
	if err != nil {
		t.Fatalf("ReadAll() error = %v", err)
	}
	if got, want := string(remaining), "next\n"; got != want {
		t.Fatalf("remaining input = %q, want %q", got, want)
	}
}

func TestReadPasswordBytes_HandlesControlInput(t *testing.T) {
	t.Parallel()

	data, err := readPasswordBytes(context.Background(), strings.NewReader("abc\x08d\n"))
	if err != nil {
		t.Fatalf("readPasswordBytes() error = %v", err)
	}
	if got, want := string(data), "abd"; got != want {
		t.Fatalf("readPasswordBytes() = %q, want %q", got, want)
	}
}

func TestReadPasswordBytes_StripsBracketedPasteMarkers(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		in   string
		want string
	}{
		{
			name: "pasted token",
			in:   "\x1b[200~secret\x1b[201~\n",
			want: "secret",
		},
		{
			name: "pasted token with trailing newline",
			in:   "\x1b[200~secret\n\x1b[201~",
			want: "secret",
		},
		{
			name: "pasted ctrl c is data",
			in:   "\x1b[200~sec\x03ret\n\x1b[201~",
			want: "sec\x03ret",
		},
		{
			name: "escape sequence is kept when not bracketed paste",
			in:   "sec\x1b[31mret\n",
			want: "sec\x1b[31mret",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()

			data, err := readPasswordBytes(context.Background(), strings.NewReader(test.in))
			if err != nil {
				t.Fatalf("readPasswordBytes() error = %v", err)
			}
			if got := string(data); got != test.want {
				t.Fatalf("readPasswordBytes() = %q, want %q", got, test.want)
			}
		})
	}
}

func TestReadPasswordBytes_DoesNotReadPastBracketedPasteEnd(t *testing.T) {
	t.Parallel()

	reader := strings.NewReader("\x1b[200~secret\n\x1b[201~next\n")

	data, err := readPasswordBytes(context.Background(), reader)
	if err != nil {
		t.Fatalf("readPasswordBytes() error = %v", err)
	}
	if got, want := string(data), "secret"; got != want {
		t.Fatalf("readPasswordBytes() = %q, want %q", got, want)
	}

	remaining, err := io.ReadAll(reader)
	if err != nil {
		t.Fatalf("ReadAll() error = %v", err)
	}
	if got, want := string(remaining), "next\n"; got != want {
		t.Fatalf("remaining input = %q, want %q", got, want)
	}
}

func TestReadPasswordBytes_CancelDoesNotLeaveReaderBehind(t *testing.T) {
	t.Parallel()
	assertCancelDoesNotLeaveReaderBehind(
		t,
		readPasswordBytes,
		"readPasswordBytes",
	)
}

func assertCancelDoesNotLeaveReaderBehind(
	t *testing.T,
	readFn func(context.Context, io.Reader) ([]byte, error),
	label string,
) {
	t.Helper()

	server, client := net.Pipe()
	registerConnCleanup(t, server, "server")
	registerConnCleanup(t, client, "client")

	ctx, cancel := context.WithCancel(context.Background())
	go func() {
		time.Sleep(20 * time.Millisecond)
		cancel()
	}()

	data, err := readFn(ctx, server)
	if !errors.Is(err, ErrInterrupted) {
		t.Fatalf("%s() err = %v, want %v", label, err, ErrInterrupted)
	}
	if len(data) != 0 {
		t.Fatalf("%s() data = %q, want empty on interrupt", label, string(data))
	}

	writeDone := make(chan error, 1)
	go func() {
		_, writeErr := io.WriteString(client, "next\n")
		writeDone <- writeErr
	}()

	select {
	case writeErr := <-writeDone:
		t.Fatalf("write completed before second read started: %v", writeErr)
	case <-time.After(100 * time.Millisecond):
		// Expected when no stale reader is still consuming input.
	}

	nextCtx, nextCancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer nextCancel()

	next, nextErr := readFn(nextCtx, server)
	if nextErr != nil {
		t.Fatalf("second %s() error = %v", label, nextErr)
	}
	if got, want := string(next), "next"; got != want {
		t.Fatalf("second %s() = %q, want %q", label, got, want)
	}

	select {
	case writeErr := <-writeDone:
		if writeErr != nil {
			t.Fatalf("write error = %v", writeErr)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("write did not complete")
	}
}

func registerConnCleanup(t *testing.T, conn net.Conn, name string) {
	t.Helper()
	t.Cleanup(func() {
		if err := conn.Close(); err != nil {
			t.Errorf("close %s: %v", name, err)
		}
	})
}
