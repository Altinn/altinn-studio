// Package ui provides terminal UI components for studioctl.
package ui

import (
	"fmt"
	"io"
	"os"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// Colors checks if color output is enabled.
func Colors() bool {
	return os.Getenv("NO_COLOR") == ""
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
	debug   bool
}

// NewOutput creates a new Output instance.
func NewOutput(out, errOut io.Writer, verbose, debug bool) *Output {
	return &Output{
		out:     out,
		err:     errOut,
		verbose: verbose,
		debug:   debug,
	}
}

// DefaultOutput returns an Output configured for stdout/stderr.
func DefaultOutput(verbose, debug bool) *Output {
	return NewOutput(os.Stdout, os.Stderr, verbose, debug)
}

// Print writes a message to stdout.
func (o *Output) Print(msg string) {
	if _, err := fmt.Fprint(o.out, msg); err != nil {
		o.logWriteErr(err)
	}
}

// Println writes a message to stdout with a newline.
func (o *Output) Println(msg string) {
	if _, err := fmt.Fprintln(o.out, msg); err != nil {
		o.logWriteErr(err)
	}
}

// Printf writes a formatted message to stdout.
func (o *Output) Printf(format string, args ...any) {
	if _, err := fmt.Fprintf(o.out, format, args...); err != nil {
		o.logWriteErr(err)
	}
}

// Error writes an error message to stderr.
func (o *Output) Error(msg string) {
	if Colors() {
		msg = errorStyle().Render(msg)
	}
	if _, err := fmt.Fprintln(o.err, msg); err != nil {
		o.logWriteErr(err)
	}
}

// Errorf writes a formatted error message to stderr.
func (o *Output) Errorf(format string, args ...any) {
	o.Error(fmt.Sprintf(format, args...))
}

// Warning writes a warning message to stderr.
func (o *Output) Warning(msg string) {
	if Colors() {
		msg = warningStyle().Render(msg)
	}
	if _, err := fmt.Fprintln(o.err, msg); err != nil {
		o.logWriteErr(err)
	}
}

// Warningf writes a formatted warning message to stderr.
func (o *Output) Warningf(format string, args ...any) {
	o.Warning(fmt.Sprintf(format, args...))
}

// Success writes a success message to stdout.
func (o *Output) Success(msg string) {
	if Colors() {
		msg = successStyle().Render(msg)
	}
	if _, err := fmt.Fprintln(o.out, msg); err != nil {
		o.logWriteErr(err)
	}
}

// Successf writes a formatted success message to stdout.
func (o *Output) Successf(format string, args ...any) {
	o.Success(fmt.Sprintf(format, args...))
}

// Info writes an info message to stdout.
func (o *Output) Info(msg string) {
	if Colors() {
		msg = infoStyle().Render(msg)
	}
	if _, err := fmt.Fprintln(o.out, msg); err != nil {
		o.logWriteErr(err)
	}
}

// Infof writes a formatted info message to stdout.
func (o *Output) Infof(format string, args ...any) {
	o.Info(fmt.Sprintf(format, args...))
}

// Verbose writes a message only if verbose mode is enabled.
func (o *Output) Verbose(msg string) {
	if o.verbose {
		if Colors() {
			msg = dimStyle().Render(msg)
		}
		if _, err := fmt.Fprintln(o.out, msg); err != nil {
			o.logWriteErr(err)
		}
	}
}

// Verbosef writes a formatted message only if verbose mode is enabled.
func (o *Output) Verbosef(format string, args ...any) {
	o.Verbose(fmt.Sprintf(format, args...))
}

// Debug writes a message only if debug mode is enabled.
func (o *Output) Debug(msg string) {
	if o.debug {
		if Colors() {
			msg = dimStyle().Render("[debug] " + msg)
		} else {
			msg = "[debug] " + msg
		}
		// Cannot recursively log debug errors - just check and ignore
		if _, err := fmt.Fprintln(o.err, msg); err != nil {
			return
		}
	}
}

// Debugf writes a formatted message only if debug mode is enabled.
func (o *Output) Debugf(format string, args ...any) {
	o.Debug(fmt.Sprintf(format, args...))
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

// Table renders a simple key-value table.
func (o *Output) Table(rows [][]string) {
	if len(rows) == 0 {
		return
	}

	// Find max width for each column
	maxWidths := make([]int, len(rows[0]))
	for _, row := range rows {
		for i, cell := range row {
			if i < len(maxWidths) && len(cell) > maxWidths[i] {
				maxWidths[i] = len(cell)
			}
		}
	}

	// Print rows
	for _, row := range rows {
		var parts []string
		for i, cell := range row {
			if i < len(maxWidths) {
				parts = append(parts, fmt.Sprintf("%-*s", maxWidths[i], cell))
			}
		}
		if _, err := fmt.Fprintln(o.out, strings.Join(parts, "  ")); err != nil {
			o.logWriteErr(err)
		}
	}
}

// Section provides formatted section output with configurable layout.
type Section struct {
	out      *Output
	keyWidth int
}

// NewSection creates a Section with the specified key column width.
func (o *Output) NewSection(keyWidth int) *Section {
	return &Section{out: o, keyWidth: keyWidth}
}

// Header prints a styled section header.
func (s *Section) Header(title string) {
	if Colors() {
		title = lipgloss.NewStyle().Bold(true).Render(title)
	}
	if _, err := fmt.Fprintln(s.out.out, title); err != nil {
		s.out.logWriteErr(err)
	}
}

// KeyValue prints a key-value pair with consistent column width.
func (s *Section) KeyValue(key, value string) {
	// Pad before styling so ANSI codes don't affect alignment
	paddedKey := fmt.Sprintf("%-*s", s.keyWidth, key)
	if Colors() {
		paddedKey = dimStyle().Render(paddedKey)
	}
	if _, err := fmt.Fprintf(s.out.out, "  %s  %s\n", paddedKey, value); err != nil {
		s.out.logWriteErr(err)
	}
}

// KeyValueStatus prints a key-value pair with a status icon prefix.
func (s *Section) KeyValueStatus(ok bool, key, value string) {
	icon := "✓"
	if !ok {
		icon = "✗"
	}
	// Pad before styling so ANSI codes don't affect alignment
	paddedKey := fmt.Sprintf("%-*s", s.keyWidth, key)
	if Colors() {
		if ok {
			icon = successStyle().Render(icon)
		} else {
			icon = errorStyle().Render(icon)
		}
		paddedKey = dimStyle().Render(paddedKey)
	}
	if _, err := fmt.Fprintf(s.out.out, "  %s %s  %s\n", icon, paddedKey, value); err != nil {
		s.out.logWriteErr(err)
	}
}

// logWriteErr logs a write error to stderr if debug mode is enabled.
// The logging itself cannot be recursively logged if it fails.
func (o *Output) logWriteErr(err error) {
	if o.debug {
		//nolint:errcheck // final fallback: if debug logging itself fails, no recovery possible
		fmt.Fprintf(o.err, "[debug] write error: %v\n", err)
	}
}
