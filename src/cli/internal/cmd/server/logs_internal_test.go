package server

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"os"
	"path/filepath"
	"testing"
	"time"

	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

func TestStreamLogsReadsLatestLog(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	oldPath := writeServerLog(t, dir, "2026-04-18-1.log", "old\n")
	newPath := writeServerLog(t, dir, "2026-04-19-2.log", "new\n")
	setServerLogModTime(t, oldPath, time.Date(2026, 4, 18, 1, 0, 0, 0, time.UTC))
	setServerLogModTime(t, newPath, time.Date(2026, 4, 19, 1, 0, 0, 0, time.UTC))

	var out bytes.Buffer
	err := StreamLogs(context.Background(), dir, ui.NewOutput(&out, io.Discard, false), LogOptions{
		Tail:   1,
		Follow: false,
		JSON:   false,
	})
	if err != nil {
		t.Fatalf("StreamLogs() error = %v", err)
	}
	if out.String() != "new"+osutil.LineBreak {
		t.Fatalf("output = %q, want latest log", out.String())
	}
}

func TestStreamLogsJSON(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	writeServerLog(t, dir, "2026-04-19-1.log", "line\n")

	var out bytes.Buffer
	err := StreamLogs(context.Background(), dir, ui.NewOutput(&out, io.Discard, false), LogOptions{
		Tail:   1,
		Follow: false,
		JSON:   true,
	})
	if err != nil {
		t.Fatalf("StreamLogs() error = %v", err)
	}

	var got serverLogLine
	if err := json.Unmarshal(bytes.TrimSpace(out.Bytes()), &got); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if got.Line != "line" {
		t.Fatalf("output = %+v, want log line", got)
	}
}

func TestStreamLogsMissingLogFile(t *testing.T) {
	t.Parallel()

	err := StreamLogs(context.Background(), t.TempDir(), ui.NewOutput(io.Discard, io.Discard, false), LogOptions{
		Tail:   1,
		Follow: false,
		JSON:   false,
	})
	if !errors.Is(err, errStudioctlServerLogsNotFound) {
		t.Fatalf("StreamLogs() error = %v, want errStudioctlServerLogsNotFound", err)
	}
}

func TestStreamLogsContextCanceledFollowReturnsNil(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	writeServerLog(t, dir, "2026-04-19-1.log", "one\n")
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	err := StreamLogs(ctx, dir, ui.NewOutput(io.Discard, io.Discard, false), LogOptions{
		Tail:   0,
		Follow: true,
		JSON:   false,
	})
	if err != nil {
		t.Fatalf("StreamLogs() error = %v, want nil", err)
	}
}

func writeServerLog(t *testing.T, dir string, name string, content string) string {
	t.Helper()

	path := filepath.Join(dir, name)
	if err := os.WriteFile(path, []byte(content), osutil.FilePermOwnerOnly); err != nil {
		t.Fatalf("write server log %q: %v", path, err)
	}
	return path
}

func setServerLogModTime(t *testing.T, path string, modTime time.Time) {
	t.Helper()

	if err := os.Chtimes(path, modTime, modTime); err != nil {
		t.Fatalf("set server log modtime %q: %v", path, err)
	}
}
