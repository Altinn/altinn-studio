package internal

import (
	"bufio"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
)

// ConfirmationPrompter prompts the user before mutating actions.
type ConfirmationPrompter interface {
	Confirm(action string, details []string) (bool, error)
}

// ConsolePrompter prompts on a terminal-like input/output pair.
type ConsolePrompter struct {
	out    io.Writer
	reader *bufio.Reader
}

// ConsolePrompterOption configures ConsolePrompter.
type ConsolePrompterOption func(*ConsolePrompter)

// WithPromptIO sets input/output streams for prompts.
func WithPromptIO(in io.Reader, out io.Writer) ConsolePrompterOption {
	return func(p *ConsolePrompter) {
		p.reader = bufio.NewReader(in)
		p.out = out
	}
}

// NewConsolePrompter returns a prompter that reads from stdin and writes to stdout.
func NewConsolePrompter(opts ...ConsolePrompterOption) *ConsolePrompter {
	p := &ConsolePrompter{
		out:    os.Stdout,
		reader: bufio.NewReader(os.Stdin),
	}
	for _, opt := range opts {
		opt(p)
	}
	return p
}

// Confirm prints action details and accepts only y/Y as approval.
func (p *ConsolePrompter) Confirm(action string, details []string) (bool, error) {
	if p == nil || p.reader == nil || p.out == nil {
		return false, errPromptIORequired
	}

	if _, err := fmt.Fprintf(p.out, "\nConfirm: %s\n", action); err != nil {
		return false, fmt.Errorf("write prompt header: %w", err)
	}
	for _, detail := range details {
		detail = strings.TrimSpace(detail)
		if detail == "" {
			continue
		}
		if _, err := fmt.Fprintf(p.out, "  %s\n", detail); err != nil {
			return false, fmt.Errorf("write prompt detail: %w", err)
		}
	}
	if _, err := fmt.Fprint(p.out, "Proceed? [y/N]: "); err != nil {
		return false, fmt.Errorf("write prompt footer: %w", err)
	}

	line, err := p.reader.ReadString('\n')
	if err != nil && !errors.Is(err, io.EOF) {
		return false, fmt.Errorf("read prompt response: %w", err)
	}

	return strings.EqualFold(strings.TrimSpace(line), "y"), nil
}
