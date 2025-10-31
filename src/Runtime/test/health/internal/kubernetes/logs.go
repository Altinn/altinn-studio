package kubernetes

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"os/signal"
	"path/filepath"
	"slices"
	"strings"
	"sync"
	"syscall"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"
)

// ClusterInfo contains information about a cluster
type ClusterInfo struct {
	Name         string
	ServiceOwner string
	Environment  string
	client       *kubernetes.Clientset
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

// getK8sClientForContext creates a Kubernetes client for a specific context
func getK8sClientForContext(contextName string) (*kubernetes.Clientset, error) {
	home := homedir.HomeDir()
	if home == "" {
		return nil, fmt.Errorf("failed to get home dir")
	}

	kubeconfig := filepath.Join(home, ".kube", "config")

	// Load config with specific context
	config, err := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(
		&clientcmd.ClientConfigLoadingRules{ExplicitPath: kubeconfig},
		&clientcmd.ConfigOverrides{CurrentContext: contextName},
	).ClientConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to build config for context %s: %w", contextName, err)
	}

	// create the clientset
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create clientset: %w", err)
	}

	return clientset, nil
}

// GetPodsForDeployment retrieves all pod names for a deployment
func GetPodsForDeployment(ctx context.Context, clientset *kubernetes.Clientset, namespace, deploymentName string) ([]string, error) {
	// Get the deployment to find its label selector
	deployment, err := clientset.AppsV1().Deployments(namespace).Get(ctx, deploymentName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get deployment: %w", err)
	}

	// Get matchLabels from deployment
	matchLabels := deployment.Spec.Selector.MatchLabels
	if len(matchLabels) == 0 {
		return nil, fmt.Errorf("deployment %s has no label selectors", deploymentName)
	}

	// Build label selector
	labelSelector := labels.FormatLabels(matchLabels)

	// Get pods using the deployment's label selector
	listOptions := metav1.ListOptions{
		LabelSelector: labelSelector,
	}
	podList, err := clientset.CoreV1().Pods(namespace).List(ctx, listOptions)
	if err != nil {
		return nil, fmt.Errorf("failed to get pods: %w", err)
	}

	// Extract pod names
	var podNames []string
	for _, pod := range podList.Items {
		podNames = append(podNames, pod.Name)
	}

	if len(podNames) == 0 {
		return nil, fmt.Errorf("no pods found for deployment %s in namespace %s (selector: %s)", deploymentName, namespace, labelSelector)
	}

	return podNames, nil
}

// streamLogsFromCluster streams logs from all pods in a cluster to a channel
func streamLogsFromCluster(ctx context.Context, cluster ClusterInfo, namespace, deploymentName string, logsChan chan<- LogLine, since *string, tail *int, follow bool, errorsChan chan<- error) {
	// Get pods for the deployment
	pods, err := GetPodsForDeployment(ctx, cluster.client, namespace, deploymentName)
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

// parseSinceDuration parses a kubectl-style duration string (e.g., "5m", "1h") to seconds
func parseSinceDuration(since string) (*int64, error) {
	duration, err := time.ParseDuration(since)
	if err != nil {
		return nil, fmt.Errorf("failed to parse duration: %w", err)
	}
	seconds := int64(duration.Seconds())
	return &seconds, nil
}

// streamPodLogs streams logs from a single pod
func streamPodLogs(ctx context.Context, cluster ClusterInfo, namespace, podName string, logsChan chan<- LogLine, since *string, tail *int, follow bool, errorsChan chan<- error) {
	// Build pod log options
	logOptions := &corev1.PodLogOptions{
		Follow:     follow,
		Timestamps: true,
	}

	// Only add SinceSeconds if specified
	if since != nil && *since != "" {
		sinceSeconds, err := parseSinceDuration(*since)
		if err != nil {
			errorsChan <- fmt.Errorf("[%s/%s] failed to parse since duration: %w", cluster.Name, podName, err)
			return
		}
		logOptions.SinceSeconds = sinceSeconds
	}

	// Only add TailLines if specified (and valid)
	if tail != nil && *tail >= 0 {
		tailLines := int64(*tail)
		logOptions.TailLines = &tailLines
	}

	// Get log stream
	req := cluster.client.CoreV1().Pods(namespace).GetLogs(podName, logOptions)
	stream, err := req.Stream(ctx)
	if err != nil {
		errorsChan <- fmt.Errorf("[%s/%s] failed to open log stream: %w", cluster.Name, podName, err)
		return
	}
	defer stream.Close()

	// Parse log lines as they come
	scanner := bufio.NewScanner(stream)

	for scanner.Scan() {
		line := scanner.Text()

		timestampStr, message, found := strings.Cut(line, " ")
		if !found {
			errorsChan <- fmt.Errorf("[%s/%s] invalid log line (no space): %s", cluster.Name, podName, line)
			continue
		}

		timestamp, err := time.Parse(time.RFC3339Nano, timestampStr)
		if err != nil {
			// Try without nanoseconds
			timestamp, err = time.Parse(time.RFC3339, timestampStr)
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
			Message:      message,
		}

		select {
		case logsChan <- logLine:
		case <-ctx.Done():
			return
		}
	}

	if err := scanner.Err(); err != nil && ctx.Err() == nil {
		errorsChan <- fmt.Errorf("[%s/%s] scanner error: %w", cluster.Name, podName, err)
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

	// Initialize Kubernetes clients for all clusters
	for i := range clusters {
		client, err := getK8sClientForContext(clusters[i].Name)
		if err != nil {
			return fmt.Errorf("failed to create k8s client for cluster %s: %w", clusters[i].Name, err)
		}
		clusters[i].client = client
	}

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

	flush := func(final bool) error {
		if final {
			sequencer.resequenceIgnoreDuration()
		} else {
			sequencer.resequence()
		}
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
			err := flush(false)
			if err != nil {
				return err
			}

		case <-ctx.Done():
			done = true
		}
	}

	if err := flush(true); err != nil {
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

func (r *reSequencer) resequenceIgnoreDuration() {
	if r.availablePos == r.writerPos {
		return
	}

	slices.SortFunc(r.buffer[r.availablePos:r.writerPos], func(a LogLine, b LogLine) int {
		return a.Timestamp.Compare(b.Timestamp)
	})

	r.availablePos = r.writerPos
}

func (r *reSequencer) next() []LogLine {
	if r.availablePos-r.readerPos == 0 {
		return nil
	}
	result := r.buffer[r.readerPos:r.availablePos]
	r.readerPos = r.availablePos
	return result
}
