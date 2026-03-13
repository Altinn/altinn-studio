package renderer

import (
	"strconv"
	"sync"
	"time"

	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/ui"
)

// NewLog creates the non-interactive line-based renderer.
func NewLog(
	out *ui.Output,
	resources []resource.Resource,
	operation Operation,
	startMessage string,
) *LogRenderer {
	return &LogRenderer{
		out:          out,
		model:        newRenderModel(resources, operation),
		startMessage: startMessage,
		emitted:      make(map[string]string),
		mu:           sync.Mutex{},
	}
}

// Start begins log rendering for the operation.
func (r *LogRenderer) Start() {
	r.mu.Lock()
	r.model.startedAt = time.Now()
	r.mu.Unlock()

	if r.startMessage != "" {
		r.out.Println(r.startMessage)
	}
}

// Stop finishes log rendering for the operation.
func (r *LogRenderer) Stop() {}

// FailAll marks remaining rows as canceled after an operation-level failure.
func (r *LogRenderer) FailAll(message string) {
	r.mu.Lock()
	changed := r.model.failAll(message, time.Now())
	lines := r.linesForNamesLocked(changed)
	if r.model.operationFailed && r.model.operationFailure != "" {
		lines = append(lines, r.model.operation.name()+": failed: "+r.model.operationFailure)
	}
	r.mu.Unlock()

	for _, line := range lines {
		r.out.Println(line)
	}
}

// OnEvent consumes a resource lifecycle event.
func (r *LogRenderer) OnEvent(event resource.Event) {
	r.mu.Lock()
	changed := r.model.applyEvent(event, time.Now())
	lines := r.linesForNamesLocked(changed)
	r.mu.Unlock()

	for _, line := range lines {
		r.out.Println(line)
	}
}

func (r *LogRenderer) linesForNamesLocked(names []string) []string {
	lines := make([]string, 0, len(names))
	for _, name := range names {
		row := r.model.rows[name]
		if row == nil {
			continue
		}
		line, signature, ok := logLineForRow(r.model, row)
		if !ok {
			continue
		}
		if r.emitted[name] == signature {
			continue
		}
		r.emitted[name] = signature
		lines = append(lines, line)
	}
	return lines
}

func logLineForRow(model *renderModel, row *progressRow) (string, string, bool) {
	if row.state == statePending {
		return "", "", false
	}

	line := row.name + ": " + row.state
	signature := row.state

	if isActiveState(row.state) {
		if bucket, ok := logProgressBucket(row); ok {
			bucketText := strconv.Itoa(bucket) + "%"
			line += " " + bucketText
			signature += "|" + bucketText
		}
	}

	if row.message != "" {
		line += ": " + row.message
		signature += "|" + row.message
	}

	if row.state == model.operation.successState() ||
		isTerminalUnsuccessfulState(row.state) ||
		isActiveState(row.state) {
		return line, signature, true
	}

	return "", "", false
}

func logProgressBucket(row *progressRow) (int, bool) {
	const progressBucketSize = 10

	if row.indeterminate ||
		row.total <= rowProgressEmpty ||
		row.current < rowProgressEmpty ||
		row.current >= row.total {
		return 0, false
	}

	current, total := normalizedProgress(row.current, row.total)
	percent := int((float64(current) / float64(total)) * maxProgressPercent)
	return (percent / progressBucketSize) * progressBucketSize, true
}
