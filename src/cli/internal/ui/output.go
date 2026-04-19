// Package ui provides terminal UI components for studioctl.
package ui

import (
	"fmt"
	"io"
	"os"
	"sync"

	"altinn.studio/studioctl/internal/osutil"

	"github.com/charmbracelet/lipgloss"
)

// Colors checks if color output is enabled.
func Colors() bool {
	_, noColor := os.LookupEnv("NO_COLOR")
	return !noColor
}

// Style functions return lipgloss styles for terminal output.
// Using functions instead of package-level vars to satisfy gochecknoglobals.
func errorStyle() lipgloss.Style   { return lipgloss.NewStyle().Foreground(lipgloss.Color("9")) }  // red
func warningStyle() lipgloss.Style { return lipgloss.NewStyle().Foreground(lipgloss.Color("11")) } // yellow
func successStyle() lipgloss.Style { return lipgloss.NewStyle().Foreground(lipgloss.Color("10")) } // green
func infoStyle() lipgloss.Style    { return lipgloss.NewStyle().Foreground(lipgloss.Color("12")) } // blue
func dimStyle() lipgloss.Style     { return lipgloss.NewStyle().Foreground(lipgloss.Color("8")) }  // gray

// containerColors returns colors for log output prefixes.
func containerColors() []lipgloss.Color {
	return []lipgloss.Color{
		lipgloss.Color("14"), // cyan
		lipgloss.Color("13"), // magenta
		lipgloss.Color("11"), // yellow
		lipgloss.Color("10"), // green
		lipgloss.Color("12"), // blue
		lipgloss.Color("9"),  // red
	}
}

// Output provides structured output to the terminal.
type Output struct {
	out     io.Writer
	err     io.Writer
	verbose bool
	mu      sync.Mutex
}

type fdWriter interface {
	Fd() uintptr
}

// NewOutput creates a new Output instance.
func NewOutput(out, errOut io.Writer, verbose bool) *Output {
	return &Output{
		out:     out,
		err:     errOut,
		verbose: verbose,
		mu:      sync.Mutex{},
	}
}

// DefaultOutput returns an Output configured for stdout/stderr.
func DefaultOutput(verbose bool) *Output {
	return NewOutput(os.Stdout, os.Stderr, verbose)
}

// Print writes a message to stdout.
func (o *Output) Print(msg string) {
	err := o.write(o.out, msg, false)
	if err != nil {
		o.logWriteErr(err)
	}
}

// Println writes a message to stdout with a newline.
func (o *Output) Println(msg string) {
	err := o.write(o.out, msg, true)
	if err != nil {
		o.logWriteErr(err)
	}
}

// Printf writes a formatted message to stdout.
func (o *Output) Printf(format string, args ...any) {
	err := o.write(o.out, fmt.Sprintf(format, args...), false)
	if err != nil {
		o.logWriteErr(err)
	}
}

// Printlnf writes a formatted message to stdout with a newline.
func (o *Output) Printlnf(format string, args ...any) {
	err := o.write(o.out, fmt.Sprintf(format, args...), true)
	if err != nil {
		o.logWriteErr(err)
	}
}

// FD returns the stdout file descriptor when the underlying writer exposes one.
func (o *Output) FD() (int, bool) {
	writer, ok := o.out.(fdWriter)
	if !ok {
		return 0, false
	}
	return osutil.FDInt(writer.Fd())
}

// Error writes an error message to stderr.
func (o *Output) Error(msg string) {
	if Colors() {
		msg = errorStyle().Render(msg)
	}
	err := o.write(o.err, msg, true)
	if err != nil {
		o.logWriteErr(err)
	}
}

// Errorf writes a formatted error message to stderr.
func (o *Output) Errorf(format string, args ...any) {
	o.Error(fmt.Sprintf(format, args...))
}

// Errorlnf writes a formatted error message to stderr with a newline.
func (o *Output) Errorlnf(format string, args ...any) {
	o.Error(fmt.Sprintf(format, args...))
}

// Warning writes a warning message to stderr.
func (o *Output) Warning(msg string) {
	if Colors() {
		msg = warningStyle().Render(msg)
	}
	err := o.write(o.err, msg, true)
	if err != nil {
		o.logWriteErr(err)
	}
}

// Warningf writes a formatted warning message to stderr.
func (o *Output) Warningf(format string, args ...any) {
	o.Warning(fmt.Sprintf(format, args...))
}

// Warninglnf writes a formatted warning message to stderr with a newline.
func (o *Output) Warninglnf(format string, args ...any) {
	o.Warning(fmt.Sprintf(format, args...))
}

// Success writes a success message to stdout.
func (o *Output) Success(msg string) {
	if Colors() {
		msg = successStyle().Render(msg)
	}
	err := o.write(o.out, msg, true)
	if err != nil {
		o.logWriteErr(err)
	}
}

// Successf writes a formatted success message to stdout.
func (o *Output) Successf(format string, args ...any) {
	o.Success(fmt.Sprintf(format, args...))
}

// Successlnf writes a formatted success message to stdout with a newline.
func (o *Output) Successlnf(format string, args ...any) {
	o.Success(fmt.Sprintf(format, args...))
}

// Info writes an info message to stdout.
func (o *Output) Info(msg string) {
	if Colors() {
		msg = infoStyle().Render(msg)
	}
	err := o.write(o.out, msg, true)
	if err != nil {
		o.logWriteErr(err)
	}
}

// Infof writes a formatted info message to stdout.
func (o *Output) Infof(format string, args ...any) {
	o.Info(fmt.Sprintf(format, args...))
}

// Infolnf writes a formatted info message to stdout with a newline.
func (o *Output) Infolnf(format string, args ...any) {
	o.Info(fmt.Sprintf(format, args...))
}

// Verbose writes a message to stderr only if verbose mode is enabled.
func (o *Output) Verbose(msg string) {
	if o.verbose {
		if Colors() {
			msg = dimStyle().Render(msg)
		}
		err := o.write(o.err, msg, true)
		if err != nil {
			o.logWriteErr(err)
		}
	}
}

// Verbosef writes a formatted message only if verbose mode is enabled.
func (o *Output) Verbosef(format string, args ...any) {
	o.Verbose(fmt.Sprintf(format, args...))
}

// Verboselnf writes a formatted message only if verbose mode is enabled, with a newline.
func (o *Output) Verboselnf(format string, args ...any) {
	o.Verbose(fmt.Sprintf(format, args...))
}

// ContainerPrefix returns a colored prefix for container log output.
func (o *Output) ContainerPrefix(name string, colorIndex int) string {
	if !Colors() {
		return fmt.Sprintf("%-20s | ", name)
	}

	colors := containerColors()
	color := colors[colorIndex%len(colors)]
	style := lipgloss.NewStyle().Foreground(color)
	return style.Render(fmt.Sprintf("%-20s", name)) + " | "
}

func (o *Output) write(target io.Writer, msg string, newline bool) error {
	o.mu.Lock()
	defer o.mu.Unlock()

	if newline {
		msg += osutil.LineBreak
	}

	_, err := io.WriteString(target, msg)
	if err != nil {
		return fmt.Errorf("write output: %w", err)
	}
	return nil
}

// logWriteErr logs a write error to stderr if verbose mode is enabled.
// The logging itself cannot be recursively logged if it fails.
func (o *Output) logWriteErr(err error) {
	if o.verbose {
		o.mu.Lock()
		defer o.mu.Unlock()
		//nolint:errcheck // final fallback: if debug logging itself fails, no recovery possible
		fmt.Fprintf(o.err, "[verbose] write error: %v%s", err, osutil.LineBreak)
	}
}
