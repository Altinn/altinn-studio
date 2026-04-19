// Package servers contains command-specific background server logic.
package servers

import (
	"bufio"
	"bytes"
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

type tailFileSnapshot struct {
	lines      []string
	nextOffset int64
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
	files, err := appmanager.LogFiles(s.logDir)
	if err != nil {
		return fmt.Errorf("find app-manager logs: %w", err)
	}
	if len(files) == 0 && !opts.Follow {
		return errAppManagerLogsNotFound
	}

	snapshot, err := readTailSnapshot(logFilePaths(files), opts.Tail)
	if err != nil {
		return err
	}
	offsets := initialOffsets(files, snapshot)
	for _, line := range snapshot.lines {
		if err := printServerLogLine(s.out, line, opts.JSON); err != nil {
			return err
		}
	}

	if !opts.Follow {
		return nil
	}
	return s.follow(ctx, offsets, opts.JSON)
}

func (s *logStreamer) follow(
	ctx context.Context,
	offsetByPath map[string]int64,
	jsonOutput bool,
) error {
	ticker := time.NewTicker(logPollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
			if err := s.printChangedFiles(offsetByPath, jsonOutput); err != nil {
				return err
			}
		}
	}
}

func logFilePaths(files []appmanager.LogFile) []string {
	paths := make([]string, 0, len(files))
	for _, file := range files {
		paths = append(paths, file.Path)
	}
	return paths
}

func initialOffsets(files []appmanager.LogFile, snapshot tailSnapshot) map[string]int64 {
	offsetByPath := make(map[string]int64, len(files))
	for _, file := range files {
		offset, ok := snapshot.nextOffsetByPath[file.Path]
		if !ok {
			offset = file.Size
		}
		offsetByPath[file.Path] = offset
	}
	return offsetByPath
}

func (s *logStreamer) printChangedFiles(offsetByPath map[string]int64, jsonOutput bool) error {
	files, err := appmanager.LogFiles(s.logDir)
	if err != nil {
		return fmt.Errorf("find app-manager logs: %w", err)
	}

	for _, file := range files {
		offset := offsetByPath[file.Path]
		nextOffset, err := s.printAppended(file.Path, offset, jsonOutput)
		if err != nil {
			return err
		}
		offsetByPath[file.Path] = nextOffset
	}
	return nil
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

func readTailSnapshot(paths []string, tail int) (tailSnapshot, error) {
	snapshot := tailSnapshot{
		nextOffsetByPath: make(map[string]int64, len(paths)),
		lines:            nil,
	}
	if tail == 0 {
		return snapshot, nil
	}

	chunks := make([][]string, 0, len(paths))
	remaining := tail
	for i := len(paths) - 1; i >= 0 && remaining > 0; i-- {
		path := paths[i]
		fileTail, err := readFileTail(path, remaining)
		if err != nil {
			return tailSnapshot{}, err
		}
		snapshot.nextOffsetByPath[path] = fileTail.nextOffset
		if len(fileTail.lines) == 0 {
			continue
		}
		chunks = append(chunks, fileTail.lines)
		remaining -= len(fileTail.lines)
	}

	for i := len(chunks) - 1; i >= 0; i-- {
		snapshot.lines = append(snapshot.lines, chunks[i]...)
	}
	return snapshot, nil
}

func readFileTail(path string, maxLines int) (snapshot tailFileSnapshot, err error) {
	//nolint:gosec // G304: path comes from the configured log directory and app-manager log filename pattern.
	file, err := os.Open(path)
	if err != nil {
		return tailFileSnapshot{}, fmt.Errorf("open app-manager log: %w", err)
	}
	defer func() {
		if closeErr := file.Close(); err == nil && closeErr != nil {
			err = fmt.Errorf("close app-manager log: %w", closeErr)
		}
	}()

	info, err := file.Stat()
	if err != nil {
		return tailFileSnapshot{}, fmt.Errorf("stat app-manager log: %w", err)
	}
	if info.IsDir() {
		return tailFileSnapshot{lines: nil, nextOffset: 0}, nil
	}

	return readFileTailFrom(file, info.Size(), maxLines)
}

func readFileTailFrom(file *os.File, size int64, maxLines int) (tailFileSnapshot, error) {
	if size == 0 {
		return tailFileSnapshot{lines: nil, nextOffset: 0}, nil
	}

	buf := make([]byte, 0, logScannerBufSize)
	chunk := make([]byte, logScannerBufSize)
	for start := size; start > 0; {
		nextStart, nextBuf, err := prependPreviousChunk(file, start, chunk, buf)
		if err != nil {
			return tailFileSnapshot{}, err
		}
		start = nextStart
		buf = nextBuf

		snapshot, done, err := tailSnapshotFromBuffer(buf, start, maxLines)
		if err != nil || done {
			return snapshot, err
		}
	}

	return tailFileSnapshot{lines: nil, nextOffset: 0}, nil
}

func prependPreviousChunk(file *os.File, start int64, chunk, buf []byte) (int64, []byte, error) {
	readSize := min(int64(len(chunk)), start)
	readLen := int(readSize)
	nextStart := start - readSize
	if _, err := file.ReadAt(chunk[:readLen], nextStart); err != nil && !errors.Is(err, io.EOF) {
		return 0, nil, fmt.Errorf("read app-manager log tail: %w", err)
	}

	nextBuf := make([]byte, readLen+len(buf))
	copy(nextBuf, chunk[:readLen])
	copy(nextBuf[readLen:], buf)
	return nextStart, nextBuf, nil
}

func tailSnapshotFromBuffer(buf []byte, start int64, maxLines int) (tailFileSnapshot, bool, error) {
	completeEnd := bytes.LastIndexByte(buf, '\n') + 1
	if completeEnd == 0 {
		if len(buf) > logScannerMaxSize {
			return tailFileSnapshot{}, false, errLogLineTooLong
		}
		return tailFileSnapshot{lines: nil, nextOffset: 0}, false, nil
	}

	complete := buf[:completeEnd]
	newlineCount := bytes.Count(complete, []byte{'\n'})
	if newlineCount <= maxLines && start > 0 {
		return tailFileSnapshot{lines: nil, nextOffset: 0}, false, nil
	}

	lines, err := tailLinesFromCompleteBytes(complete, maxLines)
	if err != nil {
		return tailFileSnapshot{}, false, err
	}
	return tailFileSnapshot{
		lines:      lines,
		nextOffset: start + int64(completeEnd),
	}, true, nil
}

func tailLinesFromCompleteBytes(data []byte, maxLines int) ([]string, error) {
	parts := bytes.Split(data, []byte{'\n'})
	if len(parts) == 0 {
		return nil, nil
	}
	parts = parts[:len(parts)-1]
	if len(parts) > maxLines {
		parts = parts[len(parts)-maxLines:]
	}

	lines := make([]string, 0, len(parts))
	for _, part := range parts {
		if len(part) > logScannerMaxSize {
			return nil, errLogLineTooLong
		}
		lines = append(lines, string(part))
	}
	return lines, nil
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
