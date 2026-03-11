//nolint:cyclop // The output package contains two table renderers with branch-heavy formatting paths.
package output

import (
	"fmt"
	"io"
	"sort"
	"strconv"
	"strings"
	"text/tabwriter"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"altinn.studio/runtime-health/internal/kubernetes"
)

func writef(w io.Writer, format string, args ...any) error {
	_, err := fmt.Fprintf(w, format, args...)
	if err != nil {
		return fmt.Errorf("write formatted output: %w", err)
	}

	return nil
}

func writeln(w io.Writer, args ...any) error {
	_, err := fmt.Fprintln(w, args...)
	if err != nil {
		return fmt.Errorf("write output line: %w", err)
	}

	return nil
}

// getSortPriority returns a priority for sorting results
// Lower values appear first in the table.
//
//nolint:nestif // Condition priority intentionally checks a small ordered set of cases.
func getSortPriority(result kubernetes.QueryResult) int {
	if result.Error != nil {
		return 0
	}

	if len(result.Conditions) > 0 {
		// Use the first condition for priority (most relevant when multiple conditions exist)
		condition := result.Conditions[0]
		if condition.Type == "Progressing" && condition.Status == metav1.ConditionFalse {
			return 1
		}

		if condition.Type == "Available" && condition.Status == metav1.ConditionFalse {
			return 2
		}

		if condition.Status == metav1.ConditionFalse || condition.Status == metav1.ConditionUnknown {
			return 3
		}

		if condition.Type == "Progressing" && condition.Status == metav1.ConditionTrue {
			return 4
		}

		if condition.Type == "Available" && condition.Status == metav1.ConditionTrue {
			return 5
		}

		if condition.Status == metav1.ConditionTrue {
			return 4
		}
	}

	return 3
}

// PrintResults prints the query results as a formatted table.
//
//nolint:funlen,gocognit,gocyclo,maintidx,nestif // Table rendering is branch-heavy because it supports multiple resource layouts.
func PrintResults(w io.Writer, results []kubernetes.QueryResult) error {
	sort.SliceStable(results, func(i, j int) bool {
		return getSortPriority(results[i]) < getSortPriority(results[j])
	})

	tw := tabwriter.NewWriter(w, 0, 0, 3, ' ', 0)

	hasDeploymentInfo := false
	hasHTTPRouteInfo := false
	for _, result := range results {
		if result.PodAge != nil {
			hasDeploymentInfo = true
			break
		}
		if result.Weight1 != nil {
			hasHTTPRouteInfo = true
			break
		}
	}

	// Use different table format for HTTPRoute
	if hasHTTPRouteInfo {
		return printHTTPRouteResults(tw, results)
	}

	if hasDeploymentInfo {
		if err := writeln(tw, "CLUSTER\tNAMESPACE/NAME\tTYPE\tSTATUS\tREASON\tPOD AGE\tRESTARTS\tMESSAGE"); err != nil {
			return fmt.Errorf("write results header: %w", err)
		}
		if err := writeln(
			tw,
			strings.Repeat(
				"-",
				20,
			)+"\t"+strings.Repeat(
				"-",
				20,
			)+"\t"+strings.Repeat(
				"-",
				15,
			)+"\t"+strings.Repeat(
				"-",
				10,
			)+"\t"+strings.Repeat(
				"-",
				15,
			)+"\t"+strings.Repeat(
				"-",
				10,
			)+"\t"+strings.Repeat(
				"-",
				10,
			)+"\t"+strings.Repeat(
				"-",
				120,
			),
		); err != nil {
			return fmt.Errorf("write results separator: %w", err)
		}
	} else {
		if err := writeln(tw, "CLUSTER\tNAMESPACE/NAME\tTYPE\tSTATUS\tREASON\tMESSAGE"); err != nil {
			return fmt.Errorf("write results header: %w", err)
		}
		if err := writeln(
			tw,
			strings.Repeat(
				"-",
				20,
			)+"\t"+strings.Repeat(
				"-",
				20,
			)+"\t"+strings.Repeat(
				"-",
				15,
			)+"\t"+strings.Repeat(
				"-",
				10,
			)+"\t"+strings.Repeat(
				"-",
				15,
			)+"\t"+strings.Repeat(
				"-",
				120,
			),
		); err != nil {
			return fmt.Errorf("write results separator: %w", err)
		}
	}

	for _, result := range results {
		cluster := result.ClusterName
		namespacedName := result.Namespace + "/" + result.Name

		switch {
		case result.Error != nil:
			errorMsg := truncate(result.Error.Error(), 150)
			if hasDeploymentInfo {
				if err := writef(tw, "%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n",
					cluster,
					namespacedName,
					"ERROR",
					"-",
					"-",
					"-",
					"-",
					errorMsg); err != nil {
					return fmt.Errorf("write error result row: %w", err)
				}
			} else {
				if err := writef(tw, "%s\t%s\t%s\t%s\t%s\t%s\n",
					cluster,
					namespacedName,
					"ERROR",
					"-",
					"-",
					errorMsg); err != nil {
					return fmt.Errorf("write error result row: %w", err)
				}
			}
		case len(result.Conditions) > 0:
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
				if err := writef(tw, "%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n",
					cluster,
					namespacedName,
					condType,
					status,
					reason,
					podAge,
					podRestarts,
					message); err != nil {
					return fmt.Errorf("write deployment result row: %w", err)
				}
			} else {
				if err := writef(tw, "%s\t%s\t%s\t%s\t%s\t%s\n",
					cluster,
					namespacedName,
					condType,
					status,
					reason,
					message); err != nil {
					return fmt.Errorf("write result row: %w", err)
				}
			}

			// Print additional conditions with empty cluster, namespace/name, pod age, and restarts
			for _, cond := range result.Conditions[1:] {
				condType := cond.Type
				status := cond.Status
				reason := cond.Reason
				message := truncate(cond.Message, 150)

				if hasDeploymentInfo {
					if err := writef(tw, "%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n",
						"",
						"",
						condType,
						status,
						reason,
						"-",
						"-",
						message); err != nil {
						return fmt.Errorf("write extra deployment result row: %w", err)
					}
				} else {
					if err := writef(tw, "%s\t%s\t%s\t%s\t%s\t%s\n",
						"",
						"",
						condType,
						status,
						reason,
						message); err != nil {
						return fmt.Errorf("write extra result row: %w", err)
					}
				}
			}
		default:
			if hasDeploymentInfo {
				if err := writef(tw, "%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n",
					cluster,
					namespacedName,
					"UNKNOWN",
					"-",
					"-",
					"-",
					"-",
					"No conditions found"); err != nil {
					return fmt.Errorf("write unknown deployment row: %w", err)
				}
			} else {
				if err := writef(tw, "%s\t%s\t%s\t%s\t%s\t%s\n",
					cluster,
					namespacedName,
					"UNKNOWN",
					"-",
					"-",
					"No conditions found"); err != nil {
					return fmt.Errorf("write unknown result row: %w", err)
				}
			}
		}
	}

	if err := tw.Flush(); err != nil {
		return fmt.Errorf("flush results table: %w", err)
	}

	return nil
}

// truncate truncates a string to maxLen characters, adding "..." if truncated
// It also normalizes whitespace by replacing newlines and tabs with spaces,
// and collapsing multiple consecutive spaces into a single space.
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

// printHTTPRouteResults prints HTTPRoute query results in a specialized table format.
//
//nolint:gocognit,funlen,nestif // HTTPRoute output has a separate, branch-heavy layout.
func printHTTPRouteResults(tw *tabwriter.Writer, results []kubernetes.QueryResult) error {
	if err := writeln(tw, "CLUSTER\tNAMESPACE/NAME\tWEIGHT1\tWEIGHT2\tRECONCILE\tANNOTATIONS\tSTATUS"); err != nil {
		return fmt.Errorf("write httproute header: %w", err)
	}
	if err := writeln(
		tw,
		strings.Repeat(
			"-",
			20,
		)+"\t"+strings.Repeat(
			"-",
			20,
		)+"\t"+strings.Repeat(
			"-",
			8,
		)+"\t"+strings.Repeat(
			"-",
			8,
		)+"\t"+strings.Repeat(
			"-",
			10,
		)+"\t"+strings.Repeat(
			"-",
			40,
		)+"\t"+strings.Repeat(
			"-",
			15,
		),
	); err != nil {
		return fmt.Errorf("write httproute separator: %w", err)
	}

	for _, result := range results {
		cluster := result.ClusterName
		namespacedName := result.Namespace + "/" + result.Name

		if result.Error != nil {
			errorMsg := truncate(result.Error.Error(), 100)
			if err := writef(tw, "%s\t%s\t%s\t%s\t%s\t%s\t%s\n",
				cluster,
				namespacedName,
				"-",
				"-",
				"-",
				"-",
				"ERROR: "+errorMsg); err != nil {
				return fmt.Errorf("write httproute error row: %w", err)
			}
		} else {
			weight1 := "-"
			if result.Weight1 != nil {
				weight1 = strconv.Itoa(*result.Weight1)
			}
			weight2 := "-"
			if result.Weight2 != nil {
				weight2 = strconv.Itoa(*result.Weight2)
			}

			reconcile := "enabled"
			if result.HasReconcileAnnotation != nil && *result.HasReconcileAnnotation {
				reconcile = "disabled"
			}

			annotations := "-"
			if len(result.Annotations) > 0 {
				// Format annotations as key=value pairs, truncated
				annotationList := make([]string, 0, len(result.Annotations))
				for k, v := range result.Annotations {
					annotationList = append(annotationList, fmt.Sprintf("%s=%s", k, v))
				}
				sort.Strings(annotationList)
				annotations = truncate(strings.Join(annotationList, ", "), 80)
			}

			status := "✓"

			if err := writef(tw, "%s\t%s\t%s\t%s\t%s\t%s\t%s\n",
				cluster,
				namespacedName,
				weight1,
				weight2,
				reconcile,
				annotations,
				status); err != nil {
				return fmt.Errorf("write httproute row: %w", err)
			}
		}
	}

	if err := tw.Flush(); err != nil {
		return fmt.Errorf("flush httproute table: %w", err)
	}

	return nil
}
