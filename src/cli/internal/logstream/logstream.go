// Package logstream provides shared file log tailing and following.
package logstream

import (
	"bufio"
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"time"
)

const (
	// ScannerBufSize is the initial scanner buffer size used for log lines.
	ScannerBufSize = 64 * 1024
	// ScannerMaxSize is the maximum supported size for one log line.
	ScannerMaxSize = 1024 * 1024
	// PollInterval controls how often followed files are checked for appended lines.
	PollInterval = 200 * time.Millisecond
)

var (
	// ErrLineTooLong is returned when a log line exceeds ScannerMaxSize.
	ErrLineTooLong = errors.New("log line exceeds max size")
	// ErrNoLogFiles is returned when no files are available and follow mode is disabled.
	ErrNoLogFiles = errors.New("log files not found")
)

// File describes one log file available to the streamer.
type File struct {
	ModTime time.Time
	Path    string
	Size    int64
}

// Options configures file log streaming.
type Options struct {
	Tail    int
	TailAll bool
	Follow  bool
}

// Streamer tails and follows files returned by ListFiles.
type Streamer struct {
	ListFiles func() ([]File, error)
	Emit      func(path string, line string) error
}

type tailSnapshot struct {
	nextOffsetByPath map[string]int64
	lines            []tailLine
}

type tailLine struct {
	path string
	text string
}

type tailFileSnapshot struct {
	lines      []string
	nextOffset int64
}

// Stream emits tailed lines and optionally follows future appended lines.
func (s Streamer) Stream(ctx context.Context, opts Options) error {
	files, err := s.ListFiles()
	if err != nil {
		return err
	}
	if len(files) == 0 && !opts.Follow {
		return ErrNoLogFiles
	}

	offsets, err := s.emitInitial(files, opts)
	if err != nil {
		return err
	}

	if !opts.Follow {
		return nil
	}
	return s.follow(ctx, offsets)
}

func (s Streamer) emitInitial(files []File, opts Options) (map[string]int64, error) {
	if opts.TailAll {
		return s.emitAll(files)
	}

	snapshot, err := readTailSnapshot(logFilePaths(files), opts.Tail)
	if err != nil {
		return nil, err
	}
	offsets := initialOffsets(files, snapshot)
	for _, line := range snapshot.lines {
		if err := s.Emit(line.path, line.text); err != nil {
			return nil, err
		}
	}
	return offsets, nil
}

func (s Streamer) emitAll(files []File) (map[string]int64, error) {
	offsetByPath := make(map[string]int64, len(files))
	for _, candidate := range files {
		file, err := os.Open(candidate.Path)
		if err != nil {
			return nil, fmt.Errorf("open log: %w", err)
		}
		offset, scanErr := scanCompleteLines(file, 0, func(line string) error {
			return s.Emit(candidate.Path, line)
		})
		closeErr := file.Close()
		if scanErr != nil {
			return nil, scanErr
		}
		if closeErr != nil {
			return nil, fmt.Errorf("close log: %w", closeErr)
		}
		offsetByPath[candidate.Path] = offset
	}
	return offsetByPath, nil
}

func (s Streamer) follow(ctx context.Context, offsetByPath map[string]int64) error {
	ticker := time.NewTicker(PollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
			if err := s.printChangedFiles(offsetByPath); err != nil {
				return err
			}
		}
	}
}

func logFilePaths(files []File) []string {
	paths := make([]string, 0, len(files))
	for _, file := range files {
		paths = append(paths, file.Path)
	}
	return paths
}

func initialOffsets(files []File, snapshot tailSnapshot) map[string]int64 {
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

func (s Streamer) printChangedFiles(offsetByPath map[string]int64) error {
	files, err := s.ListFiles()
	if err != nil {
		return err
	}

	for _, file := range files {
		offset := offsetByPath[file.Path]
		nextOffset, err := s.printAppended(file.Path, offset)
		if err != nil {
			return err
		}
		offsetByPath[file.Path] = nextOffset
	}
	return nil
}

func (s Streamer) printAppended(path string, offset int64) (int64, error) {
	size, ok, err := fileSize(path)
	if err != nil {
		return offset, err
	}
	if !ok {
		return offset, nil
	}
	if size < offset {
		offset = 0
	} else if size == offset {
		return offset, nil
	}

	//nolint:gosec // G304: path comes from a caller-provided log file list.
	file, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return offset, nil
		}
		return offset, fmt.Errorf("open log: %w", err)
	}
	defer func() {
		ignoreError(file.Close())
	}()

	nextOffset, err := scanCompleteLines(file, offset, func(line string) error {
		return s.Emit(path, line)
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

	chunks := make([][]tailLine, 0, len(paths))
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
		lines := make([]tailLine, 0, len(fileTail.lines))
		for _, line := range fileTail.lines {
			lines = append(lines, tailLine{path: path, text: line})
		}
		chunks = append(chunks, lines)
		remaining -= len(lines)
	}

	for i := len(chunks) - 1; i >= 0; i-- {
		snapshot.lines = append(snapshot.lines, chunks[i]...)
	}
	return snapshot, nil
}

func readFileTail(path string, maxLines int) (snapshot tailFileSnapshot, err error) {
	//nolint:gosec // G304: path comes from a caller-provided log file list.
	file, err := os.Open(path)
	if err != nil {
		return tailFileSnapshot{}, fmt.Errorf("open log: %w", err)
	}
	defer func() {
		if closeErr := file.Close(); err == nil && closeErr != nil {
			err = fmt.Errorf("close log: %w", closeErr)
		}
	}()

	info, err := file.Stat()
	if err != nil {
		return tailFileSnapshot{}, fmt.Errorf("stat log: %w", err)
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

	buf := make([]byte, 0, ScannerBufSize)
	chunk := make([]byte, ScannerBufSize)
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
		return 0, nil, fmt.Errorf("read log tail: %w", err)
	}

	nextBuf := make([]byte, readLen+len(buf))
	copy(nextBuf, chunk[:readLen])
	copy(nextBuf[readLen:], buf)
	return nextStart, nextBuf, nil
}

func tailSnapshotFromBuffer(buf []byte, start int64, maxLines int) (tailFileSnapshot, bool, error) {
	completeEnd := bytes.LastIndexByte(buf, '\n') + 1
	if completeEnd == 0 {
		if len(buf) > ScannerMaxSize {
			return tailFileSnapshot{}, false, ErrLineTooLong
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
		if len(part) > ScannerMaxSize {
			return nil, ErrLineTooLong
		}
		lines = append(lines, string(part))
	}
	return lines, nil
}

func scanCompleteLines(file *os.File, offset int64, emit func(string) error) (int64, error) {
	if _, err := file.Seek(offset, io.SeekStart); err != nil {
		return offset, fmt.Errorf("seek log: %w", err)
	}

	reader := bufio.NewReaderSize(file, ScannerBufSize)
	nextOffset := offset
	line := make([]byte, 0, ScannerBufSize)

	for {
		fragment, err := reader.ReadSlice('\n')
		if len(line)+len(fragment) > ScannerMaxSize {
			return nextOffset, ErrLineTooLong
		}
		line = append(line, fragment...)

		switch {
		case errors.Is(err, bufio.ErrBufferFull):
			continue
		case errors.Is(err, io.EOF):
			return nextOffset, nil
		case err != nil:
			return nextOffset, fmt.Errorf("read log: %w", err)
		}

		nextOffset += int64(len(line))
		if err := emit(string(bytes.TrimSuffix(line, []byte{'\n'}))); err != nil {
			return nextOffset, err
		}
		line = line[:0]
	}
}

func fileSize(path string) (int64, bool, error) {
	info, err := os.Stat(path)
	if err != nil {
		if os.IsNotExist(err) {
			return 0, false, nil
		}
		return 0, false, fmt.Errorf("stat log: %w", err)
	}
	if info.IsDir() {
		return 0, false, nil
	}
	return info.Size(), true, nil
}

func ignoreError(error) {
}
