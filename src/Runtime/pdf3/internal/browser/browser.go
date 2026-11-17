package browser

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"os"
	"os/exec"
	"sort"
	"syscall"
	"time"

	"altinn.studio/pdf3/internal/assert"
	"altinn.studio/pdf3/internal/log"
	"altinn.studio/pdf3/internal/telemetry"
	"altinn.studio/pdf3/internal/telemetry/attr"
)

const browserPath string = "/headless-shell/headless-shell"

// Process represents a running browser process with its connection details.
type Process struct {
	Cmd *exec.Cmd
	// Reader receives the browser's CDP messages and Writer sends it commands (--remote-debugging-pipe)
	Reader  io.ReadCloser
	Writer  io.WriteCloser
	DataDir string
}

// Start creates and starts a new Chrome/Chromium headless browser process
// id: identifier for this browser instance
func Start(id int) (*Process, error) {
	logger := log.NewComponent("browser").With(attr.SessionID, id)
	dataDir := fmt.Sprintf("/tmp/browser-%d", id)
	args := append(createBrowserArgs(), "--user-data-dir="+dataDir)

	logger.Info("Starting browser", attr.BrowserPath, browserPath)

	// No start URL: every request opens its own page in its own browser context

	// The arguments are the same for every browser, log them once
	if id == 1 {
		logArgs(logger, id, args)
	}

	//nolint:gosec // browserPath is a fixed local binary path and args are locally constructed.
	cmd := exec.CommandContext(context.Background(), browserPath, args...)
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	cmdLogger := &cmdToLogger{logger: logger}
	cmd.Stdout = cmdLogger
	cmd.Stderr = cmdLogger

	// With --remote-debugging-pipe the browser reads commands from fd 3 and writes to fd 4.
	// Unlike a debugging port, there is nothing for other processes in the pod to connect to. It is
	// not a boundary against a compromised renderer: without the sandbox, a process running as the
	// same user can still write to the browser's fd 3 through /proc.
	commandReader, commandWriter, err := os.Pipe()
	if err != nil {
		return nil, fmt.Errorf("create browser command pipe: %w", err)
	}
	responseReader, responseWriter, err := os.Pipe()
	if err != nil {
		closePipe(commandReader, logger)
		closePipe(commandWriter, logger)
		return nil, fmt.Errorf("create browser response pipe: %w", err)
	}
	cmd.ExtraFiles = []*os.File{commandReader, responseWriter}
	err = cmd.Start()
	// The child owns its ends after Start. Keeping copies here would stop either side from
	// seeing EOF when the other process exits.
	closePipe(commandReader, logger)
	closePipe(responseWriter, logger)
	if err != nil {
		closePipe(commandWriter, logger)
		closePipe(responseReader, logger)
		return nil, fmt.Errorf("failed to start browser process: %w", err)
	}

	return &Process{
		Cmd:     cmd,
		Reader:  responseReader,
		Writer:  commandWriter,
		DataDir: dataDir,
	}, nil
}

func closePipe(pipe io.Closer, logger *slog.Logger) {
	if err := pipe.Close(); err != nil && !errors.Is(err, os.ErrClosed) {
		logger.Warn("Failed to close browser pipe", attr.Error, err)
	}
}

// maxLoggedLine is how much of each line of browser output we log. Chrome echoes console messages
// to stderr, so a page logging a huge string would otherwise produce a huge log line.
const maxLoggedLine = 4096

// cmdToLogger logs the browser's output one line at a time, each cut off at maxLoggedLine. The
// browser's stdout and stderr share it, which os/exec copies from a single goroutine.
type cmdToLogger struct {
	logger  *slog.Logger
	line    []byte
	dropped int
}

func (l *cmdToLogger) Write(p []byte) (int, error) {
	written := len(p)
	for len(p) > 0 {
		end := bytes.IndexByte(p, '\n')
		part := p
		if end >= 0 {
			part = p[:end]
		}
		take := min(len(part), maxLoggedLine-len(l.line))
		l.line = append(l.line, part[:take]...)
		l.dropped += len(part) - take
		if end < 0 {
			break
		}
		l.flush()
		p = p[end+1:]
	}
	return written, nil
}

func (l *cmdToLogger) flush() {
	// Like page errors, without the query and fragment of any URL the browser logs
	message := telemetry.RedactURLsInText(string(l.line))
	if l.dropped > 0 {
		l.logger.Info(
			"Browser process stdout/stderr",
			attr.BrowserOutput, message,
			attr.BrowserOutputTruncatedBytes, l.dropped,
		)
	} else {
		l.logger.Info("Browser process stdout/stderr", attr.BrowserOutput, message)
	}
	l.line = l.line[:0]
	l.dropped = 0
}

// Close terminates the browser process and removes its data directory.
//
//nolint:gocognit,nestif // Process shutdown needs to keep the signal and wait flow together.
func (p *Process) Close() error {
	logger := log.NewComponent("browser").With(attr.BrowserDataDir, p.DataDir)
	logger.Info("Closing browser process")
	closePipe(p.Reader, logger)
	closePipe(p.Writer, logger)

	if p.Cmd != nil && p.Cmd.Process != nil {
		pgid, err := syscall.Getpgid(p.Cmd.Process.Pid)
		if err != nil {
			logger.Info("Failed to get process group ID", attr.Error, err)
			pgid = 0
		} else {
			logger.Info("Got process group ID", attr.BrowserPGID, pgid)
		}

		if pgid > 0 {
			if killErr := syscall.Kill(-pgid, syscall.SIGTERM); killErr != nil {
				logger.Info("Failed to send SIGTERM to browser process group", attr.Error, killErr)
			}
		} else {
			if signalErr := p.Cmd.Process.Signal(syscall.SIGTERM); signalErr != nil {
				logger.Info("Failed to send SIGTERM to browser process", attr.Error, signalErr)
			}
		}

		// The goroutine logs the exit error; done only signals that the browser exited.
		done := make(chan struct{})
		go func() {
			err := p.Cmd.Wait()
			logger.Info("Browser exited", attr.Error, err)
			close(done)
		}()

		select {
		case <-done:
			logger.Info("Browser exited gracefully after SIGTERM")
		case <-time.After(100 * time.Millisecond):
			logger.Info("Browser did not exit after SIGTERM, sending SIGKILL")
			if pgid > 0 {
				if killErr := syscall.Kill(-pgid, syscall.SIGKILL); killErr != nil {
					logger.Info("Failed to send SIGKILL to browser process group", attr.Error, killErr)
				}
			} else {
				if killErr := p.Cmd.Process.Kill(); killErr != nil {
					logger.Info("Failed to SIGKILL browser process", attr.Error, killErr)
				}
			}
			select {
			case <-done:
				logger.Info("Browser exited after SIGKILL")
			case <-time.After(100 * time.Millisecond):
				logger.Info("Did not observe browser exit after SIGKILL")
			}
		}
	}

	err := removeDataDirWithRetry(p.DataDir, logger)
	assert.That(err == nil, "couldn't remove dataDir", attr.BrowserDataDir, p.DataDir, attr.Error, err)
	return nil
}

// removeDataDirWithRetry attempts to remove the data directory with retries
// to handle race conditions where child processes may still hold file handles.
func removeDataDirWithRetry(dataDir string, logger *slog.Logger) error {
	const maxRetries = 5
	const retryDelay = 10 * time.Millisecond

	var lastErr error
	for i := range maxRetries {
		lastErr = os.RemoveAll(dataDir)
		if lastErr == nil {
			return nil
		}
		if i < maxRetries-1 {
			logger.Info("Failed to remove dataDir, retrying", attr.Attempt, i+1, attr.Error, lastErr)
		}
		time.Sleep(retryDelay)
	}
	return fmt.Errorf("remove browser data directory: %w", lastErr)
}

// createBrowserArgs returns the Chrome/Chromium arguments for headless PDF generation.
func createBrowserArgs() []string {
	return []string{
		"--disable-background-networking",
		"--disable-background-timer-throttling",
		"--disable-backgrounding-occluded-windows",
		"--disable-breakpad",
		"--disable-client-side-phishing-detection",
		"--disable-default-apps",
		"--disable-dev-shm-usage",
		"--disable-extensions",
		"--disable-features=site-per-process,Translate,BlinkGenPropertyTrees",
		"--disable-font-subpixel-positioning",
		"--disable-hang-monitor",
		"--disable-ipc-flooding-protection",
		"--disable-popup-blocking",
		"--disable-prompt-on-repost",
		"--disable-renderer-backgrounding",
		"--disable-sync",
		"--disable-gpu",
		"--disable-software-rasterizer",
		"--enable-automation",
		"--enable-features=NetworkService,NetworkServiceInProcess",
		"--font-render-hinting=none",
		// Keep Chromium rendering in sRGB: the PDF/A post-processor embeds an sRGB
		// output intent and assumes this renderer setting still defines the PDF's RGB space.
		"--force-color-profile=srgb",
		"--headless",
		"--hide-scrollbars",
		"--metrics-recording-only",
		"--mute-audio",
		"--no-default-browser-check",
		"--no-first-run",
		"--no-sandbox",
		"--password-store=basic",
		// Past this many renderer processes, Chrome reuses existing ones (within the same browser
		// context) instead of starting more. A render needs one or two. Without a limit, a page that
		// opens a few hundred popups exhausts the pod's process limit, and the next request's new
		// context can't get a renderer at all.
		"--renderer-process-limit=8",
		"--remote-debugging-pipe",
		"--safebrowsing-disable-auto-update",
		"--use-mock-keychain",
	}
}

// logArgs logs browser arguments in a sorted, JSON format.
func logArgs(logger *slog.Logger, id int, args []string) {
	sortedArgs := make([]string, len(args))
	copy(sortedArgs, args)
	sort.Strings(sortedArgs)
	argsAsJson, err := json.MarshalIndent(sortedArgs, "", "  ")
	assert.That(err == nil, "Failed to marshal browser args to JSON", attr.SessionID, id, attr.Error, err)
	logger.Info("Browser args", attr.BrowserArgs, string(argsAsJson))
}
