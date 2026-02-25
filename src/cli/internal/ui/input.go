package ui

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"os"
	"time"

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

	// Keep this short so cancellation responds quickly without busy-waiting.
	inputReadDeadline = 50 * time.Millisecond
)

// ReadPassword reads a password from stdin with echo disabled.
// Supports context cancellation and Ctrl+C detection.
// Terminal state is always restored, even on interrupt.
func ReadPassword(ctx context.Context, out *Output) ([]byte, error) {
	fd := int(os.Stdin.Fd())

	if !term.IsTerminal(fd) {
		return ReadLine(ctx, os.Stdin)
	}

	oldState, err := term.MakeRaw(fd)
	if err != nil {
		return nil, fmt.Errorf("set raw mode: %w", err)
	}
	defer func() {
		if restoreErr := term.Restore(fd, oldState); restoreErr != nil {
			if out != nil {
				out.Verbosef("failed to restore terminal: %v", restoreErr)
			}
		}
	}()

	return readPasswordBytes(ctx, os.Stdin)
}

// ReadLine reads one line from r.
// Context cancellation is honored while waiting for input when r supports read deadlines.
func ReadLine(ctx context.Context, r io.Reader) ([]byte, error) {
	reader := bufio.NewReader(r)
	line := make([]byte, 0, 128)

	setReadDeadline, supportsDeadline := setupReadDeadline(r)
	defer clearReadDeadline(setReadDeadline, supportsDeadline)

	for {
		if err := waitForInput(ctx, setReadDeadline, supportsDeadline); err != nil {
			return nil, err
		}

		b, err := reader.ReadByte()
		if err != nil {
			if isReadTimeout(err) {
				continue
			}
			if errors.Is(err, io.EOF) {
				break
			}
			return nil, fmt.Errorf("read line byte: %w", err)
		}
		if b == '\n' {
			break
		}
		line = append(line, b)
	}

	if n := len(line); n > 0 && line[n-1] == '\r' {
		line = line[:n-1]
	}

	return line, nil
}

func readPasswordBytes(ctx context.Context, r io.Reader) ([]byte, error) {
	reader := bufio.NewReader(r)
	password := make([]byte, 0, 64)

	setReadDeadline, supportsDeadline := setupReadDeadline(r)
	defer clearReadDeadline(setReadDeadline, supportsDeadline)

	for {
		if err := waitForInput(ctx, setReadDeadline, supportsDeadline); err != nil {
			return nil, err
		}

		b, err := reader.ReadByte()
		if err != nil {
			if isReadTimeout(err) {
				continue
			}
			if errors.Is(err, io.EOF) {
				return password, nil
			}
			return nil, fmt.Errorf("read password byte: %w", err)
		}

		switch b {
		case ctrlC:
			return nil, ErrInterrupted
		case ctrlD:
			return password, nil
		case cr, lf:
			return password, nil
		case backspaceB, backspaceD:
			if n := len(password); n > 0 {
				password = password[:n-1]
			}
		default:
			password = append(password, b)
		}
	}
}

type readerWithDeadline interface {
	SetReadDeadline(t time.Time) error
}

func setupReadDeadline(r io.Reader) (func(time.Time) error, bool) {
	deadlineReader, supportsDeadline := r.(readerWithDeadline)
	if !supportsDeadline {
		return nil, false
	}
	// Validate deadline support once and avoid repeated setup errors in the read loop.
	if err := deadlineReader.SetReadDeadline(time.Time{}); err != nil {
		return nil, false
	}
	return deadlineReader.SetReadDeadline, true
}

func clearReadDeadline(setReadDeadline func(time.Time) error, supportsDeadline bool) {
	if !supportsDeadline {
		return
	}
	if err := setReadDeadline(time.Time{}); err != nil {
		return
	}
}

func waitForInput(ctx context.Context, setReadDeadline func(time.Time) error, supportsDeadline bool) error {
	if ctx.Err() != nil {
		return ErrInterrupted
	}
	if !supportsDeadline {
		return nil
	}
	if err := setReadDeadline(time.Now().Add(inputReadDeadline)); err != nil {
		return fmt.Errorf("set read deadline: %w", err)
	}
	return nil
}

func isReadTimeout(err error) bool {
	if errors.Is(err, os.ErrDeadlineExceeded) {
		return true
	}
	var netErr net.Error
	return errors.As(err, &netErr) && netErr.Timeout()
}
