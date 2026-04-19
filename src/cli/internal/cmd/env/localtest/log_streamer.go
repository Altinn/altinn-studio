package localtest

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"sync"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/studioctl/internal/ui"
)

const (
	logScannerBufSize    = 64 * 1024
	logScannerMaxBufSize = 1024 * 1024
)

type logStreamer struct {
	client container.ContainerClient
	out    *ui.Output
}

type logLine struct {
	Component string `json:"component"`
	Line      string `json:"line"`
	Prefix    string `json:"-"`
	JSON      bool   `json:"-"`
}

func (l logLine) Print(out *ui.Output) error {
	if !l.JSON {
		out.Println(l.Prefix + l.Line)
		return nil
	}

	payload, err := json.Marshal(l)
	if err != nil {
		return fmt.Errorf("marshal log line json: %w", err)
	}
	out.Println(string(payload))
	return nil
}

func newLogStreamer(client container.ContainerClient, out *ui.Output) *logStreamer {
	return &logStreamer{
		client: client,
		out:    out,
	}
}

func (s *logStreamer) Stream(ctx context.Context, component string, follow, jsonOutput bool) error {
	allContainers := AllContainerNames(true)

	var containers []string
	if component != "" {
		for _, name := range allContainers {
			if name == component {
				containers = []string{name}
				break
			}
		}
		if len(containers) == 0 {
			return fmt.Errorf(
				"%w: %s (available: %s, %s, monitoring_*)",
				ErrUnknownComponent,
				component,
				ContainerLocaltest,
				ContainerPDF3,
			)
		}
	} else {
		containers = allContainers
	}

	var runningContainers []string
	for _, name := range containers {
		state, err := s.client.ContainerState(ctx, name)
		if err != nil {
			continue // container doesn't exist
		}
		if state.Running {
			runningContainers = append(runningContainers, name)
		}
	}

	if len(runningContainers) == 0 {
		return fmt.Errorf("%w: no containers are running", ErrNotRunning)
	}

	s.out.Verbosef("Streaming logs from: %v", runningContainers)

	var wg sync.WaitGroup
	for i, name := range runningContainers {
		logs, err := s.client.ContainerLogs(ctx, name, follow, "100")
		if err != nil {
			s.out.Warningf("Failed to get logs for %s: %v", name, err)
			continue
		}

		wg.Add(1)
		go s.streamContainerLogs(ctx, &wg, logs, name, i, jsonOutput)
	}

	wg.Wait()
	return nil
}

func (s *logStreamer) streamContainerLogs(
	ctx context.Context,
	wg *sync.WaitGroup,
	logs io.ReadCloser,
	name string,
	colorIdx int,
	jsonOutput bool,
) {
	defer wg.Done()
	defer func() {
		if err := logs.Close(); err != nil {
			s.out.Verbosef("failed to close log stream for %s: %v", name, err)
		}
	}()

	prefix := s.out.ContainerPrefix(name, colorIdx)

	scanner := bufio.NewScanner(logs)
	buf := make([]byte, logScannerBufSize)
	scanner.Buffer(buf, logScannerMaxBufSize)

	for scanner.Scan() {
		select {
		case <-ctx.Done():
			return
		default:
			if err := (logLine{
				Component: name,
				Line:      scanner.Text(),
				Prefix:    prefix,
				JSON:      jsonOutput,
			}).Print(s.out); err != nil {
				s.out.Warningf("Failed to print log line for %s: %v", name, err)
			}
		}
	}
}
