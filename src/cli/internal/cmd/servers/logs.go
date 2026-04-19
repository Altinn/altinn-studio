// Package servers contains command-specific background server logic.
package servers

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"altinn.studio/studioctl/internal/appmanager"
	"altinn.studio/studioctl/internal/ui"
)

const (
	logScannerBufSize = 64 * 1024
	logScannerMaxSize = 1024 * 1024
	logPollInterval   = 200 * time.Millisecond
)

var (
	errAppManagerLogsNotFound = errors.New("app-manager logs not found")
	errLogLineTooLong         = errors.New("app-manager log line exceeds max size")
)

// LogOptions configures app-manager log streaming.
type LogOptions struct {
	PID    int
	Tail   int
	Follow bool
	JSON   bool
}

type logStreamer struct {
	out    *ui.Output
	logDir string
}

type tailSnapshot struct {
	nextOffsetByPath map[string]int64
	lines            []string
}

type tailRing struct {
	lines []string
	next  int
	full  bool
}

type serverLogLine struct {
	Server string `json:"server"`
	Line   string `json:"line"`
	JSON   bool   `json:"-"`
}

func (l serverLogLine) Print(out *ui.Output) error {
	if !l.JSON {
		out.Println(l.Line)
		return nil
	}

	payload, err := json.Marshal(l)
	if err != nil {
		return fmt.Errorf("marshal server log line: %w", err)
	}
	out.Println(string(payload))
	return nil
}

// StreamLogs writes app-manager log lines to the configured output.
func StreamLogs(ctx context.Context, logDir string, out *ui.Output, opts LogOptions) error {
	streamer := logStreamer{
		logDir: logDir,
		out:    out,
	}
	return streamer.stream(ctx, opts)
}

func (s *logStreamer) stream(ctx context.Context, opts LogOptions) error {
	paths, err := s.logPaths(opts.PID)
	if err != nil {
		return fmt.Errorf("find app-manager logs: %w", err)
	}
	if len(paths) == 0 {
		return errAppManagerLogsNotFound
	}

	snapshot, err := readTailSnapshot(paths, opts.Tail)
	if err != nil {
		return err
	}
	for _, line := range snapshot.lines {
		if err := printServerLogLine(s.out, line, opts.JSON); err != nil {
			return err
		}
	}

	if !opts.Follow {
		return nil
	}

	path := currentOrLastLogPath(s.logDir, opts.PID, s.utcDate(), paths)
	offset := snapshot.nextOffsetByPath[path]
	if offset == 0 && opts.Tail == 0 {
		offset = fileSize(path)
	}
	return s.follow(ctx, opts.PID, path, offset, opts.JSON)
}

func (s *logStreamer) logPaths(pid int) ([]string, error) {
	if pid > 0 {
		paths, err := appmanager.LogPathsForPID(s.logDir, pid)
		if err != nil {
			return nil, fmt.Errorf("find logs for pid %d: %w", pid, err)
		}
		return paths, nil
	}

	path, ok := appmanager.LatestLogPath(s.logDir)
	if !ok {
		return nil, nil
	}
	return []string{path}, nil
}

func (s *logStreamer) follow(
	ctx context.Context,
	pid int,
	path string,
	offset int64,
	jsonOutput bool,
) error {
	ticker := time.NewTicker(logPollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
			nextPath := appmanager.LogPathForDate(s.logDir, s.utcDate(), pid)
			if nextPath != path && fileExists(nextPath) {
				if _, err := s.printAppended(path, offset, jsonOutput); err != nil {
					return err
				}
				path = nextPath
				offset = 0
			}

			nextOffset, err := s.printAppended(path, offset, jsonOutput)
			if err != nil {
				return err
			}
			offset = nextOffset
		}
	}
}

func (s *logStreamer) printAppended(path string, offset int64, jsonOutput bool) (int64, error) {
	if size := fileSize(path); size < offset {
		offset = 0
	} else if size == offset {
		return offset, nil
	}

	//nolint:gosec // G304: path comes from the configured log directory and app-manager log filename pattern.
	file, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return offset, nil
		}
		return offset, fmt.Errorf("open app-manager log: %w", err)
	}
	defer func() {
		if closeErr := file.Close(); closeErr != nil {
			s.out.Verbosef("failed to close app-manager log: %v", closeErr)
		}
	}()

	nextOffset, err := scanCompleteLines(file, offset, func(line string) error {
		return printServerLogLine(s.out, line, jsonOutput)
	})
	if err != nil {
		return offset, err
	}
	return nextOffset, nil
}

func (s *logStreamer) utcDate() string {
	return time.Now().UTC().Format(time.DateOnly)
}

func readTailSnapshot(paths []string, tail int) (tailSnapshot, error) {
	snapshot := tailSnapshot{
		nextOffsetByPath: make(map[string]int64, len(paths)),
		lines:            nil,
	}
	if tail == 0 {
		return snapshot, nil
	}

	ring := newTailRing(tail)
	for _, path := range paths {
		offset, err := scanCompleteFile(path, func(line string) error {
			ring.add(line)
			return nil
		})
		if err != nil {
			return tailSnapshot{}, err
		}
		snapshot.nextOffsetByPath[path] = offset
	}
	snapshot.lines = ring.linesInOrder()
	return snapshot, nil
}

func newTailRing(capacity int) *tailRing {
	return &tailRing{
		lines: make([]string, 0, capacity),
		next:  0,
		full:  false,
	}
}

func (r *tailRing) add(line string) {
	if cap(r.lines) == 0 {
		return
	}
	if !r.full {
		r.lines = append(r.lines, line)
		if len(r.lines) == cap(r.lines) {
			r.full = true
		}
		return
	}

	r.lines[r.next] = line
	r.next = (r.next + 1) % len(r.lines)
}

func (r *tailRing) linesInOrder() []string {
	if !r.full || len(r.lines) == 0 {
		return append([]string(nil), r.lines...)
	}

	result := make([]string, 0, len(r.lines))
	result = append(result, r.lines[r.next:]...)
	result = append(result, r.lines[:r.next]...)
	return result
}

func scanCompleteFile(path string, emit func(string) error) (int64, error) {
	//nolint:gosec // G304: path comes from the configured log directory and app-manager log filename pattern.
	file, err := os.Open(path)
	if err != nil {
		return 0, fmt.Errorf("open app-manager log: %w", err)
	}

	offset, scanErr := scanCompleteLines(file, 0, emit)
	if closeErr := file.Close(); closeErr != nil {
		if scanErr != nil {
			return offset, scanErr
		}
		return offset, fmt.Errorf("close app-manager log: %w", closeErr)
	}
	return offset, scanErr
}

func scanCompleteLines(file *os.File, offset int64, emit func(string) error) (int64, error) {
	if _, err := file.Seek(offset, io.SeekStart); err != nil {
		return offset, fmt.Errorf("seek app-manager log: %w", err)
	}

	reader := bufio.NewReaderSize(file, logScannerBufSize)
	// nextOffset is always the byte after the last emitted newline. EOF without
	// a newline leaves the offset unchanged, so follow mode retries the partial
	// line and emits it only when it becomes complete.
	nextOffset := offset
	line := make([]byte, 0, logScannerBufSize)

	for {
		fragment, err := reader.ReadSlice('\n')
		if len(line)+len(fragment) > logScannerMaxSize {
			return nextOffset, errLogLineTooLong
		}
		line = append(line, fragment...)

		switch {
		case errors.Is(err, bufio.ErrBufferFull):
			continue
		case errors.Is(err, io.EOF):
			return nextOffset, nil
		case err != nil:
			return nextOffset, fmt.Errorf("read app-manager log: %w", err)
		}

		nextOffset += int64(len(line))
		text := strings.TrimSuffix(string(line), "\n")
		if err := emit(text); err != nil {
			return nextOffset, err
		}
		line = line[:0]
	}
}

func currentOrLastLogPath(logDir string, pid int, utcDate string, paths []string) string {
	currentPath := appmanager.LogPathForDate(logDir, utcDate, pid)
	if fileExists(currentPath) {
		return currentPath
	}
	return paths[len(paths)-1]
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

func fileSize(path string) int64 {
	info, err := os.Stat(path)
	if err != nil || info.IsDir() {
		return 0
	}
	return info.Size()
}

func printServerLogLine(out *ui.Output, line string, jsonOutput bool) error {
	return serverLogLine{
		Server: "app-manager",
		Line:   strings.TrimSuffix(line, "\r"),
		JSON:   jsonOutput,
	}.Print(out)
}
