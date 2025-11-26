package browser

import (
	"encoding/json"
	"fmt"
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

// Process represents a running browser process with its connection details
type Process struct {
	Cmd          *exec.Cmd
	DebugPort    string
	DebugBaseURL string
	DataDir      string
}

// Start creates and starts a new Chrome/Chromium headless browser process
// id: identifier for this browser instance (-1 for temporary/init processes)
func Start(id int) (*Process, error) {
	logger := log.NewComponent("browser").With("id", id)
	args := createBrowserArgs()

	// Override user data directory for this worker and set specific port
	debugPort := 5050 + id
	if id == -1 {
		debugPort = 5049 // Special case for init worker
	}

	logger.Info("Starting browser", "path", browserPath, "port", debugPort)

	var dataDir string
	for i, arg := range args {
		if strings.HasPrefix(arg, "--user-data-dir=") {
			if id >= 0 {
				dataDir = fmt.Sprintf("/tmp/browser-%d", id)
				args[i] = fmt.Sprintf("--user-data-dir=%s", dataDir)
			} else {
				dataDir = "/tmp/browser-init"
				args[i] = "--user-data-dir=/tmp/browser-init"
			}
		}
		if strings.HasPrefix(arg, "--remote-debugging-port=") {
			args[i] = fmt.Sprintf("--remote-debugging-port=%d", debugPort)
		}
	}
	assert.AssertWithMessage(dataDir != "", "Should always initialize dataDir", "id", id)

	// Add about:blank argument to create default page target
	args = append(args, "about:blank")

	// Only log args for the init worker (id == -1)
	if id == -1 {
		logArgs(logger, id, args)
	}

	cmd := exec.Command(browserPath, args...)
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	debugPortStr := fmt.Sprintf("%d", debugPort)
	debugBaseURL := fmt.Sprintf("http://127.0.0.1:%d", debugPort)
	cmdLogger := &cmdToLogger{logger: logger}
	cmd.Stdout = cmdLogger
	cmd.Stderr = cmdLogger

	// Start the browser process
	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("failed to start browser process: %w", err)
	}

	return &Process{
		Cmd:          cmd,
		DebugPort:    debugPortStr,
		DebugBaseURL: debugBaseURL,
		DataDir:      dataDir,
	}, nil
}

type cmdToLogger struct {
	logger *slog.Logger
}

func (l *cmdToLogger) Write(p []byte) (int, error) {
	l.logger.Info("Browser process stdout/stderr", "message", string(p))
	return len(p), nil
}

// Close terminates the browser process and removes its data directory
func (p *Process) Close() error {
	logger := log.NewComponent("browser").With("dataDir", p.DataDir)
	logger.Info("Closing browser process")

	if p.Cmd != nil && p.Cmd.Process != nil {
		pgid, err := syscall.Getpgid(p.Cmd.Process.Pid)
		if err != nil {
			logger.Info("Failed to get process group ID", "error", err)
			pgid = 0
		} else {
			logger.Info("Got process group ID", "pgid", pgid)
		}

		if pgid > 0 {
			_ = syscall.Kill(-pgid, syscall.SIGTERM)
		} else {
			_ = p.Cmd.Process.Signal(syscall.SIGTERM)
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
				_ = syscall.Kill(-pgid, syscall.SIGKILL)
			} else {
				_ = p.Cmd.Process.Kill()
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
	assert.AssertWithMessage(err == nil, "couldn't remove dataDir", "dataDir", p.DataDir, "error", err)
	return nil
}

// removeDataDirWithRetry attempts to remove the data directory with retries
// to handle race conditions where child processes may still hold file handles
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
	return lastErr
}

// createBrowserArgs returns the Chrome/Chromium arguments for headless PDF generation
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
		"--force-color-profile=srgb",
		"--headless",
		"--hide-scrollbars",
		"--metrics-recording-only",
		"--mute-audio",
		"--no-default-browser-check",
		"--no-first-run",
		"--no-sandbox",
		"--password-store=basic",
		"--remote-debugging-port=0",
		"--safebrowsing-disable-auto-update",
		"--use-mock-keychain",
		"--user-data-dir=/tmp/browser-init",
	}
}

// logArgs logs browser arguments in a sorted, JSON format
func logArgs(logger *slog.Logger, id int, args []string) {
	sortedArgs := make([]string, len(args))
	copy(sortedArgs, args)
	sort.Strings(sortedArgs)
	argsAsJson, err := json.MarshalIndent(sortedArgs, "", "  ")
	assert.AssertWithMessage(err == nil, "Failed to marshal browser args to JSON", "id", id, "error", err)
	logger.Info("Browser args", "args", string(argsAsJson))
}
