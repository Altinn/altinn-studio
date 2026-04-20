package logstream_test

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"altinn.studio/studioctl/internal/logstream"
	"altinn.studio/studioctl/internal/osutil"
)

func TestStreamTailsNewestLinesAcrossFiles(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	oldPath := writeLog(t, dir, "2026-04-19-1.log", "old\n")
	newPath := writeLog(t, dir, "2026-04-20-1.log", "new-one\nnew-two\n")
	setLogModTime(t, oldPath, time.Date(2026, 4, 19, 1, 0, 0, 0, time.UTC))
	setLogModTime(t, newPath, time.Date(2026, 4, 20, 1, 0, 0, 0, time.UTC))

	var out bytes.Buffer
	err := logstream.Streamer{
		ListFiles: listFiles(dir),
		Emit: func(_ string, line string) error {
			out.WriteString(line)
			out.WriteString(osutil.LineBreak)
			return nil
		},
	}.Stream(context.Background(), logstream.Options{
		Tail:   2,
		Follow: false,
	})
	if err != nil {
		t.Fatalf("Stream() error = %v", err)
	}
	if out.String() != "new-one"+osutil.LineBreak+"new-two"+osutil.LineBreak {
		t.Fatalf("output = %q, want newest lines", out.String())
	}
}

func TestStreamFollowsAppendedCompleteLines(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := writeLog(t, dir, "2026-04-20-1.log", "one\n")
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	lines := make(chan string, 1)
	errCh := make(chan error, 1)
	go func() {
		errCh <- logstream.Streamer{
			ListFiles: listFiles(dir),
			Emit: func(_ string, line string) error {
				lines <- line
				return nil
			},
		}.Stream(ctx, logstream.Options{
			Tail:   1,
			Follow: true,
		})
	}()

	select {
	case got := <-lines:
		if got != "one" {
			t.Fatalf("initial line = %q, want one", got)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for initial log line")
	}
	appendLog(t, path, "two\n")
	select {
	case got := <-lines:
		if got != "two" {
			t.Fatalf("line = %q, want two", got)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for appended log line")
	}
	cancel()

	if err := <-errCh; err != nil {
		t.Fatalf("Stream() error = %v", err)
	}
}

func TestStreamTailAllEmitsAllCompleteLines(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	writeLog(t, dir, "2026-04-20-1.log", "one\ntwo\npartial")

	var out bytes.Buffer
	err := logstream.Streamer{
		ListFiles: listFiles(dir),
		Emit: func(_ string, line string) error {
			out.WriteString(line)
			out.WriteString(osutil.LineBreak)
			return nil
		},
	}.Stream(context.Background(), logstream.Options{
		TailAll: true,
		Follow:  false,
	})
	if err != nil {
		t.Fatalf("Stream() error = %v", err)
	}
	want := "one" + osutil.LineBreak + "two" + osutil.LineBreak
	if out.String() != want {
		t.Fatalf("output = %q, want complete lines", out.String())
	}
}

func TestStreamWithoutFilesReturnsNoLogFiles(t *testing.T) {
	t.Parallel()

	err := logstream.Streamer{
		ListFiles: func() ([]logstream.File, error) { return nil, nil },
		Emit:      func(string, string) error { return nil },
	}.Stream(context.Background(), logstream.Options{
		Tail:   1,
		Follow: false,
	})
	if !errors.Is(err, logstream.ErrNoLogFiles) {
		t.Fatalf("Stream() error = %v, want ErrNoLogFiles", err)
	}
}

func listFiles(dir string) func() ([]logstream.File, error) {
	return func() ([]logstream.File, error) {
		entries, err := os.ReadDir(dir)
		if err != nil {
			return nil, fmt.Errorf("read log dir: %w", err)
		}
		files := make([]logstream.File, 0, len(entries))
		for _, entry := range entries {
			info, err := entry.Info()
			if err != nil || info.IsDir() {
				continue
			}
			files = append(files, logstream.File{
				ModTime: info.ModTime(),
				Path:    filepath.Join(dir, entry.Name()),
				Size:    info.Size(),
			})
		}
		return files, nil
	}
}

func writeLog(t *testing.T, dir string, name string, content string) string {
	t.Helper()

	path := filepath.Join(dir, name)
	if err := os.WriteFile(path, []byte(content), osutil.FilePermOwnerOnly); err != nil {
		t.Fatalf("write log: %v", err)
	}
	return path
}

func appendLog(t *testing.T, path string, content string) {
	t.Helper()

	file, err := os.OpenFile(path, os.O_APPEND|os.O_WRONLY, 0)
	if err != nil {
		t.Fatalf("open log: %v", err)
	}
	defer func() {
		if closeErr := file.Close(); closeErr != nil {
			t.Fatalf("close log: %v", closeErr)
		}
	}()
	if _, err := file.WriteString(content); err != nil {
		t.Fatalf("append log: %v", err)
	}
}

func setLogModTime(t *testing.T, path string, modTime time.Time) {
	t.Helper()

	if err := os.Chtimes(path, modTime, modTime); err != nil {
		t.Fatalf("chtimes %q: %v", path, err)
	}
}
