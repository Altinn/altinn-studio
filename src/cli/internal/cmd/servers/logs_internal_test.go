package servers

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"altinn.studio/studioctl/internal/osutil"
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
	if out.String() != "one"+osutil.LineBreak+"two"+osutil.LineBreak {
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

func TestReadTailSnapshot_ReturnsLastLines(t *testing.T) {
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

func TestReadTailSnapshot_ReadsOlderFilesOnlyWhenNeeded(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	oldPath := writeNamedLog(t, dir, "2026-04-18-100.log", "one\n")
	newPath := writeNamedLog(t, dir, "2026-04-19-100.log", "two\n")

	snapshot, err := readTailSnapshot([]string{oldPath, newPath}, 2)
	if err != nil {
		t.Fatalf("readTailSnapshot() error = %v", err)
	}
	if strings.Join(snapshot.lines, "\n") != "one\ntwo" {
		t.Fatalf("lines = %v, want one and two", snapshot.lines)
	}
}

func TestReadTailSnapshot_DoesNotReadOldFilesWhenNewerFileSatisfiesTail(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	oldPath := writeNamedLog(t, dir, "2026-04-18-100.log", strings.Repeat("x", logScannerMaxSize+1))
	newPath := writeNamedLog(t, dir, "2026-04-19-100.log", "new\n")

	snapshot, err := readTailSnapshot([]string{oldPath, newPath}, 1)
	if err != nil {
		t.Fatalf("readTailSnapshot() error = %v", err)
	}
	if strings.Join(snapshot.lines, "\n") != "new" {
		t.Fatalf("lines = %v, want new", snapshot.lines)
	}
	if _, ok := snapshot.nextOffsetByPath[oldPath]; ok {
		t.Fatalf("old log offset recorded, want old file left unread")
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
	if out.String() != "partial rest"+osutil.LineBreak {
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
	if out.String() != "new"+osutil.LineBreak {
		t.Fatalf("output = %q, want latest log", out.String())
	}
}

func TestPrintChangedFiles_ReadsNewFilesFromBeginning(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	oldPath := writeNamedLog(t, dir, "2026-04-18-100.log", "old\n")
	offsets := map[string]int64{oldPath: int64(len("old\n"))}
	newPath := writeNamedLog(t, dir, "2026-04-19-200.log", "new\n")
	setLogModTime(t, oldPath, time.Date(2026, 4, 18, 1, 0, 0, 0, time.UTC))
	setLogModTime(t, newPath, time.Date(2026, 4, 19, 1, 0, 0, 0, time.UTC))

	var out bytes.Buffer
	streamer := logStreamer{
		logDir: dir,
		out:    ui.NewOutput(&out, io.Discard, false),
	}

	if err := streamer.printChangedFiles(offsets, false); err != nil {
		t.Fatalf("printChangedFiles() error = %v", err)
	}
	if out.String() != "new"+osutil.LineBreak {
		t.Fatalf("output = %q, want new file contents", out.String())
	}
	if offsets[newPath] != int64(len("new\n")) {
		t.Fatalf("new offset = %d, want %d", offsets[newPath], len("new\n"))
	}
}

func TestFollowDiscoversNewLogFile(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	var out lockedBuffer
	streamer := logStreamer{
		logDir: dir,
		out:    ui.NewOutput(&out, io.Discard, false),
	}
	errCh := make(chan error, 1)
	go func() {
		errCh <- streamer.follow(ctx, map[string]int64{}, false)
	}()

	writeNamedLog(t, dir, "2026-04-19-200.log", "new\n")
	waitForOutput(t, &out, "new"+osutil.LineBreak)
	cancel()

	if err := <-errCh; err != nil {
		t.Fatalf("StreamLogs() error = %v, want nil", err)
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
		Tail:   0,
		Follow: true,
	})
	if err != nil {
		t.Fatalf("StreamLogs() error = %v, want nil", err)
	}
}

type lockedBuffer struct {
	buf bytes.Buffer
	mu  sync.Mutex
}

func (b *lockedBuffer) Write(p []byte) (int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	n, err := b.buf.Write(p)
	if err != nil {
		return n, fmt.Errorf("write locked buffer: %w", err)
	}
	return n, nil
}

func (b *lockedBuffer) String() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.String()
}

func waitForOutput(t *testing.T, out *lockedBuffer, want string) {
	t.Helper()

	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		if out.String() == want {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("output = %q, want %q", out.String(), want)
}
