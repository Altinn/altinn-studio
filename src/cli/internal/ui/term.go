package ui

import (
	"math"
	"os"

	"golang.org/x/term"
)

type fdWriter interface {
	Fd() uintptr
}

// StdinIsTerminal reports whether stdin is attached to an interactive terminal.
func StdinIsTerminal() bool {
	return isTerminalWriter(os.Stdin)
}

// StdoutIsTerminal reports whether stdout is attached to an interactive terminal.
func StdoutIsTerminal() bool {
	return isTerminalWriter(os.Stdout)
}

// IsTerminal reports whether the output target is attached to an interactive terminal.
func (o *Output) IsTerminal() bool {
	writer, ok := o.out.(fdWriter)
	if !ok {
		return false
	}
	return isTerminalWriter(writer)
}

// TerminalSize reports the terminal size for the output target.
func (o *Output) TerminalSize() (width, height int, ok bool) {
	writer, ok := o.out.(fdWriter)
	if !ok {
		return 0, 0, false
	}

	fd, ok := fdInt(writer)
	if !ok {
		return 0, 0, false
	}

	width, height, err := term.GetSize(fd)
	if err != nil || width <= 0 || height <= 0 {
		return 0, 0, false
	}

	return width, height, true
}

func isTerminalWriter(writer fdWriter) bool {
	fd, ok := fdInt(writer)
	if !ok {
		return false
	}
	return term.IsTerminal(fd)
}

func fdInt(writer fdWriter) (int, bool) {
	fd := writer.Fd()
	if fd > uintptr(math.MaxInt) {
		return 0, false
	}
	return int(fd), true
}
