// Package servers contains command-specific background server logic.
package servers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"altinn.studio/studioctl/internal/appmanager"
	"altinn.studio/studioctl/internal/logstream"
	"altinn.studio/studioctl/internal/ui"
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
	streamer := logstream.Streamer{
		ListFiles: func() ([]logstream.File, error) {
			files, err := appmanager.LogFiles(logDir)
			if err != nil {
				return nil, fmt.Errorf("find app-manager logs: %w", err)
			}
			return appManagerLogFiles(files), nil
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
			return errAppManagerLogsNotFound
		case errors.Is(err, logstream.ErrLineTooLong):
			return errLogLineTooLong
		default:
			return fmt.Errorf("stream app-manager logs: %w", err)
		}
	}
	return nil
}

func appManagerLogFiles(files []appmanager.LogFile) []logstream.File {
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
	return serverLogLine{
		Server: "app-manager",
		Line:   strings.TrimSuffix(line, "\r"),
		JSON:   jsonOutput,
	}.Print(out)
}
