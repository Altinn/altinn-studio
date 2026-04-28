package ui

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"os"
	"strings"
	"time"

	"altinn.studio/studioctl/internal/osutil"

	"golang.org/x/term"
)

// ErrInterrupted is returned when user aborts with Ctrl+C.
var ErrInterrupted = errors.New("interrupted")

var errFDOverflow = errors.New("file descriptor overflow")

// Control characters for terminal input.
const (
	ctrlC      = 3   // Ctrl+C (ETX)
	ctrlD      = 4   // Ctrl+D (EOT)
	esc        = 27  // Escape
	backspaceB = 8   // Backspace (BS)
	cr         = 13  // Carriage return
	lf         = 10  // Line feed
	backspaceD = 127 // Delete (often backspace on modern terminals)

	// Keep this short so cancellation responds quickly without busy-waiting.
	inputReadDeadline = 50 * time.Millisecond

	bracketedPasteStart = "\x1b[200~"
	bracketedPasteEnd   = "\x1b[201~"
)

// ReadPassword reads a password from stdin with echo disabled.
// Supports context cancellation and Ctrl+C detection.
// Terminal state is always restored, even on interrupt.
func ReadPassword(ctx context.Context, out *Output) ([]byte, error) {
	if !stdinIsTerminal() {
		return ReadLine(ctx, os.Stdin)
	}

	cleanup, err := makeRawStdin(out)
	if err != nil {
		return nil, err
	}
	defer cleanup()

	return readPasswordBytes(ctx, os.Stdin)
}

// InteractiveInput returns input suitable for interactive prompts.
func InteractiveInput() (io.Reader, func() error, error) {
	if stdinIsTerminal() {
		return os.Stdin, func() error { return nil }, nil
	}

	input, cleanup, err := osutil.OpenTerminalInput()
	if err != nil {
		return nil, nil, fmt.Errorf("open interactive input: %w", err)
	}
	return input, cleanup, nil
}

func makeRawStdin(out *Output) (func(), error) {
	fd, ok := fdInt(os.Stdin)
	if !ok {
		return nil, fmt.Errorf("stdin file descriptor: %w", errFDOverflow)
	}

	oldState, err := term.MakeRaw(fd)
	if err != nil {
		return nil, fmt.Errorf("set raw mode: %w", err)
	}

	return func() {
		if restoreErr := term.Restore(fd, oldState); restoreErr != nil && out != nil {
			out.Verbosef("failed to restore terminal: %v", restoreErr)
		}
	}, nil
}

// ReadLine reads one line from r.
// Context cancellation is honored while waiting for input when r supports read deadlines.
func ReadLine(ctx context.Context, r io.Reader) ([]byte, error) {
	line := make([]byte, 0, 128)

	setReadDeadline, supportsDeadline := setupReadDeadline(r)
	defer clearReadDeadline(setReadDeadline, supportsDeadline)

	for {
		if err := waitForInput(ctx, setReadDeadline, supportsDeadline); err != nil {
			return nil, err
		}

		b, err := readByte(r)
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
	input := newPasswordInput()

	setReadDeadline, supportsDeadline := setupReadDeadline(r)
	defer clearReadDeadline(setReadDeadline, supportsDeadline)

	for {
		if err := waitForInput(ctx, setReadDeadline, supportsDeadline); err != nil {
			return nil, err
		}

		b, err := readByte(r)
		if err != nil {
			if isReadTimeout(err) {
				continue
			}
			if errors.Is(err, io.EOF) {
				return input.finish()
			}
			return nil, fmt.Errorf("read password byte: %w", err)
		}

		done, applyErr := input.write(b)
		if applyErr != nil {
			return nil, applyErr
		}
		if done {
			return input.password, nil
		}
	}
}

func readByte(r io.Reader) (byte, error) {
	var buf [1]byte
	n, err := r.Read(buf[:])
	if n == 1 {
		return buf[0], nil
	}
	if err != nil {
		return 0, fmt.Errorf("read byte: %w", err)
	}
	return 0, io.ErrNoProgress
}

type passwordInput struct {
	password         []byte
	escapeSequence   []byte
	inBracketedPaste bool
	finishAfterPaste bool
}

func newPasswordInput() passwordInput {
	return passwordInput{
		password:         make([]byte, 0, 64),
		escapeSequence:   make([]byte, 0, len(bracketedPasteStart)),
		inBracketedPaste: false,
		finishAfterPaste: false,
	}
}

func (p *passwordInput) finish() ([]byte, error) {
	if len(p.escapeSequence) == 0 {
		return p.password, nil
	}
	if _, err := p.applyBytes(p.escapeSequence); err != nil {
		return nil, err
	}
	return p.password, nil
}

func (p *passwordInput) write(b byte) (bool, error) {
	if len(p.escapeSequence) > 0 || b == esc {
		return p.writeEscapeCandidate(b)
	}
	return p.applyByte(b)
}

func (p *passwordInput) writeEscapeCandidate(b byte) (bool, error) {
	p.escapeSequence = append(p.escapeSequence, b)
	sequence := string(p.escapeSequence)

	switch {
	case sequence == bracketedPasteStart:
		p.inBracketedPaste = true
		p.finishAfterPaste = false
		p.clearEscapeSequence()
		return false, nil
	case sequence == bracketedPasteEnd:
		p.inBracketedPaste = false
		p.clearEscapeSequence()
		return p.finishAfterPaste, nil
	case strings.HasPrefix(bracketedPasteStart, sequence) ||
		strings.HasPrefix(bracketedPasteEnd, sequence):
		return false, nil
	default:
		return p.flushEscapeSequence()
	}
}

func (p *passwordInput) clearEscapeSequence() {
	p.escapeSequence = p.escapeSequence[:0]
}

func (p *passwordInput) flushEscapeSequence() (bool, error) {
	sequence := p.escapeSequence
	defer p.clearEscapeSequence()
	return p.applyBytes(sequence)
}

func (p *passwordInput) applyBytes(data []byte) (bool, error) {
	for _, b := range data {
		done, err := p.applyByte(b)
		if done || err != nil {
			return done, err
		}
	}
	return false, nil
}

func (p *passwordInput) applyByte(b byte) (bool, error) {
	if p.finishAfterPaste {
		return false, nil
	}
	if p.inBracketedPaste {
		if b == cr || b == lf {
			p.finishAfterPaste = true
			return false, nil
		}
		p.password = append(p.password, b)
		return false, nil
	}
	if b == ctrlC {
		return false, ErrInterrupted
	}

	switch b {
	case ctrlD, cr, lf:
		return true, nil
	case backspaceB, backspaceD:
		if n := len(p.password); n > 0 {
			p.password = p.password[:n-1]
		}
	default:
		p.password = append(p.password, b)
	}
	return false, nil
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
