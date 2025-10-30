package browser

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"os/exec"
	"sort"
	"strings"

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
	debugPortStr := fmt.Sprintf("%d", debugPort)
	debugBaseURL := fmt.Sprintf("http://127.0.0.1:%d", debugPort)

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

// Close terminates the browser process
func (p *Process) Close() error {
	if p.Cmd != nil && p.Cmd.Process != nil {
		if err := p.Cmd.Process.Kill(); err != nil {
			return fmt.Errorf("failed to kill browser process (PID %d): %w", p.Cmd.Process.Pid, err)
		}
		// Wait() error is expected (killed processes return error), so we can ignore it
		_ = p.Cmd.Wait()
	}
	return nil
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
