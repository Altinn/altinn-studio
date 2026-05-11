// Package server contains command-specific studioctl server logic.
package server

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"altinn.studio/studioctl/internal/logstream"
	"altinn.studio/studioctl/internal/studioctlserver"
	"altinn.studio/studioctl/internal/ui"
)

var (
	errStudioctlServerLogsNotFound = errors.New("studioctl-server logs not found")
	errLogLineTooLong              = errors.New("studioctl-server log line exceeds max size")
)

// LogOptions configures studioctl-server log streaming.
type LogOptions struct {
	Tail   int
	Follow bool
	JSON   bool
}

type serverLogLine struct {
	Line string `json:"line"`
}

// StreamLogs writes studioctl-server log lines to the configured output.
func StreamLogs(ctx context.Context, logDir string, out *ui.Output, opts LogOptions) error {
	streamer := logstream.Streamer{
		ListFiles: func() ([]logstream.File, error) {
			files, err := studioctlserver.LogFiles(logDir)
			if err != nil {
				return nil, fmt.Errorf("find studioctl-server logs: %w", err)
			}
			return studioctlServerLogFiles(files), nil
		},
		Emit: func(_ string, line string) error {
			return printServerLogLine(out, line, opts.JSON)
		},
	}
	if err := streamer.Stream(ctx, logstream.Options{
		Tail:    opts.Tail,
		TailAll: false,
		Follow:  opts.Follow,
	}); err != nil {
		switch {
		case errors.Is(err, logstream.ErrNoLogFiles):
			return errStudioctlServerLogsNotFound
		case errors.Is(err, logstream.ErrLineTooLong):
			return errLogLineTooLong
		default:
			return fmt.Errorf("stream studioctl-server logs: %w", err)
		}
	}
	return nil
}

func studioctlServerLogFiles(files []studioctlserver.LogFile) []logstream.File {
	result := make([]logstream.File, 0, len(files))
	for _, file := range files {
		result = append(result, logstream.File{
			ModTime: file.ModTime,
			Path:    file.Path,
			Size:    file.Size,
		})
	}
	return result
}

func printServerLogLine(out *ui.Output, line string, jsonOutput bool) error {
	line = strings.TrimSuffix(line, "\r")
	if !jsonOutput {
		out.Println(line)
		return nil
	}

	payload, err := json.Marshal(serverLogLine{Line: line})
	if err != nil {
		return fmt.Errorf("marshal server log line: %w", err)
	}
	out.Println(string(payload))
	return nil
}
