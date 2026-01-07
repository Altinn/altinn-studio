package ui

import (
	"context"
	"fmt"
	"io"
	"os"
	"sync"
	"time"

	"github.com/charmbracelet/lipgloss"
)

const (
	// defaultSpinnerInterval is the default animation interval for the spinner.
	defaultSpinnerInterval = 80 * time.Millisecond
)

// spinnerFrames returns the animation frames for the spinner.
func spinnerFrames() []string {
	return []string{"⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"}
}

// Spinner provides a terminal spinner for long-running operations.
type Spinner struct {
	style    lipgloss.Style
	out      io.Writer
	done     chan struct{}
	message  string
	interval time.Duration
	mu       sync.Mutex
	running  bool
	debug    bool
}

// SpinnerOption configures a Spinner.
type SpinnerOption func(*Spinner)

// WithInterval sets the animation interval.
func WithInterval(d time.Duration) SpinnerOption {
	return func(s *Spinner) {
		s.interval = d
	}
}

// WithOutput sets the output writer.
func WithOutput(w io.Writer) SpinnerOption {
	return func(s *Spinner) {
		s.out = w
	}
}

// WithDebug enables debug logging for write errors.
func WithDebug(debug bool) SpinnerOption {
	return func(s *Spinner) {
		s.debug = debug
	}
}

// NewSpinner creates a new spinner with the given message.
func NewSpinner(message string, opts ...SpinnerOption) *Spinner {
	s := &Spinner{
		out:      os.Stdout,
		message:  message,
		interval: defaultSpinnerInterval,
		style:    lipgloss.NewStyle().Foreground(lipgloss.Color("12")), // blue
		done:     nil,                                                  // initialized on Start()
		mu:       sync.Mutex{},
		running:  false,
		debug:    false,
	}

	for _, opt := range opts {
		opt(s)
	}

	return s
}

// Start begins the spinner animation.
func (s *Spinner) Start() {
	s.mu.Lock()
	if s.running {
		s.mu.Unlock()
		return
	}
	s.running = true
	s.done = make(chan struct{})
	s.mu.Unlock()

	go s.run()
}

// Stop stops the spinner and clears the line.
func (s *Spinner) Stop() {
	s.mu.Lock()
	if !s.running {
		s.mu.Unlock()
		return
	}
	s.running = false
	close(s.done)
	s.mu.Unlock()

	// Clear the line
	s.clearLine()
}

// StopWithSuccess stops the spinner and shows a success message.
func (s *Spinner) StopWithSuccess(msg string) {
	s.Stop()
	var err error
	if Colors() {
		_, err = fmt.Fprintln(s.out, successStyle().Render("✓")+" "+msg)
	} else {
		_, err = fmt.Fprintln(s.out, "[ok] "+msg)
	}
	s.logWriteErr(err)
}

// StopWithError stops the spinner and shows an error message.
func (s *Spinner) StopWithError(msg string) {
	s.Stop()
	var err error
	if Colors() {
		_, err = fmt.Fprintln(s.out, errorStyle().Render("✗")+" "+msg)
	} else {
		_, err = fmt.Fprintln(s.out, "[error] "+msg)
	}
	s.logWriteErr(err)
}

// UpdateMessage changes the spinner message while running.
func (s *Spinner) UpdateMessage(msg string) {
	s.mu.Lock()
	s.message = msg
	s.mu.Unlock()
}

func (s *Spinner) run() {
	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()

	frame := 0
	for {
		select {
		case <-s.done:
			return
		case <-ticker.C:
			s.render(frame)
			frame = (frame + 1) % len(spinnerFrames())
		}
	}
}

func (s *Spinner) render(frame int) {
	s.mu.Lock()
	message := s.message
	s.mu.Unlock()

	spinner := spinnerFrames()[frame]
	if Colors() {
		spinner = s.style.Render(spinner)
	}

	// Move to start of line, clear, and write
	_, err := fmt.Fprintf(s.out, "\r\033[K%s %s", spinner, message)
	s.logWriteErr(err)
}

func (s *Spinner) clearLine() {
	_, err := fmt.Fprint(s.out, "\r\033[K")
	s.logWriteErr(err)
}

func (s *Spinner) logWriteErr(err error) {
	if err != nil && s.debug {
		fmt.Fprintf(os.Stderr, "[debug] spinner write error: %v\n", err)
	}
}

// WithSpinner runs a function with a spinner, handling success/error states.
func WithSpinner(ctx context.Context, message string, fn func() error) error {
	s := NewSpinner(message)
	s.Start()

	err := fn()

	if err != nil {
		s.StopWithError(message + ": " + err.Error())
		return err
	}

	s.StopWithSuccess(message)
	return nil
}

// Progress tracks progress of a multi-step operation.
type Progress struct {
	out     io.Writer
	total   int
	current int
	mu      sync.Mutex
	debug   bool
}

// NewProgress creates a new progress tracker.
func NewProgress(out io.Writer, total int, debug bool) *Progress {
	return &Progress{
		out:     out,
		total:   total,
		current: 0,
		mu:      sync.Mutex{},
		debug:   debug,
	}
}

// Step advances progress and prints the current step.
func (p *Progress) Step(message string) {
	p.mu.Lock()
	p.current++
	current := p.current
	total := p.total
	p.mu.Unlock()

	prefix := fmt.Sprintf("[%d/%d]", current, total)
	if Colors() {
		prefix = dimStyle().Render(prefix)
	}
	_, err := fmt.Fprintf(p.out, "%s %s\n", prefix, message)
	p.logWriteErr(err)
}

// Done prints a completion message.
func (p *Progress) Done(message string) {
	var err error
	if Colors() {
		_, err = fmt.Fprintln(p.out, successStyle().Render("✓")+" "+message)
	} else {
		_, err = fmt.Fprintln(p.out, "[done] "+message)
	}
	p.logWriteErr(err)
}

func (p *Progress) logWriteErr(err error) {
	if err != nil && p.debug {
		fmt.Fprintf(os.Stderr, "[debug] progress write error: %v\n", err)
	}
}
