package harness

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"io"
	"strings"
	"sync"

	"altinn.studio/devenv/pkg/kubernetes"
	"altinn.studio/devenv/pkg/runtimes/kind"
)

// LogsCollector streams logs from pdf3 deployments and checks for assertion failures
type LogsCollector struct {
	runtime *kind.KindContainerRuntime

	// Log buffers and protection
	proxyLogs  bytes.Buffer
	workerLogs bytes.Buffer
	proxyMu    sync.Mutex
	workerMu   sync.Mutex

	// Contexts and commands for cleanup
	proxyCtx     context.Context
	workerCtx    context.Context
	proxyCancel  context.CancelFunc
	workerCancel context.CancelFunc
}

// NewLogsCollector creates a new LogsCollector for the given runtime
func NewLogsCollector(runtime *kind.KindContainerRuntime) *LogsCollector {
	return &LogsCollector{
		runtime: runtime,
	}
}

// Start begins streaming logs from pdf3-proxy and pdf3-worker deployments
func (lc *LogsCollector) Start() error {
	// Start streaming proxy logs
	lc.proxyCtx, lc.proxyCancel = context.WithCancel(context.Background())
	if err := lc.startStreaming(lc.proxyCtx, "app=pdf3-proxy", "pdf3-proxy", &lc.proxyLogs, &lc.proxyMu); err != nil {
		return fmt.Errorf("failed to start proxy log streaming: %w", err)
	}

	// Start streaming worker logs
	lc.workerCtx, lc.workerCancel = context.WithCancel(context.Background())
	if err := lc.startStreaming(lc.workerCtx, "app=pdf3-worker", "pdf3-worker", &lc.workerLogs, &lc.workerMu); err != nil {
		lc.proxyCancel() // Clean up proxy streaming
		return fmt.Errorf("failed to start worker log streaming: %w", err)
	}

	return nil
}

// startStreaming starts streaming logs to the buffer using the kubernetes client
func (lc *LogsCollector) startStreaming(ctx context.Context, labelSelector, containerName string, buffer *bytes.Buffer, mu *sync.Mutex) error {
	stream, err := lc.runtime.KubernetesClient.StreamLogs(ctx, kubernetes.StreamLogOptions{
		Namespace:     "runtime-pdf3",
		LabelSelector: labelSelector,
		ContainerName: containerName,
	})
	if err != nil {
		return fmt.Errorf("failed to start log streaming: %w", err)
	}

	go func() {
		defer func() {
			_ = stream.Close()
		}()
		reader := bufio.NewReader(stream)
		for {
			line, err := reader.ReadString('\n')
			if err != nil {
				if err != io.EOF {
					mu.Lock()
					_, _ = fmt.Fprintf(buffer, "[%s stream] error: %v\n", containerName, err)
					mu.Unlock()
				}
				return
			}
			mu.Lock()
			buffer.WriteString(line)
			mu.Unlock()
		}
	}()

	return nil
}

// Stop terminates log streaming
func (lc *LogsCollector) Stop() {
	if lc.proxyCancel != nil {
		lc.proxyCancel()
	}
	if lc.workerCancel != nil {
		lc.workerCancel()
	}
}

// crashPattern defines a pattern to search for in logs
type crashPattern struct {
	name    string
	pattern string
}

// crashPatterns defines all the crash patterns we check for
var crashPatterns = []crashPattern{
	{name: "Assertion failure", pattern: "Assertion failed:"},
	{name: "Panic", pattern: "panic:"},
	{name: "Fatal error", pattern: "fatal error:"},
	{name: "Runtime error", pattern: "runtime error:"},
	{name: "Segmentation violation", pattern: "segmentation violation"},
	{name: "Segmentation violation", pattern: "SIGSEGV"},
}

// CheckForCrashes scans collected logs for various crash patterns
// Returns an error with details if any crashes are found
func (lc *LogsCollector) CheckForCrashes() error {
	var failures []string

	// Check proxy logs
	lc.proxyMu.Lock()
	proxyLogs := lc.proxyLogs.String()
	lc.proxyMu.Unlock()

	proxyFailures := findCrashPatterns(proxyLogs, "pdf3-proxy")
	failures = append(failures, proxyFailures...)

	// Check worker logs
	lc.workerMu.Lock()
	workerLogs := lc.workerLogs.String()
	lc.workerMu.Unlock()

	workerFailures := findCrashPatterns(workerLogs, "pdf3-worker")
	failures = append(failures, workerFailures...)

	if len(failures) > 0 {
		return fmt.Errorf("detected crashes in pod logs:\n%s", strings.Join(failures, "\n---\n"))
	}

	return nil
}

// findCrashPatterns scans log content for various crash patterns
func findCrashPatterns(logContent, component string) []string {
	var failures []string
	lines := strings.Split(logContent, "\n")

	for i := 0; i < len(lines); i++ {
		line := lines[i]

		// Check if this line matches any crash pattern
		var matchedPattern *crashPattern
		for _, pattern := range crashPatterns {
			if strings.Contains(line, pattern.pattern) {
				matchedPattern = &pattern
				break
			}
		}

		if matchedPattern != nil {
			// Collect the crash line and the next 10 lines for context
			contextLines := []string{fmt.Sprintf("%s: %s", matchedPattern.name, line)}
			contextEnd := i + 10
			if contextEnd > len(lines) {
				contextEnd = len(lines)
			}
			for j := i + 1; j < contextEnd; j++ {
				contextLines = append(contextLines, lines[j])
			}
			failure := fmt.Sprintf("[%s] %s", component, strings.Join(contextLines, "\n"))
			failures = append(failures, failure)
			// Skip ahead past the context lines we just collected
			i = contextEnd - 1 // -1 because the loop will increment
		}
	}

	return failures
}
