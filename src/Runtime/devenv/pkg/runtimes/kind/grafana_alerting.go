package kind

import (
	"errors"
	"fmt"
	"log"
	"maps"
	"regexp"
	"slices"
	"strings"

	"sigs.k8s.io/yaml"

	"altinn.studio/devenv/pkg/runtimes/kind/manifests"
)

// The full monitoring profile loads the product's alert rules, contact points and notification
// templates from the dashboards repository into the local Grafana, the way grafana-operator
// applies them to the shared Grafana: same rule UIDs, queries, thresholds, folders and
// notification settings. Only where the shared Grafana reads a secret does the local one differ:
// every webhook a contact point would read from a Secret goes to the in-cluster recorder.

const (
	expressionDatasourceUID = "__expr__"
	// grafanaUIDMaxLength is the longest UID Grafana accepts for a contact point receiver.
	grafanaUIDMaxLength = 40
)

var (
	errUnknownFolderRef = errors.New("folderRef names no GrafanaFolder")
	errFolderCycle      = errors.New("GrafanaFolder parents form a cycle")
	nonUIDCharacters    = regexp.MustCompile(`[^a-zA-Z0-9_-]+`)
)

// grafanaFolder is a GrafanaFolder resource: its title and, when nested, its parent's name.
type grafanaFolder struct {
	title  string
	parent string
}

// grafanaObject is a resource whose spec the loader converts as it is.
type grafanaObject struct {
	name string
	spec map[string]any
	path string
}

// folderPath returns the folder's full path of titles, such as "Altinn Studio/Observability",
// which Grafana's alert provisioning creates as nested folders.
func folderPath(folders map[string]grafanaFolder, name string) (string, error) {
	var titles []string
	seen := map[string]bool{}
	for current := name; current != ""; current = folders[current].parent {
		if seen[current] {
			return "", fmt.Errorf("%w: %s", errFolderCycle, name)
		}
		seen[current] = true
		folder, ok := folders[current]
		if !ok {
			return "", fmt.Errorf("%w: %q", errUnknownFolderRef, current)
		}
		// Grafana splits a full path on '/', so a slash in a title is escaped.
		titles = append([]string{strings.ReplaceAll(folder.title, "/", `\/`)}, titles...)
	}
	return strings.Join(titles, "/"), nil
}

// rootFolderTitle returns the title of the folder's top-level ancestor, or of the folder itself.
func rootFolderTitle(folders map[string]grafanaFolder, name string) (string, error) {
	seen := map[string]bool{}
	current := name
	for {
		if seen[current] {
			return "", fmt.Errorf("%w: %s", errFolderCycle, name)
		}
		seen[current] = true
		folder, ok := folders[current]
		if !ok {
			return "", fmt.Errorf("%w: %q", errUnknownFolderRef, current)
		}
		if folder.parent == "" {
			return folder.title, nil
		}
		current = folder.parent
	}
}

// renderGrafanaAlerting renders a Grafana alerting provisioning file with the product's rule
// groups, contact points and notification templates. Contact point secrets become the recorder.
// Notification templates are read as they are, so they are not escaped.
// Rule groups that query a datasource the local Grafana does not have are left out with a warning.
func renderGrafanaAlerting(
	resources grafanaResources,
	recorderURL string,
) (string, error) {
	datasourceUIDs := map[string]bool{expressionDatasourceUID: true}
	for _, datasource := range resources.datasources {
		if uid, ok := datasource["uid"].(string); ok {
			datasourceUIDs[uid] = true
		}
	}

	groups := make([]map[string]any, 0, len(resources.ruleGroups))
	for _, group := range resources.ruleGroups {
		entry, err := alertRuleGroupEntry(resources.folders, group, datasourceUIDs)
		if errors.Is(err, errUnavailableDatasource) {
			log.Printf("warning: skipping alert rule group %s in %s: %v", group.name, group.path, err)
			continue
		}
		if err != nil {
			return "", fmt.Errorf("%s: alert rule group %s: %w", group.path, group.name, err)
		}
		groups = append(groups, entry)
	}

	contactPoints := make([]map[string]any, 0, len(resources.contactPoints))
	for _, contactPoint := range resources.contactPoints {
		entry, err := contactPointEntry(contactPoint, recorderURL)
		if err != nil {
			return "", fmt.Errorf("%s: contact point %s: %w", contactPoint.path, contactPoint.name, err)
		}
		contactPoints = append(contactPoints, entry)
	}

	templates := make([]map[string]any, 0, len(resources.templates))
	for _, template := range resources.templates {
		name := field[string](template.spec, "name")
		if name == "" {
			name = template.name
		}
		templates = append(templates, map[string]any{
			"orgId":    1,
			"name":     name,
			"template": template.spec["template"],
		})
	}

	file := map[string]any{"apiVersion": 1}
	if len(groups) > 0 {
		file["groups"] = groups
	}
	if len(contactPoints) > 0 {
		file["contactPoints"] = contactPoints
	}
	if len(templates) > 0 {
		file["templates"] = templates
	}
	data, err := yaml.Marshal(file)
	if err != nil {
		return "", fmt.Errorf("render Grafana alerting provisioning: %w", err)
	}
	return string(data), nil
}

var errUnavailableDatasource = errors.New("queries a datasource the local Grafana does not have")

// ruleFields maps a GrafanaAlertRuleGroup rule's fields to Grafana's provisioning file format,
// where they differ only in the case of two of them.
var ruleFields = map[string]string{
	"uid":                         "uid",
	"title":                       "title",
	"condition":                   "condition",
	"data":                        "data",
	"noDataState":                 "noDataState",
	"execErrState":                "execErrState",
	"for":                         "for",
	"keepFiringFor":               "keepFiringFor",
	"missingSeriesEvalsToResolve": "missing_series_evals_to_resolve",
	"annotations":                 "annotations",
	"labels":                      "labels",
	"isPaused":                    "isPaused",
	"dashboardUid":                "dashboardUid",
	"panelId":                     "panelId",
	"notificationSettings":        "notification_settings",
	"record":                      "record",
}

func alertRuleGroupEntry(
	folders map[string]grafanaFolder,
	group grafanaObject,
	datasourceUIDs map[string]bool,
) (map[string]any, error) {
	folder, err := ruleGroupFolder(folders, group.spec)
	if err != nil {
		return nil, err
	}
	name := field[string](group.spec, "name")
	if name == "" {
		name = group.name
	}
	specRules := field[[]any](group.spec, "rules")
	rules := make([]map[string]any, 0, len(specRules))
	for _, item := range specRules {
		rule, ok := item.(map[string]any)
		if !ok {
			continue
		}
		entry := map[string]any{}
		for key, value := range rule {
			if field, known := ruleFields[key]; known {
				entry[field] = provisioningRuleValue(field, value)
			} else {
				log.Printf("warning: alert rule %v: field %q has no provisioning equivalent", rule["uid"], key)
			}
		}
		for _, uid := range queryDatasourceUIDs(rule) {
			if !datasourceUIDs[uid] {
				return nil, fmt.Errorf("%w: rule %v, datasource %q", errUnavailableDatasource, rule["uid"], uid)
			}
		}
		rules = append(rules, entry)
	}
	entry := escapeProvisioningMap(map[string]any{"orgId": 1, "name": name, "folder": folder})
	if interval, ok := group.spec["interval"]; ok {
		entry["interval"] = interval
	}
	entry["rules"] = rules
	return entry, nil
}

// provisioningRuleValue prepares a rule field for Grafana's provisioning file. Grafana expands
// environment variables in most fields, which would empty a '$' in a title or label, so their
// '$' is doubled; it reads a rule's annotations and query models as they are, so the $labels
// and $values in annotations are left alone.
func provisioningRuleValue(field string, value any) any {
	if field == "annotations" || field == "data" {
		return value
	}
	return escapeProvisioningValue(value)
}

func ruleGroupFolder(folders map[string]grafanaFolder, spec map[string]any) (string, error) {
	if ref, ok := spec["folderRef"].(string); ok && ref != "" {
		return folderPath(folders, ref)
	}
	// A group may name its folder by UID instead; the local Grafana has no such UIDs, so it
	// goes into a folder named after the UID.
	if uid, ok := spec["folderUID"].(string); ok && uid != "" {
		return uid, nil
	}
	return "", fmt.Errorf("%w: neither folderRef nor folderUID is set", errUnknownFolderRef)
}

func queryDatasourceUIDs(rule map[string]any) []string {
	var uids []string
	data := field[[]any](rule, "data")
	for _, item := range data {
		query, ok := item.(map[string]any)
		if !ok {
			continue
		}
		if uid, ok := query["datasourceUid"].(string); ok && !slices.Contains(uids, uid) {
			uids = append(uids, uid)
		}
	}
	return uids
}

// contactPointEntry converts a GrafanaContactPoint to a provisioning entry. Each value the
// contact point would read from a Secret (valuesFrom) is the recorder instead, at a path naming
// the Secret and key, such as /grafana-slack-webhooks/altinnstudio-alerts-critical.
func contactPointEntry(contactPoint grafanaObject, recorderURL string) (map[string]any, error) {
	name := field[string](contactPoint.spec, "name")
	if name == "" {
		name = contactPoint.name
	}
	specReceivers := field[[]any](contactPoint.spec, "receivers")
	if len(specReceivers) == 0 {
		// The deprecated single-receiver form keeps the receiver's fields on the spec itself.
		specReceivers = []any{contactPoint.spec}
	}
	receivers := make([]map[string]any, 0, len(specReceivers))
	for i, item := range specReceivers {
		receiver, ok := item.(map[string]any)
		if !ok {
			continue
		}
		settings := map[string]any{}
		if specSettings, ok := receiver["settings"].(map[string]any); ok {
			maps.Copy(settings, specSettings)
		}
		valuesFrom := field[[]any](receiver, "valuesFrom")
		for _, value := range valuesFrom {
			if err := setRecorderValue(settings, value, recorderURL); err != nil {
				return nil, err
			}
		}
		entry := map[string]any{
			"uid":      receiverUID(contactPoint.name, i),
			"type":     receiver["type"],
			"settings": settings,
		}
		if disable, ok := receiver["disableResolveMessage"]; ok {
			entry["disableResolveMessage"] = disable
		}
		receivers = append(receivers, entry)
	}
	// Grafana expands environment variables in contact point settings, so every '$' is doubled.
	escaped := make([]any, 0, len(receivers))
	for _, receiver := range receivers {
		escaped = append(escaped, escapeProvisioningMap(receiver))
	}
	return map[string]any{"orgId": 1, "name": escapeProvisioningValue(name), "receivers": escaped}, nil
}

var errValuesFromTarget = errors.New("valuesFrom has no targetPath or secret")

func setRecorderValue(settings map[string]any, value any, recorderURL string) error {
	entry, ok := value.(map[string]any)
	if !ok {
		return fmt.Errorf("%w: %v", errValuesFromTarget, value)
	}
	target := field[string](entry, "targetPath")
	valueFrom := field[map[string]any](entry, "valueFrom")
	secret := field[map[string]any](valueFrom, "secretKeyRef")
	secretName := field[string](secret, "name")
	key := field[string](secret, "key")
	if target == "" || secretName == "" || key == "" {
		return fmt.Errorf("%w: %v", errValuesFromTarget, value)
	}
	// targetPath is relative to the receiver's settings; a "settings." prefix is the same path.
	target = strings.TrimPrefix(target, "settings.")
	recorder := strings.TrimSuffix(recorderURL, "/") + "/" + secretName + "/" + key
	parts := strings.Split(target, ".")
	current := settings
	for _, part := range parts[:len(parts)-1] {
		next, ok := current[part].(map[string]any)
		if !ok {
			next = map[string]any{}
			current[part] = next
		}
		current = next
	}
	current[parts[len(parts)-1]] = recorder
	return nil
}

// receiverUID derives a stable receiver UID from the contact point's resource name.
func receiverUID(name string, index int) string {
	uid := nonUIDCharacters.ReplaceAllString(name, "-")
	suffix := fmt.Sprintf("-%d", index)
	if len(uid)+len(suffix) > grafanaUIDMaxLength {
		uid = uid[:grafanaUIDMaxLength-len(suffix)]
	}
	return uid + suffix
}

// recorderURL is where the local Grafana sends the notifications of the full profile.
func recorderURL() string {
	return "http://" + manifests.AlertRecorderName + "." + manifests.GrafanaNamespace + ".svc.cluster.local"
}

// field returns m[key] as a T, or T's zero value when it is missing or of another type.
func field[T any](m map[string]any, key string) T {
	value, ok := m[key].(T)
	if !ok {
		var zero T
		return zero
	}
	return value
}
