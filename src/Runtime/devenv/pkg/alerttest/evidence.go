package alerttest

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

const (
	evidenceDirPerm  = 0o750
	evidenceFilePerm = 0o600
)

// Evidence is a directory of what a run observed: a timeline, the notifications and the
// snapshots each step checked.
type Evidence struct {
	out      func(string)
	parent   *Evidence
	dir      string
	timeline []string
	mu       sync.Mutex
}

// NewEvidence creates the evidence directory; out receives each timeline line as it happens.
func NewEvidence(dir string, out func(string)) (*Evidence, error) {
	if err := os.MkdirAll(dir, evidenceDirPerm); err != nil {
		return nil, fmt.Errorf("create evidence directory: %w", err)
	}
	return &Evidence{dir: dir, out: out}, nil
}

// Child returns the evidence of a part of the run, such as a scenario, in a subdirectory with a
// timeline of its own, whose lines also go to this timeline.
func (e *Evidence) Child(name string) (*Evidence, error) {
	child, err := NewEvidence(filepath.Join(e.dir, name), nil)
	if err != nil {
		return nil, err
	}
	child.parent = e
	return child, nil
}

// Logf adds a timestamped line to the timeline.
func (e *Evidence) Logf(format string, args ...any) {
	e.add(time.Now().UTC().Format("15:04:05Z") + "  " + fmt.Sprintf(format, args...))
}

// WriteJSON saves a value as indented JSON.
func (e *Evidence) WriteJSON(name string, value any) error {
	data, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return fmt.Errorf("encode %s: %w", name, err)
	}
	return e.WriteFile(name, append(data, '\n'))
}

// WriteFile saves a file in the evidence directory.
func (e *Evidence) WriteFile(name string, content []byte) error {
	path := filepath.Join(e.dir, name)
	if err := os.MkdirAll(filepath.Dir(path), evidenceDirPerm); err != nil {
		return fmt.Errorf("create %s: %w", filepath.Dir(path), err)
	}
	if err := os.WriteFile(path, content, evidenceFilePerm); err != nil {
		return fmt.Errorf("write %s: %w", path, err)
	}
	return nil
}

// Close saves the timeline.
func (e *Evidence) Close() error {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.WriteFile("timeline.log", []byte(strings.Join(e.timeline, "\n")+"\n"))
}

// saveNotifications saves what the recorder received: the raw payloads and its preview page.
func saveNotifications(ctx context.Context, env *Env) error {
	_, raw, err := env.Recorder.Messages(ctx)
	if err != nil {
		return err
	}
	preview, err := env.Recorder.Preview(ctx)
	if err != nil {
		return err
	}
	if err := env.Evidence.WriteFile("notifications.json", raw); err != nil {
		return err
	}
	return env.Evidence.WriteFile("notifications.html", preview)
}

func (e *Evidence) add(line string) {
	e.mu.Lock()
	e.timeline = append(e.timeline, line)
	e.mu.Unlock()
	if e.parent != nil {
		e.parent.add(line)
	}
	if e.out != nil {
		e.out(line)
	}
}
