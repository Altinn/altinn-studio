package kubernetes

import (
	"context"
	"fmt"
	"sort"
	"sync"
	"time"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	metricsv1beta1 "k8s.io/metrics/pkg/apis/metrics/v1beta1"
)

// NodeResult represents the result of querying node information from a cluster
type NodeResult struct {
	ClusterName              string
	ServiceOwner             string
	Environment              string
	K8sVersion               string
	NodeCount                int
	PodCount                 int
	CPUTotal                 string
	CPUPerNode               string
	CPUUsed                  string
	CPUUtilizationPercent    string
	MemoryTotal              string
	MemoryPerNode            string
	MemoryUsed               string
	MemoryUtilizationPercent string
	NewestNodeAge            string
	Error                    error
}

// GetNodesInfo queries node information for a specific cluster using client-go
func GetNodesInfo(ctx context.Context, runtime KubernetesRuntime, labelSelector string) NodeResult {
	result := NodeResult{
		ClusterName:  runtime.GetName(),
		ServiceOwner: runtime.GetServiceOwner(),
		Environment:  runtime.GetEnvironment(),
	}

	// Lazy-load the Kubernetes clientset
	client := runtime.GetKubernetesClient()
	clientset, err := client.Clientset()
	if err != nil {
		result.Error = fmt.Errorf("failed to get clientset: %w", err)
		return result
	}

	// Get nodes with label selector
	nodes, err := clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{
		LabelSelector: labelSelector,
	})
	if err != nil {
		result.Error = fmt.Errorf("failed to get nodes: %w", err)
		return result
	}

	if len(nodes.Items) == 0 {
		result.Error = fmt.Errorf("no nodes found matching label selector: %s", labelSelector)
		return result
	}

	result.NodeCount = len(nodes.Items)

	// Get all pods to count per node
	pods, err := clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		result.Error = fmt.Errorf("failed to get pods: %w", err)
		return result
	}

	// Count pods on our selected nodes
	nodeNames := make(map[string]bool)
	for _, node := range nodes.Items {
		nodeNames[node.Name] = true
	}

	podCount := 0
	for _, pod := range pods.Items {
		if nodeNames[pod.Spec.NodeName] {
			podCount++
		}
	}
	result.PodCount = podCount

	// Calculate aggregate capacity and allocatable
	var totalCPU, totalMemory resource.Quantity
	var newestNode *corev1.Node
	k8sVersions := make(map[string]int)

	for i := range nodes.Items {
		node := &nodes.Items[i]

		// Sum CPU and Memory
		cpuCapacity := node.Status.Capacity[corev1.ResourceCPU]
		memCapacity := node.Status.Capacity[corev1.ResourceMemory]
		totalCPU.Add(cpuCapacity)
		totalMemory.Add(memCapacity)

		// Track k8s version
		k8sVersions[node.Status.NodeInfo.KubeletVersion]++

		// Find newest node
		if newestNode == nil || node.CreationTimestamp.After(newestNode.CreationTimestamp.Time) {
			newestNode = node
		}
	}

	// Calculate per-node resources (assuming all nodes are the same size)
	perNodeCPU := totalCPU.DeepCopy()
	perNodeCPU.Set(totalCPU.Value() / int64(result.NodeCount))

	perNodeMemory := totalMemory.DeepCopy()
	perNodeMemory.Set(totalMemory.Value() / int64(result.NodeCount))

	// Format CPU (convert millicores to cores)
	result.CPUTotal = formatCPU(&totalCPU)
	result.CPUPerNode = formatCPU(&perNodeCPU)

	// Format Memory
	result.MemoryTotal = formatMemory(&totalMemory)
	result.MemoryPerNode = formatMemory(&perNodeMemory)

	// Get most common k8s version
	result.K8sVersion = getMostCommonVersion(k8sVersions)

	// Calculate age of newest node
	if newestNode != nil {
		age := time.Since(newestNode.CreationTimestamp.Time)
		result.NewestNodeAge = formatAge(age)
	}

	// Get node metrics using metrics client-go (lazy-loaded)
	metricsClient, err := client.MetricsClient()
	if err != nil {
		// Metrics-server might not be available, this is not a fatal error
		result.CPUUsed = "N/A"
		result.CPUUtilizationPercent = "N/A"
		result.MemoryUsed = "N/A"
		result.MemoryUtilizationPercent = "N/A"
	} else {
		nodeMetricsList, err := metricsClient.MetricsV1beta1().NodeMetricses().List(ctx, metav1.ListOptions{
			LabelSelector: labelSelector,
		})
		if err != nil {
			// Metrics-server might not be available, this is not a fatal error
			result.CPUUsed = "N/A"
			result.CPUUtilizationPercent = "N/A"
			result.MemoryUsed = "N/A"
			result.MemoryUtilizationPercent = "N/A"
		} else {
			// Create a map for quick lookup
			metricsMap := make(map[string]metricsv1beta1.NodeMetrics)
			for _, nm := range nodeMetricsList.Items {
				metricsMap[nm.Name] = nm
			}

			// Calculate aggregate usage and utilization
			var totalCPUUsed, totalCPUAllocatable int64
			var totalMemUsed, totalMemAllocatable int64

			for i := range nodes.Items {
				node := &nodes.Items[i]
				if metrics, ok := metricsMap[node.Name]; ok {
					// CPU
					cpuUsed := metrics.Usage[corev1.ResourceCPU]
					cpuAllocatable := node.Status.Allocatable[corev1.ResourceCPU]
					totalCPUUsed += cpuUsed.MilliValue()
					totalCPUAllocatable += cpuAllocatable.MilliValue()

					// Memory
					memUsed := metrics.Usage[corev1.ResourceMemory]
					memAllocatable := node.Status.Allocatable[corev1.ResourceMemory]
					totalMemUsed += memUsed.Value()
					totalMemAllocatable += memAllocatable.Value()
				}
			}

			// Format CPU used (convert millicores to cores)
			cpuUsedCores := float64(totalCPUUsed) / 1000.0
			result.CPUUsed = fmt.Sprintf("%.1f", cpuUsedCores)

			// Calculate CPU utilization percentage
			if totalCPUAllocatable > 0 {
				cpuUtilPct := (float64(totalCPUUsed) / float64(totalCPUAllocatable)) * 100
				result.CPUUtilizationPercent = fmt.Sprintf("%.1f%%", cpuUtilPct)
			} else {
				result.CPUUtilizationPercent = "N/A"
			}

			// Format memory used
			result.MemoryUsed = formatMemoryBytes(totalMemUsed)

			// Calculate memory utilization percentage
			if totalMemAllocatable > 0 {
				memUtilPct := (float64(totalMemUsed) / float64(totalMemAllocatable)) * 100
				result.MemoryUtilizationPercent = fmt.Sprintf("%.1f%%", memUtilPct)
			} else {
				result.MemoryUtilizationPercent = "N/A"
			}
		}
	}

	return result
}

// QueryAllClustersForNodes queries node information from multiple clusters in parallel
func QueryAllClustersForNodes(runtimes []KubernetesRuntime, labelSelector string, maxWorkers int) []NodeResult {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	jobs := make(chan KubernetesRuntime, len(runtimes))
	results := make(chan NodeResult, len(runtimes))

	var wg sync.WaitGroup

	// Start workers
	for w := 0; w < maxWorkers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for runtime := range jobs {
				result := GetNodesInfo(ctx, runtime, labelSelector)
				results <- result
			}
		}()
	}

	// Queue jobs
	for _, runtime := range runtimes {
		jobs <- runtime
	}
	close(jobs)

	// Wait for completion
	go func() {
		wg.Wait()
		close(results)
	}()

	// Collect results
	var nodeResults []NodeResult
	for result := range results {
		nodeResults = append(nodeResults, result)
	}

	return nodeResults
}

// formatCPU formats CPU quantity to cores (e.g., "16" for 16 cores)
func formatCPU(cpu *resource.Quantity) string {
	// Convert to millicores then to cores
	milliCores := cpu.MilliValue()
	cores := float64(milliCores) / 1000.0
	if cores == float64(int64(cores)) {
		return fmt.Sprintf("%.0f", cores)
	}
	return fmt.Sprintf("%.1f", cores)
}

// formatMemory formats memory quantity to human-readable format (e.g., "64Gi")
func formatMemory(mem *resource.Quantity) string {
	bytes := mem.Value()
	return formatMemoryBytes(bytes)
}

// formatMemoryBytes formats bytes to human-readable format
func formatMemoryBytes(bytes int64) string {
	const (
		KiB = 1024
		MiB = 1024 * KiB
		GiB = 1024 * MiB
		TiB = 1024 * GiB
	)

	switch {
	case bytes >= TiB:
		return fmt.Sprintf("%.1fTi", float64(bytes)/float64(TiB))
	case bytes >= GiB:
		return fmt.Sprintf("%.1fGi", float64(bytes)/float64(GiB))
	case bytes >= MiB:
		return fmt.Sprintf("%.1fMi", float64(bytes)/float64(MiB))
	case bytes >= KiB:
		return fmt.Sprintf("%.1fKi", float64(bytes)/float64(KiB))
	default:
		return fmt.Sprintf("%d", bytes)
	}
}

// getMostCommonVersion returns the most common Kubernetes version from the map
func getMostCommonVersion(versions map[string]int) string {
	if len(versions) == 0 {
		return "unknown"
	}

	// Sort by count descending
	type versionCount struct {
		version string
		count   int
	}
	var counts []versionCount
	for v, c := range versions {
		counts = append(counts, versionCount{v, c})
	}
	sort.Slice(counts, func(i, j int) bool {
		return counts[i].count > counts[j].count
	})

	return counts[0].version
}
