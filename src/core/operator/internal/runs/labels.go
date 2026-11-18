package runs

import (
	"fmt"
	"maps"
	"regexp"
	"slices"
	"strings"

	"altinn.studio/core-operator/internal/config"
)

const maxLabelValue = 100

var labelValuePattern = regexp.MustCompile(`^[a-z0-9][a-z0-9._-]*$`)

// normalizedLabels copies the labels with their values in lowercase, so names that Gitea compares without case are
// the same labels.
func normalizedLabels(labels map[string]string) map[string]string {
	normalized := make(map[string]string, len(labels))
	for key, value := range labels {
		normalized[key] = strings.ToLower(value)
	}
	return normalized
}

// checkLabels refuses labels that do not agree with the kind. It refuses a key that the kind does not list, a missing
// key that the kind lists, and a value that is not valid. It expects normalized labels.
func checkLabels(kindName string, kind config.Kind, labels map[string]string) error {
	if len(labels) > config.MaxLabels {
		return &RequestError{Message: fmt.Sprintf("Send at most %d labels.", config.MaxLabels)}
	}
	// Sort the keys, so that a request with several wrong labels always gets the same answer.
	for _, key := range slices.Sorted(maps.Keys(labels)) {
		if !slices.Contains(kind.Labels, key) {
			if !config.ValidLabelKey(key) {
				// Do not quote the key in the answer, because it can be as long as the body.
				return &RequestError{Message: labelKeyRule}
			}
			return &RequestError{Message: fmt.Sprintf(
				"The kind %s has no label %s. GET /api/v1/kinds lists the labels of each kind.", kindName, key)}
		}
		if err := checkLabelValue(key, labels[key]); err != nil {
			return err
		}
	}
	for _, key := range kind.Labels {
		if _, ok := labels[key]; !ok {
			return &RequestError{Message: fmt.Sprintf("A run of the kind %s needs the label %s.", kindName, key)}
		}
	}
	return nil
}

const labelKeyRule = "A label key must be a camelCase name of at most 63 characters, other than runId, kind and caller."

func checkLabelValue(key, value string) error {
	if len(value) > maxLabelValue || !labelValuePattern.MatchString(value) {
		return &RequestError{Message: fmt.Sprintf(
			"The label %s must be a name of letters, digits, '.', '_' and '-' of at most %d characters.",
			key, maxLabelValue)}
	}
	return nil
}

// labelsOf reads a run's labels from the labels of its workflow, without the ones that the operator sets.
func labelsOf(workflowLabels map[string]string) map[string]string {
	labels := map[string]string{}
	for key, value := range workflowLabels {
		if !slices.Contains(config.ReservedLabels, key) {
			labels[key] = value
		}
	}
	return labels
}

// Filter is the query of a find, with the labels and the kind that a run must have. A find needs at least one of them.
type Filter struct {
	Labels map[string]string
	Kind   string
}

// labels returns the workflow labels for the filter, and checks each label.
func (f Filter) labels() (map[string]string, error) {
	if len(f.Labels) > config.MaxLabels {
		return nil, &RequestError{Message: fmt.Sprintf("Find runs by at most %d labels.", config.MaxLabels)}
	}
	labels := normalizedLabels(f.Labels)
	for _, key := range slices.Sorted(maps.Keys(labels)) {
		if !config.ValidLabelKey(key) {
			return nil, &RequestError{Message: labelKeyRule}
		}
		if err := checkLabelValue(key, labels[key]); err != nil {
			return nil, err
		}
	}
	if f.Kind != "" {
		labels[workflowLabelKind] = f.Kind
	}
	if len(labels) == 0 {
		return nil, &RequestError{Message: "Find runs by at least one label or by their kind."}
	}
	return labels, nil
}

// ParseLabelSelector reads a label selector in the form key=value,key=value. Each label must match, as in a Kubernetes
// equality selector. An empty selector has no labels.
func ParseLabelSelector(selector string) (map[string]string, error) {
	labels := map[string]string{}
	if selector == "" {
		return labels, nil
	}
	for pair := range strings.SplitSeq(selector, ",") {
		key, value, ok := strings.Cut(pair, "=")
		if !ok || key == "" {
			return nil, &RequestError{Message: "labelSelector must be key=value pairs, separated by commas."}
		}
		if _, seen := labels[key]; seen {
			return nil, &RequestError{Message: fmt.Sprintf("labelSelector has the label %s more than once.", key)}
		}
		labels[key] = value
	}
	return labels, nil
}
