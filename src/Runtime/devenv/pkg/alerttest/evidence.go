package alerttest

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

const (
	evidenceFilePerm = 0o600
	evidenceDirPerm  = 0o750
)

// Evidence is a directory of what a run observed: a timeline, the raw notifications, a preview
// of them and the rule and query snapshots each step checked.
type Evidence struct {
	out      func(string)
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

// Dir is the evidence directory.
func (e *Evidence) Dir() string {
	return e.dir
}

// Logf adds a timestamped line to the timeline.
func (e *Evidence) Logf(format string, args ...any) {
	line := time.Now().UTC().Format("15:04:05Z") + "  " + fmt.Sprintf(format, args...)
	e.mu.Lock()
	e.timeline = append(e.timeline, line)
	e.mu.Unlock()
	if e.out != nil {
		e.out(line)
	}
}

// WriteJSON saves a value as indented JSON.
func (e *Evidence) WriteJSON(name string, value any) error {
	data, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return fmt.Errorf("encode %s: %w", name, err)
	}
	return e.WriteFile(name, string(data)+"\n")
}

// WriteFile saves a text file.
func (e *Evidence) WriteFile(name, content string) error {
	path := filepath.Join(e.dir, name)
	if err := os.MkdirAll(filepath.Dir(path), evidenceDirPerm); err != nil {
		return fmt.Errorf("create %s: %w", filepath.Dir(path), err)
	}
	if err := os.WriteFile(path, []byte(content), evidenceFilePerm); err != nil {
		return fmt.Errorf("write %s: %w", path, err)
	}
	return nil
}

// Timeline returns the lines logged so far.
func (e *Evidence) Timeline() string {
	e.mu.Lock()
	defer e.mu.Unlock()
	return strings.Join(e.timeline, "\n") + "\n"
}
