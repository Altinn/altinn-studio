package kubernetes

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
	"sync"
	"syscall"
	"time"
)

// ClusterInfo contains information about a cluster
type ClusterInfo struct {
	Name         string
	ServiceOwner string
	Environment  string
}

// LogLine represents a single log line with metadata
type LogLine struct {
	Timestamp    time.Time
	ClusterName  string
	ServiceOwner string
	Environment  string
	PodName      string
	Message      string
}

// ExtractServiceOwnerAndEnvironment extracts serviceowner and environment from cluster name
// Expected format: <serviceowner>-<environment>-aks (e.g., ttd-tt02-aks)
func ExtractServiceOwnerAndEnvironment(clusterName string) (string, string) {
	// Pattern: <serviceowner>-<environment>-aks
	parts := strings.Split(clusterName, "-")
	if len(parts) >= 3 && parts[len(parts)-1] == "aks" {
		environment := parts[len(parts)-2]
		serviceowner := strings.Join(parts[:len(parts)-2], "-")
		return serviceowner, environment
	}
	// Fallback if pattern doesn't match
	return "unknown", "unknown"
}

// GetPodsForDeployment retrieves all pod names for a deployment
func GetPodsForDeployment(ctx context.Context, clusterName, namespace, deploymentName string) ([]string, error) {
	// First, get the deployment to find its label selector
	cmd := exec.CommandContext(ctx,
		"kubectl", "get", "deployment", deploymentName,
		"-n", namespace,
		"--context", clusterName,
		"-o", "json",
	)

	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to get deployment: %w", err)
	}

	// Parse deployment to get label selector
	var deployment struct {
		Spec struct {
			Selector struct {
				MatchLabels map[string]string `json:"matchLabels"`
			} `json:"selector"`
		} `json:"spec"`
	}

	if err := json.Unmarshal(output, &deployment); err != nil {
		return nil, fmt.Errorf("failed to parse deployment: %w", err)
	}

	// Build label selector string from matchLabels
	var labelSelectors []string
	for key, value := range deployment.Spec.Selector.MatchLabels {
		labelSelectors = append(labelSelectors, fmt.Sprintf("%s=%s", key, value))
	}

	if len(labelSelectors) == 0 {
		return nil, fmt.Errorf("deployment %s has no label selectors", deploymentName)
	}

	labelSelector := strings.Join(labelSelectors, ",")

	// Now get pods using the deployment's label selector
	cmd = exec.CommandContext(ctx,
		"kubectl", "get", "pods",
		"-n", namespace,
		"-l", labelSelector,
		"--context", clusterName,
		"-o", "json",
	)

	output, err = cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to get pods: %w", err)
	}

	// Parse JSON response
	var result struct {
		Items []struct {
			Metadata struct {
				Name string `json:"name"`
			} `json:"metadata"`
		} `json:"items"`
	}

	if err := json.Unmarshal(output, &result); err != nil {
		return nil, fmt.Errorf("failed to parse pod list: %w", err)
	}

	var podNames []string
	for _, item := range result.Items {
		podNames = append(podNames, item.Metadata.Name)
	}

	if len(podNames) == 0 {
		return nil, fmt.Errorf("no pods found for deployment %s in namespace %s (selector: %s)", deploymentName, namespace, labelSelector)
	}

	return podNames, nil
}

// streamLogsFromCluster streams logs from all pods in a cluster to a channel
func streamLogsFromCluster(ctx context.Context, cluster ClusterInfo, namespace, deploymentName string, logsChan chan<- LogLine, since *string, tail *int, follow bool, errorsChan chan<- error) {
	// Get pods for the deployment
	pods, err := GetPodsForDeployment(ctx, cluster.Name, namespace, deploymentName)
	if err != nil {
		errorsChan <- fmt.Errorf("[%s] %w", cluster.Name, err)
		return
	}

	// Stream logs from each pod concurrently
	var wg sync.WaitGroup
	for _, podName := range pods {
		wg.Add(1)
		go func(pod string) {
			defer wg.Done()
			streamPodLogs(ctx, cluster, namespace, pod, logsChan, since, tail, follow, errorsChan)
		}(podName)
	}

	wg.Wait()
}

// streamPodLogs streams logs from a single pod
func streamPodLogs(ctx context.Context, cluster ClusterInfo, namespace, podName string, logsChan chan<- LogLine, since *string, tail *int, follow bool, errorsChan chan<- error) {
	args := []string{
		"logs", podName,
		"-n", namespace,
		"--context", cluster.Name,
		"--timestamps",
	}

	// Only add --since if specified
	if since != nil && *since != "" {
		args = append(args, "--since", *since)
	}

	// Only add --tail if specified (and valid)
	if tail != nil && *tail >= 0 {
		args = append(args, "--tail", fmt.Sprintf("%d", *tail))
	}

	if follow {
		args = append(args, "--follow")
	}

	cmd := exec.CommandContext(ctx, "kubectl", args...)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		errorsChan <- fmt.Errorf("[%s/%s] failed to create stdout pipe: %w", cluster.Name, podName, err)
		return
	}

	if err := cmd.Start(); err != nil {
		errorsChan <- fmt.Errorf("[%s/%s] failed to start kubectl: %w", cluster.Name, podName, err)
		return
	}

	// Parse log lines as they come
	scanner := bufio.NewScanner(stdout)
	timestampRegex := regexp.MustCompile(`^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)\s+(.*)$`)

	for scanner.Scan() {
		line := scanner.Text()
		matches := timestampRegex.FindStringSubmatch(line)

		if len(matches) == 3 {
			timestamp, err := time.Parse(time.RFC3339Nano, matches[1])
			if err != nil {
				// Try without nanoseconds
				timestamp, err = time.Parse(time.RFC3339, matches[1])
				if err != nil {
					errorsChan <- fmt.Errorf("[%s/%s] couldn't parse timestamp in line: %s", cluster.Name, podName, line)
					continue
				}
			}

			logLine := LogLine{
				Timestamp:    timestamp.UTC(),
				ClusterName:  cluster.Name,
				ServiceOwner: cluster.ServiceOwner,
				Environment:  cluster.Environment,
				PodName:      podName,
				Message:      matches[2],
			}

			select {
			case logsChan <- logLine:
			case <-ctx.Done():
				return
			}
		} else {
			errorsChan <- fmt.Errorf("[%s/%s] invalid log line: %s", cluster.Name, podName, line)
		}
	}

	if err := scanner.Err(); err != nil && ctx.Err() == nil {
		errorsChan <- fmt.Errorf("[%s/%s] scanner error: %w", cluster.Name, podName, err)
	}

	if err := cmd.Wait(); err != nil && ctx.Err() == nil {
		// Only report error if context wasn't cancelled
		if exitErr, ok := err.(*exec.ExitError); ok {
			errorsChan <- fmt.Errorf("[%s/%s] kubectl exited with code %d", cluster.Name, podName, exitErr.ExitCode())
		}
	}
}

// AggregateLogsWithBuffer aggregates logs from multiple clusters with time buffering
func AggregateLogsWithBuffer(clusters []ClusterInfo, namespace, deploymentName, outputFile string, since *string, tail *int, follow bool, includeTimestamps bool, bufferDuration time.Duration) error {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle SIGINT for graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigChan
		fmt.Println("\n\nReceived interrupt signal, flushing remaining logs...")
		cancel()
	}()

	// Create output file
	parentDir := filepath.Dir(outputFile)
	err := os.MkdirAll(parentDir, 0755)
	if err != nil {
		return fmt.Errorf("failed to ensure dir for output file: %w", err)
	}
	file, err := os.Create(outputFile)
	if err != nil {
		return fmt.Errorf("failed to create output file: %w", err)
	}
	defer file.Close()

	logsChan := make(chan LogLine, 1024*4)
	errorsChan := make(chan error, 512)

	// Start log streaming from all clusters
	var wg sync.WaitGroup
	for _, cluster := range clusters {
		wg.Add(1)
		go func(c ClusterInfo) {
			defer wg.Done()
			streamLogsFromCluster(ctx, c, namespace, deploymentName, logsChan, since, tail, follow, errorsChan)
		}(cluster)
	}

	// Close channels when all streams complete
	go func() {
		wg.Wait()
		close(logsChan)
		close(errorsChan)
	}()

	// Print errors in background
	go func() {
		for err := range errorsChan {
			fmt.Fprintf(os.Stderr, "Warning: %v\n", err)
		}
	}()

	sequencer := newResequencer(bufferDuration)
	ticker := time.NewTicker(bufferDuration)
	defer ticker.Stop()

	done := false
	writer := bufio.NewWriter(file)

	flush := func() error {
		sequencer.resequence()
		next := sequencer.next()
		if len(next) > 0 {
			for _, line := range next {
				var err error
				if includeTimestamps {
					_, err = fmt.Fprintf(writer, "[%s-%s] [%s] %s %s\n",
						line.ServiceOwner,
						line.Environment,
						line.PodName,
						line.Timestamp.Local().Format(time.RFC3339Nano),
						line.Message)
				} else {
					_, err = fmt.Fprintf(writer, "[%s-%s] [%s] %s\n",
						line.ServiceOwner,
						line.Environment,
						line.PodName,
						line.Message)
				}
				if err != nil {
					return fmt.Errorf("failed to write log line: %w", err)
				}
			}
			if err := writer.Flush(); err != nil {
				return fmt.Errorf("failed to flush logs: %w", err)
			}
		}
		return nil
	}

	for !done {
		select {
		case logLine, ok := <-logsChan:
			if !ok {
				done = true
				break
			}
			sequencer.append(&logLine)

		case <-ticker.C:
			err := flush()
			if err != nil {
				return err
			}

		case <-ctx.Done():
			done = true
		}
	}

	if err := flush(); err != nil {
		return fmt.Errorf("failed to flush on completion: %w", err)
	}

	return nil
}

type reSequencer struct {
	buffer         []LogLine
	writerPos      int
	readerPos      int
	availablePos   int
	bufferDuration time.Duration
}

func newResequencer(bufferDuration time.Duration) *reSequencer {
	return &reSequencer{
		buffer:         make([]LogLine, 0, 1024*4),
		writerPos:      0,
		readerPos:      0,
		availablePos:   0,
		bufferDuration: bufferDuration,
	}
}

func (r *reSequencer) append(line *LogLine) {
	r.buffer = append(r.buffer, *line)
	r.writerPos += 1
}

func (r *reSequencer) resequence() {
	if r.availablePos == r.writerPos {
		return
	}

	treshold := time.Now().UTC().Add(-r.bufferDuration)
	i := r.availablePos
	for ; i < r.writerPos; i++ {
		if r.buffer[i].Timestamp.Before(treshold) {
			continue
		}
		break
	}

	if i == r.availablePos {
		return
	}

	slices.SortFunc(r.buffer[r.availablePos:i], func(a LogLine, b LogLine) int {
		return a.Timestamp.Compare(b.Timestamp)
	})

	r.availablePos = i
}

func (r *reSequencer) next() []LogLine {
	if r.availablePos-r.readerPos == 0 {
		return nil
	}
	result := r.buffer[r.readerPos:r.availablePos]
	r.readerPos = r.availablePos
	return result
}
