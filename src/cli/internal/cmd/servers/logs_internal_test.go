package servers

import (
	"bytes"
	"context"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"altinn.studio/studioctl/internal/ui"
)

func TestReadTailSnapshot_ReturnsOffsetAtScanEnd(t *testing.T) {
	t.Parallel()

	path := writeLog(t, t.TempDir(), "one\n")

	snapshot, err := readTailSnapshot([]string{path}, 100)
	if err != nil {
		t.Fatalf("readTailSnapshot() error = %v", err)
	}
	if strings.Join(snapshot.lines, "\n") != "one" {
		t.Fatalf("lines = %v, want one", snapshot.lines)
	}

	appendLog(t, path, "two\n")
	if snapshot.nextOffsetByPath[path] != int64(len("one\n")) {
		t.Fatalf("offset = %d, want %d", snapshot.nextOffsetByPath[path], len("one\n"))
	}
}

func TestTailThenPrintAppended_EmitsEachCompleteLineOnce(t *testing.T) {
	t.Parallel()

	path := writeLog(t, t.TempDir(), "one\n")
	var out bytes.Buffer
	streamer := logStreamer{
		logDir: filepath.Dir(path),
		out:    ui.NewOutput(&out, io.Discard, false),
	}

	snapshot, err := readTailSnapshot([]string{path}, 100)
	if err != nil {
		t.Fatalf("readTailSnapshot() error = %v", err)
	}
	for _, line := range snapshot.lines {
		if printErr := printServerLogLine(streamer.out, line, false); printErr != nil {
			t.Fatalf("printServerLogLine() error = %v", printErr)
		}
	}

	appendLog(t, path, "two\n")
	offset, err := streamer.printAppended(path, snapshot.nextOffsetByPath[path], false)
	if err != nil {
		t.Fatalf("printAppended() error = %v", err)
	}
	if out.String() != "one\ntwo\n" {
		t.Fatalf("output = %q, want one and two once", out.String())
	}
	if offset != int64(len("one\ntwo\n")) {
		t.Fatalf("offset = %d, want %d", offset, len("one\ntwo\n"))
	}

	out.Reset()
	_, err = streamer.printAppended(path, offset, false)
	if err != nil {
		t.Fatalf("second printAppended() error = %v", err)
	}
	if out.String() != "" {
		t.Fatalf("second output = %q, want empty", out.String())
	}
}

func TestReadTailSnapshot_UsesRingBufferForLastLines(t *testing.T) {
	t.Parallel()

	path := writeLog(t, t.TempDir(), "one\ntwo\nthree\nfour\n")

	snapshot, err := readTailSnapshot([]string{path}, 2)
	if err != nil {
		t.Fatalf("readTailSnapshot() error = %v", err)
	}
	if strings.Join(snapshot.lines, "\n") != "three\nfour" {
		t.Fatalf("lines = %v, want three and four", snapshot.lines)
	}
	if snapshot.nextOffsetByPath[path] != int64(len("one\ntwo\nthree\nfour\n")) {
		t.Fatalf("offset = %d, want end of complete log", snapshot.nextOffsetByPath[path])
	}
}

func TestPrintAppended_HoldsPartialLineUntilNewline(t *testing.T) {
	t.Parallel()

	path := writeLog(t, t.TempDir(), "one\npartial")
	var out bytes.Buffer
	streamer := logStreamer{
		logDir: filepath.Dir(path),
		out:    ui.NewOutput(&out, io.Discard, false),
	}

	offset, err := streamer.printAppended(path, int64(len("one\n")), false)
	if err != nil {
		t.Fatalf("printAppended() error = %v", err)
	}
	if out.String() != "" {
		t.Fatalf("output = %q, want empty", out.String())
	}
	if offset != int64(len("one\n")) {
		t.Fatalf("offset = %d, want %d", offset, len("one\n"))
	}

	appendLog(t, path, " rest\n")
	offset, err = streamer.printAppended(path, offset, false)
	if err != nil {
		t.Fatalf("second printAppended() error = %v", err)
	}
	if out.String() != "partial rest\n" {
		t.Fatalf("output = %q, want completed line", out.String())
	}
	if offset != int64(len("one\npartial rest\n")) {
		t.Fatalf("offset = %d, want %d", offset, len("one\npartial rest\n"))
	}
}

func TestStreamLogs_WithoutPIDReadsLatestLog(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	oldPath := writeNamedLog(t, dir, "2026-04-18-100.log", "old\n")
	newPath := writeNamedLog(t, dir, "2026-04-19-200.log", "new\n")
	setLogModTime(t, oldPath, time.Date(2026, 4, 18, 1, 0, 0, 0, time.UTC))
	setLogModTime(t, newPath, time.Date(2026, 4, 19, 1, 0, 0, 0, time.UTC))

	var out bytes.Buffer
	err := StreamLogs(context.Background(), dir, ui.NewOutput(&out, io.Discard, false), LogOptions{
		Tail: 1,
	})
	if err != nil {
		t.Fatalf("StreamLogs() error = %v", err)
	}
	if out.String() != "new\n" {
		t.Fatalf("output = %q, want latest log", out.String())
	}
}

func writeLog(t *testing.T, dir, content string) string {
	t.Helper()

	return writeNamedLog(t, dir, "2026-04-19-100.log", content)
}

func writeNamedLog(t *testing.T, dir, name, content string) string {
	t.Helper()

	path := filepath.Join(dir, name)
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatalf("write log %q: %v", path, err)
	}
	return path
}

func appendLog(t *testing.T, path, content string) {
	t.Helper()

	file, err := os.OpenFile(path, os.O_APPEND|os.O_WRONLY, 0)
	if err != nil {
		t.Fatalf("open log %q: %v", path, err)
	}
	defer func() {
		if closeErr := file.Close(); closeErr != nil {
			t.Fatalf("close log %q: %v", path, closeErr)
		}
	}()

	if _, err := file.WriteString(content); err != nil {
		t.Fatalf("append log %q: %v", path, err)
	}
}

func setLogModTime(t *testing.T, path string, modTime time.Time) {
	t.Helper()

	if err := os.Chtimes(path, modTime, modTime); err != nil {
		t.Fatalf("set log modtime %q: %v", path, err)
	}
}

func TestStreamLogs_ContextCanceledFollowReturnsNil(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	writeLog(t, dir, "one\n")
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	err := StreamLogs(ctx, dir, ui.NewOutput(io.Discard, io.Discard, false), LogOptions{
		PID:    100,
		Tail:   0,
		Follow: true,
	})
	if err != nil {
		t.Fatalf("StreamLogs() error = %v, want nil", err)
	}
}
