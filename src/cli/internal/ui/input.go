package ui

import (
	"bufio"
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"

	"golang.org/x/term"
)

// ErrInterrupted is returned when user aborts with Ctrl+C.
var ErrInterrupted = errors.New("interrupted")

// Control characters for terminal input.
const (
	ctrlC      = 3   // Ctrl+C (ETX)
	ctrlD      = 4   // Ctrl+D (EOT)
	backspaceB = 8   // Backspace (BS)
	cr         = 13  // Carriage return
	lf         = 10  // Line feed
	backspaceD = 127 // Delete (often backspace on modern terminals)
)

// ReadPassword reads a password from stdin with echo disabled.
// Supports context cancellation and Ctrl+C detection.
// Terminal state is always restored, even on interrupt.
func ReadPassword(ctx context.Context, out *Output) ([]byte, error) {
	fd := int(os.Stdin.Fd())

	// Non-terminal: read line (for piped input)
	if !term.IsTerminal(fd) {
		return ReadLine(ctx, os.Stdin)
	}

	// Save terminal state and set raw mode
	oldState, err := term.MakeRaw(fd)
	if err != nil {
		return nil, fmt.Errorf("set raw mode: %w", err)
	}
	defer func() {
		if restoreErr := term.Restore(fd, oldState); restoreErr != nil {
			out.Debugf("failed to restore terminal: %v", restoreErr)
		}
	}()

	// Result channel for goroutine communication
	type result struct {
		err  error
		data []byte
	}
	ch := make(chan result, 1)

	go func() {
		var buf bytes.Buffer
		b := make([]byte, 1)
		for {
			n, readErr := os.Stdin.Read(b)
			if readErr != nil {
				ch <- result{err: readErr, data: nil}
				return
			}
			if n == 0 {
				continue
			}

			c := b[0]
			switch c {
			case ctrlC:
				ch <- result{err: ErrInterrupted, data: nil}
				return
			case ctrlD:
				// Ctrl+D: return what we have (EOF behavior)
				ch <- result{err: nil, data: buf.Bytes()}
				return
			case cr, lf:
				// Enter: return password
				ch <- result{err: nil, data: buf.Bytes()}
				return
			case backspaceB, backspaceD:
				// Backspace: remove last byte
				if buf.Len() > 0 {
					buf.Truncate(buf.Len() - 1)
				}
			default:
				buf.WriteByte(c)
			}
		}
	}()

	select {
	case <-ctx.Done():
		return nil, ErrInterrupted
	case r := <-ch:
		return r.data, r.err
	}
}

// ReadLine reads a line from r with context cancellation support.
func ReadLine(ctx context.Context, r io.Reader) ([]byte, error) {
	type result struct {
		err  error
		data []byte
	}
	ch := make(chan result, 1)

	go func() {
		reader := bufio.NewReader(r)
		line, err := reader.ReadString('\n')
		if err != nil && !errors.Is(err, io.EOF) {
			ch <- result{err: err, data: nil}
			return
		}
		ch <- result{err: nil, data: []byte(strings.TrimSuffix(line, "\n"))}
	}()

	select {
	case <-ctx.Done():
		return nil, ErrInterrupted
	case res := <-ch:
		return res.data, res.err
	}
}
