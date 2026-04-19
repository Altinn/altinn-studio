package appmanager

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestLatestAppManagerLogPath_ReturnsNewestMatchingFile(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	oldPath := writeTestLog(t, dir, "2026-04-18-100.log", "old\n")
	newPath := writeTestLog(t, dir, "2026-04-19-200.log", "new\n")
	_ = writeTestLog(t, dir, "legacy.log", "legacy\n")
	setModTime(t, oldPath, time.Date(2026, 4, 18, 1, 0, 0, 0, time.UTC))
	setModTime(t, newPath, time.Date(2026, 4, 19, 1, 0, 0, 0, time.UTC))

	got, ok := latestAppManagerLogPath(dir)
	if !ok {
		t.Fatal("latestAppManagerLogPath() ok = false, want true")
	}
	if got != newPath {
		t.Fatalf("latestAppManagerLogPath() = %q, want %q", got, newPath)
	}
}

func TestReadLatestAppManagerLogTail_ReadsOnlyNewestMatchingFile(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	oldPath := writeTestLog(t, dir, "2026-04-18-100.log", "old\n")
	newPath := writeTestLog(t, dir, "2026-04-19-200.log", "new\n")
	setModTime(t, oldPath, time.Date(2026, 4, 18, 1, 0, 0, 0, time.UTC))
	setModTime(t, newPath, time.Date(2026, 4, 19, 1, 0, 0, 0, time.UTC))

	assertLatestLogPath(t, dir, newPath)
	got := readLatestAppManagerLogTail(dir)
	if !strings.Contains(got, "new") {
		t.Fatalf("readLatestAppManagerLogTail() = %q, want newest log line", got)
	}
	if strings.Contains(got, "old") {
		t.Fatalf("readLatestAppManagerLogTail() = %q, want no old log line", got)
	}
}

func TestReadLatestAppManagerLogTail_LimitsOutput(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	var content strings.Builder
	for range appManagerLogTailLines + 1 {
		content.WriteString("line\n")
	}
	content.WriteString("last\n")
	path := writeTestLog(t, dir, "2026-04-19-200.log", content.String())

	assertLatestLogPath(t, dir, path)
	got := readLatestAppManagerLogTail(dir)
	if strings.Count(got, "line") != appManagerLogTailLines-1 {
		t.Fatalf("line count = %d, want %d", strings.Count(got, "line"), appManagerLogTailLines-1)
	}
	if !strings.Contains(got, "last") {
		t.Fatalf("readLatestAppManagerLogTail() = %q, want last line", got)
	}
}

func TestReadAppManagerLogTailForPID_IgnoresOtherProcessLogs(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	targetPath := writeTestLog(t, dir, "2026-04-19-100.log", "target\n")
	stalePath := writeTestLog(t, dir, "2026-04-19-200.log", "stale\n")
	setModTime(t, targetPath, time.Date(2026, 4, 19, 1, 0, 0, 0, time.UTC))
	setModTime(t, stalePath, time.Date(2026, 4, 19, 2, 0, 0, 0, time.UTC))

	got := readAppManagerLogTailForPID(dir, 100)
	if !strings.Contains(got, "target") {
		t.Fatalf("readAppManagerLogTailForPID() = %q, want target log", got)
	}
	if strings.Contains(got, "stale") {
		t.Fatalf("readAppManagerLogTailForPID() = %q, want no stale log", got)
	}
}

func TestLogPathsForPID_ReturnsOnlyMatchingPIDInOrder(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	first := writeTestLog(t, dir, "2026-04-18-100.log", "first\n")
	second := writeTestLog(t, dir, "2026-04-19-100.log", "second\n")
	singleDigit := writeTestLog(t, dir, "2026-04-19-1.log", "single\n")
	_ = writeTestLog(t, dir, "2026-04-19-200.log", "other\n")
	_ = writeTestLog(t, dir, "legacy.log", "legacy\n")

	got, err := LogPathsForPID(dir, 100)
	if err != nil {
		t.Fatalf("LogPathsForPID() error = %v", err)
	}

	want := []string{first, second}
	if strings.Join(got, "\n") != strings.Join(want, "\n") {
		t.Fatalf("LogPathsForPID() = %v, want %v", got, want)
	}

	got, err = LogPathsForPID(dir, 1)
	if err != nil {
		t.Fatalf("LogPathsForPID(single digit) error = %v", err)
	}
	if len(got) != 1 || got[0] != singleDigit {
		t.Fatalf("LogPathsForPID(single digit) = %v, want %v", got, []string{singleDigit})
	}
}

func TestLogFiles_ReturnsMatchingFilesByModTime(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	first := writeTestLog(t, dir, "2026-04-19-200.log", "first\n")
	second := writeTestLog(t, dir, "2026-04-18-100.log", "second\n")
	_ = writeTestLog(t, dir, "legacy.log", "legacy\n")
	setModTime(t, first, time.Date(2026, 4, 19, 1, 0, 0, 0, time.UTC))
	setModTime(t, second, time.Date(2026, 4, 19, 2, 0, 0, 0, time.UTC))

	files, err := LogFiles(dir)
	if err != nil {
		t.Fatalf("LogFiles() error = %v", err)
	}
	got := make([]string, 0, len(files))
	for _, file := range files {
		got = append(got, file.Path)
	}
	want := []string{first, second}
	if strings.Join(got, "\n") != strings.Join(want, "\n") {
		t.Fatalf("LogFiles() = %v, want %v", got, want)
	}
}

func TestLogLookup_HandlesDirectoryWithGlobMetacharacters(t *testing.T) {
	t.Parallel()

	dir := filepath.Join(t.TempDir(), "logs[abc]")
	if err := os.Mkdir(dir, 0o700); err != nil {
		t.Fatalf("create log dir: %v", err)
	}
	oldPath := writeTestLog(t, dir, "2026-04-18-100.log", "first\n")
	newPath := writeTestLog(t, dir, "2026-04-19-100.log", "second\n")
	otherPath := writeTestLog(t, dir, "2026-04-19-200.log", "other\n")
	setModTime(t, oldPath, time.Date(2026, 4, 18, 1, 0, 0, 0, time.UTC))
	setModTime(t, newPath, time.Date(2026, 4, 19, 1, 0, 0, 0, time.UTC))
	setModTime(t, otherPath, time.Date(2026, 4, 18, 2, 0, 0, 0, time.UTC))

	latest, ok := LatestLogPath(dir)
	if !ok {
		t.Fatal("LatestLogPath() ok = false, want true")
	}
	if latest != newPath {
		t.Fatalf("LatestLogPath() = %q, want %q", latest, newPath)
	}

	paths, err := LogPathsForPID(dir, 100)
	if err != nil {
		t.Fatalf("LogPathsForPID() error = %v", err)
	}
	want := []string{oldPath, newPath}
	if strings.Join(paths, "\n") != strings.Join(want, "\n") {
		t.Fatalf("LogPathsForPID() = %v, want %v", paths, want)
	}
}

func writeTestLog(t *testing.T, dir, name, content string) string {
	t.Helper()

	path := filepath.Join(dir, name)
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatalf("write log %q: %v", path, err)
	}
	return path
}

func assertLatestLogPath(t *testing.T, dir, want string) {
	t.Helper()

	got, ok := latestAppManagerLogPath(dir)
	if !ok {
		t.Fatal("latestAppManagerLogPath() ok = false, want true")
	}
	if got != want {
		t.Fatalf("latestAppManagerLogPath() = %q, want %q", got, want)
	}
}

func setModTime(t *testing.T, path string, modTime time.Time) {
	t.Helper()

	if err := os.Chtimes(path, modTime, modTime); err != nil {
		t.Fatalf("set modtime %q: %v", path, err)
	}
}
