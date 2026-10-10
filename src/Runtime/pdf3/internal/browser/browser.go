package browser

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"os"
	"os/exec"
	"sort"
	"strings"
	"syscall"
	"time"

	"altinn.studio/pdf3/internal/assert"
	"altinn.studio/pdf3/internal/log"
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
	logger := log.NewComponent("browser").With("id", id)
	args := createBrowserArgs()

	logger.Info("Starting browser", "path", browserPath)

	var dataDir string
	for i, arg := range args {
		if strings.HasPrefix(arg, "--user-data-dir=") {
			dataDir = fmt.Sprintf("/tmp/browser-%d", id)
			args[i] = "--user-data-dir=" + dataDir
		}
	}
	assert.That(dataDir != "", "Should always initialize dataDir", "id", id)

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
	// Unlike a debugging port, nothing else on the host (or a compromised renderer) can connect.
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
		logger.Warn("Failed to close browser pipe", "error", err)
	}
}

type cmdToLogger struct {
	logger *slog.Logger
}

func (l *cmdToLogger) Write(p []byte) (int, error) {
	l.logger.Info("Browser process stdout/stderr", "message", string(p))
	return len(p), nil
}

// Close terminates the browser process and removes its data directory.
//
//nolint:gocognit,nestif // Process shutdown needs to keep the signal and wait flow together.
func (p *Process) Close() error {
	logger := log.NewComponent("browser").With("dataDir", p.DataDir)
	logger.Info("Closing browser process")
	closePipe(p.Reader, logger)
	closePipe(p.Writer, logger)

	if p.Cmd != nil && p.Cmd.Process != nil {
		pgid, err := syscall.Getpgid(p.Cmd.Process.Pid)
		if err != nil {
			logger.Info("Failed to get process group ID", "error", err)
			pgid = 0
		} else {
			logger.Info("Got process group ID", "pgid", pgid)
		}

		if pgid > 0 {
			if killErr := syscall.Kill(-pgid, syscall.SIGTERM); killErr != nil {
				logger.Info("Failed to send SIGTERM to browser process group", "error", killErr)
			}
		} else {
			if signalErr := p.Cmd.Process.Signal(syscall.SIGTERM); signalErr != nil {
				logger.Info("Failed to send SIGTERM to browser process", "error", signalErr)
			}
		}

		done := make(chan error, 1)
		go func() {
			err := p.Cmd.Wait()
			done <- err
			logger.Info("Browser exited", "error", err)
		}()

		select {
		case <-done:
			logger.Info("Browser exited gracefully after SIGTERM")
		case <-time.After(100 * time.Millisecond):
			logger.Info("Browser did not exit after SIGTERM, sending SIGKILL")
			if pgid > 0 {
				if killErr := syscall.Kill(-pgid, syscall.SIGKILL); killErr != nil {
					logger.Info("Failed to send SIGKILL to browser process group", "error", killErr)
				}
			} else {
				if killErr := p.Cmd.Process.Kill(); killErr != nil {
					logger.Info("Failed to SIGKILL browser process", "error", killErr)
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
	assert.That(err == nil, "couldn't remove dataDir", "dataDir", p.DataDir, "error", err)
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
			logger.Info("Failed to remove dataDir, retrying", "attempt", i+1, "error", lastErr)
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
		// SplitCacheByNetworkIsolationKey: Chrome can partition its HTTP cache by top-level site, so
		// that one site can't probe which resources another site loaded. The headless shell doesn't
		// enable this today, and it must stay off: the assets warmed into a prepared context (see
		// internal/generator/prewarm.go) are loaded from about:blank, and the request's page must
		// find them in the cache. Partitioning protects nothing here, because every browser context
		// belongs to a single request and is disposed after it, so there is no other site's history
		// to probe.
		"--disable-features=site-per-process,Translate,BlinkGenPropertyTrees,SplitCacheByNetworkIsolationKey",
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
		"--remote-debugging-pipe",
		"--safebrowsing-disable-auto-update",
		"--use-mock-keychain",
		"--user-data-dir=/tmp/browser-init",
	}
}

// logArgs logs browser arguments in a sorted, JSON format.
func logArgs(logger *slog.Logger, id int, args []string) {
	sortedArgs := make([]string, len(args))
	copy(sortedArgs, args)
	sort.Strings(sortedArgs)
	argsAsJson, err := json.MarshalIndent(sortedArgs, "", "  ")
	assert.That(err == nil, "Failed to marshal browser args to JSON", "id", id, "error", err)
	logger.Info("Browser args", "args", string(argsAsJson))
}
