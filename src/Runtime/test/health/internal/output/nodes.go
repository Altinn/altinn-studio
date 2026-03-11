package output

import (
	"fmt"
	"io"
	"sort"
	"strings"
	"text/tabwriter"

	"altinn.studio/runtime-health/internal/kubernetes"
)

// PrintNodeResults prints the node results as a formatted table.
//
//nolint:funlen,nestif // Node output is a single table formatter with two row layouts.
func PrintNodeResults(w io.Writer, results []kubernetes.NodeResult) error {
	// Sort results: errors first, then by cluster name
	sort.SliceStable(results, func(i, j int) bool {
		if results[i].Error != nil && results[j].Error == nil {
			return true
		}
		if results[i].Error == nil && results[j].Error != nil {
			return false
		}
		return results[i].ClusterName < results[j].ClusterName
	})

	tw := tabwriter.NewWriter(w, 0, 0, 3, ' ', 0)

	// Table header
	if err := writeln(
		tw,
		"CLUSTER\tK8S VER\tNODES\tPODS\tCPU AVAIL\tCPU/NODE\tCPU USED\tCPU %\tMEM AVAIL\tMEM/NODE\tMEM USED\tMEM %\tNEWEST AGE",
	); err != nil {
		return fmt.Errorf("write node header: %w", err)
	}
	if err := writeln(tw, strings.Repeat("-", 20)+"\t"+
		strings.Repeat("-", 10)+"\t"+
		strings.Repeat("-", 6)+"\t"+
		strings.Repeat("-", 6)+"\t"+
		strings.Repeat("-", 10)+"\t"+
		strings.Repeat("-", 10)+"\t"+
		strings.Repeat("-", 10)+"\t"+
		strings.Repeat("-", 8)+"\t"+
		strings.Repeat("-", 10)+"\t"+
		strings.Repeat("-", 10)+"\t"+
		strings.Repeat("-", 10)+"\t"+
		strings.Repeat("-", 8)+"\t"+
		strings.Repeat("-", 12)); err != nil {
		return fmt.Errorf("write node separator: %w", err)
	}

	// Table rows
	for _, result := range results {
		if result.Error != nil {
			errorMsg := truncate(result.Error.Error(), 80)
			if err := writef(tw, "%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n",
				result.ClusterName,
				"ERROR",
				"-",
				"-",
				"-",
				"-",
				"-",
				"-",
				"-",
				"-",
				"-",
				"-",
				errorMsg); err != nil {
				return fmt.Errorf("write node error row: %w", err)
			}
		} else {
			// Format CPU values with "cores" suffix
			cpuTotal := result.CPUTotal + " cores"
			cpuPerNode := result.CPUPerNode + " cores"
			cpuUsed := result.CPUUsed
			if cpuUsed != "N/A" {
				cpuUsed += " cores"
			}

			if err := writef(tw, "%s\t%s\t%d\t%d\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n",
				result.ClusterName,
				result.K8sVersion,
				result.NodeCount,
				result.PodCount,
				cpuTotal,
				cpuPerNode,
				cpuUsed,
				result.CPUUtilizationPercent,
				result.MemoryTotal,
				result.MemoryPerNode,
				result.MemoryUsed,
				result.MemoryUtilizationPercent,
				result.NewestNodeAge); err != nil {
				return fmt.Errorf("write node row: %w", err)
			}
		}
	}

	if err := tw.Flush(); err != nil {
		return fmt.Errorf("flush node table: %w", err)
	}

	return nil
}
