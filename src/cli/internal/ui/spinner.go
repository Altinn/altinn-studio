package ui

import (
	"fmt"
	"sync"
	"time"

	"github.com/charmbracelet/lipgloss"
)

const (
	defaultSpinnerInterval = 80 * time.Millisecond
)

// spinnerFrames returns the animation frames for the spinner.
func spinnerFrames() []string {
	return []string{"⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"}
}

// Spinner provides a terminal spinner for long-running operations.
type Spinner struct {
	out     *Output
	style   lipgloss.Style
	done    chan struct{}
	message string
	mu      sync.Mutex
	running bool
}

// NewSpinner creates a new spinner with the given message.
func NewSpinner(out *Output, message string) *Spinner {
	return &Spinner{
		out:     out,
		message: message,
		style:   lipgloss.NewStyle().Foreground(lipgloss.Color("12")), // blue
		done:    nil,                                                  // initialized on Start()
		mu:      sync.Mutex{},
		running: false,
	}
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

	s.clearLine()
}

// StopWithSuccess stops the spinner and shows a success message.
func (s *Spinner) StopWithSuccess(msg string) {
	s.Stop()
	var err error
	if Colors() {
		s.out.mu.Lock()
		_, err = fmt.Fprintln(s.out.out, successStyle().Render("✓")+" "+msg)
		s.out.mu.Unlock()
	} else {
		s.out.mu.Lock()
		_, err = fmt.Fprintln(s.out.out, "[ok] "+msg)
		s.out.mu.Unlock()
	}
	if err != nil {
		s.out.logWriteErr(err)
	}
}

// StopWithError stops the spinner and shows an error message.
func (s *Spinner) StopWithError(msg string) {
	s.Stop()
	var err error
	if Colors() {
		s.out.mu.Lock()
		_, err = fmt.Fprintln(s.out.out, errorStyle().Render("✗")+" "+msg)
		s.out.mu.Unlock()
	} else {
		s.out.mu.Lock()
		_, err = fmt.Fprintln(s.out.out, "[error] "+msg)
		s.out.mu.Unlock()
	}
	if err != nil {
		s.out.logWriteErr(err)
	}
}

func (s *Spinner) run() {
	ticker := time.NewTicker(defaultSpinnerInterval)
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

	s.out.mu.Lock()
	_, err := fmt.Fprintf(s.out.out, "\r\033[K%s %s", spinner, message)
	s.out.mu.Unlock()
	if err != nil {
		s.out.logWriteErr(err)
	}
}

func (s *Spinner) clearLine() {
	s.out.mu.Lock()
	_, err := fmt.Fprint(s.out.out, "\r\033[K")
	s.out.mu.Unlock()
	if err != nil {
		s.out.logWriteErr(err)
	}
}
