package output

import (
	"fmt"
	"io"
	"sort"
	"strings"
	"text/tabwriter"

	"altinn.studio/runtime-health/internal/kubernetes"
)

// getSortPriority returns a priority for sorting results
// Lower values appear first in the table
func getSortPriority(result kubernetes.QueryResult) int {
	if result.Error != nil {
		return 0
	}

	if len(result.Conditions) > 0 {
		// Use the first condition for priority (most relevant when multiple conditions exist)
		condition := result.Conditions[0]
		if condition.Type == "Progressing" && condition.Status == "False" {
			return 1
		}

		if condition.Type == "Available" && condition.Status == "False" {
			return 2
		}

		if condition.Status == "False" || condition.Status == "Unknown" {
			return 3
		}

		if condition.Type == "Progressing" && condition.Status == "True" {
			return 4
		}

		if condition.Type == "Available" && condition.Status == "True" {
			return 5
		}

		if condition.Status == "True" {
			return 4
		}
	}

	return 3
}

// PrintResults prints the query results as a formatted table
func PrintResults(w io.Writer, results []kubernetes.QueryResult) {
	sort.SliceStable(results, func(i, j int) bool {
		return getSortPriority(results[i]) < getSortPriority(results[j])
	})

	tw := tabwriter.NewWriter(w, 0, 0, 3, ' ', 0)

	hasDeploymentInfo := false
	for _, result := range results {
		if result.PodAge != nil {
			hasDeploymentInfo = true
			break
		}
	}

	if hasDeploymentInfo {
		fmt.Fprintln(tw, "CLUSTER\tNAMESPACE/NAME\tTYPE\tSTATUS\tREASON\tPOD AGE\tRESTARTS\tMESSAGE")
		fmt.Fprintln(tw, strings.Repeat("-", 20)+"\t"+strings.Repeat("-", 20)+"\t"+strings.Repeat("-", 15)+"\t"+strings.Repeat("-", 10)+"\t"+strings.Repeat("-", 15)+"\t"+strings.Repeat("-", 10)+"\t"+strings.Repeat("-", 10)+"\t"+strings.Repeat("-", 120))
	} else {
		fmt.Fprintln(tw, "CLUSTER\tNAMESPACE/NAME\tTYPE\tSTATUS\tREASON\tMESSAGE")
		fmt.Fprintln(tw, strings.Repeat("-", 20)+"\t"+strings.Repeat("-", 20)+"\t"+strings.Repeat("-", 15)+"\t"+strings.Repeat("-", 10)+"\t"+strings.Repeat("-", 15)+"\t"+strings.Repeat("-", 120))
	}

	for _, result := range results {
		cluster := result.ClusterName
		namespacedName := result.Namespace + "/" + result.Name

		if result.Error != nil {
			errorMsg := truncate(result.Error.Error(), 150)
			if hasDeploymentInfo {
				fmt.Fprintf(tw, "%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n",
					cluster,
					namespacedName,
					"ERROR",
					"-",
					"-",
					"-",
					"-",
					errorMsg)
			} else {
				fmt.Fprintf(tw, "%s\t%s\t%s\t%s\t%s\t%s\n",
					cluster,
					namespacedName,
					"ERROR",
					"-",
					"-",
					errorMsg)
			}
		} else if len(result.Conditions) > 0 {
			// Print first condition with all columns
			firstCond := result.Conditions[0]
			condType := firstCond.Type
			status := firstCond.Status
			reason := firstCond.Reason
			message := truncate(firstCond.Message, 150)

			if hasDeploymentInfo {
				podAge := "-"
				if result.PodAge != nil {
					podAge = *result.PodAge
				}
				podRestarts := "-"
				if result.PodRestarts != nil {
					podRestarts = *result.PodRestarts
				}
				fmt.Fprintf(tw, "%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n",
					cluster,
					namespacedName,
					condType,
					status,
					reason,
					podAge,
					podRestarts,
					message)
			} else {
				fmt.Fprintf(tw, "%s\t%s\t%s\t%s\t%s\t%s\n",
					cluster,
					namespacedName,
					condType,
					status,
					reason,
					message)
			}

			// Print additional conditions with empty cluster, namespace/name, pod age, and restarts
			for _, cond := range result.Conditions[1:] {
				condType := cond.Type
				status := cond.Status
				reason := cond.Reason
				message := truncate(cond.Message, 150)

				if hasDeploymentInfo {
					fmt.Fprintf(tw, "%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n",
						"",
						"",
						condType,
						status,
						reason,
						"-",
						"-",
						message)
				} else {
					fmt.Fprintf(tw, "%s\t%s\t%s\t%s\t%s\t%s\n",
						"",
						"",
						condType,
						status,
						reason,
						message)
				}
			}
		} else {
			if hasDeploymentInfo {
				fmt.Fprintf(tw, "%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n",
					cluster,
					namespacedName,
					"UNKNOWN",
					"-",
					"-",
					"-",
					"-",
					"No conditions found")
			} else {
				fmt.Fprintf(tw, "%s\t%s\t%s\t%s\t%s\t%s\n",
					cluster,
					namespacedName,
					"UNKNOWN",
					"-",
					"-",
					"No conditions found")
			}
		}
	}

	tw.Flush()
}

// truncate truncates a string to maxLen characters, adding "..." if truncated
// It also normalizes whitespace by replacing newlines and tabs with spaces,
// and collapsing multiple consecutive spaces into a single space
func truncate(s string, maxLen int) string {
	s = strings.ReplaceAll(s, "\n", " ")
	s = strings.ReplaceAll(s, "\t", " ")
	s = strings.ReplaceAll(s, "\r", " ")

	for strings.Contains(s, "  ") {
		s = strings.ReplaceAll(s, "  ", " ")
	}

	s = strings.TrimSpace(s)

	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}
