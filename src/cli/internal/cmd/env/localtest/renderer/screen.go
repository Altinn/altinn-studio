package renderer

import (
	"fmt"
	"strings"
	"sync"
	"time"

	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/ui"
)

// DetectMode picks the renderer mode for the given output target.
func DetectMode(out *ui.Output, verbose bool) Mode {
	if verbose {
		return ModeLog
	}

	fd, ok := out.FD()
	if !ok || !termIsTerminalFn(fd) {
		return ModeLog
	}

	width, _, err := termGetSizeFn(fd)
	if err == nil && width >= minProgressWidth {
		return ModeTable
	}

	return ModeCompact
}

func newScreenRenderer(
	out *ui.Output,
	resources []resource.Resource,
	operation Operation,
	rendererLayout layout,
) *screenRenderer {
	return &screenRenderer{
		out:           out,
		model:         newRenderModel(resources, operation),
		layout:        rendererLayout,
		done:          nil,
		mu:            sync.Mutex{},
		renderedLines: 0,
		running:       false,
		dirty:         false,
	}
}

func (r *screenRenderer) Start() {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.running || len(r.model.order) == 0 {
		return
	}

	r.running = true
	r.done = make(chan struct{})
	r.model.startedAt = time.Now()
	r.renderedLines = 0
	r.dirty = false

	r.renderLocked()

	go r.run()
}

func (r *screenRenderer) Stop() {
	r.mu.Lock()
	defer r.mu.Unlock()

	if !r.running {
		return
	}
	if r.dirty {
		r.renderLocked()
	}
	r.running = false
	close(r.done)
}

func (r *screenRenderer) FailAll(message string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.model.failAll(message, time.Now())
	r.dirty = true
	r.renderLocked()
}

func (r *screenRenderer) OnEvent(event resource.Event) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if len(r.model.applyEvent(event, time.Now())) == 0 {
		return
	}
	r.dirty = true
}

func (r *screenRenderer) run() {
	const renderTickInterval = 120 * time.Millisecond

	ticker := time.NewTicker(renderTickInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			r.mu.Lock()
			if !r.running {
				r.mu.Unlock()
				return
			}
			live := r.model.hasLiveRows()
			if r.dirty || live {
				if live {
					r.model.frame++
				}
				r.renderLocked()
			}
			r.mu.Unlock()
		case <-r.done:
			return
		}
	}
}

func (r *screenRenderer) renderLocked() {
	if len(r.model.order) == 0 {
		return
	}

	lines := r.layout.renderLines(r.model, terminalWidth(r.out), time.Now())
	r.printLinesLocked(lines)
	r.dirty = false
}

func (r *screenRenderer) printLinesLocked(lines []string) {
	const colorRedraw = "\r\033[K"

	lineCount := len(lines)
	maxLines := max(lineCount, r.renderedLines)

	var b strings.Builder
	if r.renderedLines > 0 {
		fmt.Fprintf(&b, "\033[%dA", r.renderedLines)
	}
	for i := range maxLines {
		b.WriteString(colorRedraw)
		if i < lineCount {
			b.WriteString(lines[i])
		}
		b.WriteByte('\n')
	}
	if maxLines > lineCount {
		fmt.Fprintf(&b, "\033[%dA\r", maxLines-lineCount)
	}

	r.renderedLines = lineCount
	r.out.Print(b.String())
}

func terminalWidth(out *ui.Output) int {
	const defaultTermWidth = 100

	fd, ok := out.FD()
	if !ok {
		return defaultTermWidth
	}

	width, _, err := termGetSizeFn(fd)
	if err != nil || width <= 0 {
		return defaultTermWidth
	}
	return width
}
