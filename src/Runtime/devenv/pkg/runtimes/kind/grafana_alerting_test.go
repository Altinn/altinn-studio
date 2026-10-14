package kind

import (
	"errors"
	"strings"
	"testing"

	"sigs.k8s.io/yaml"
)

type alertingFile struct {
	Groups []struct {
		Name   string           `json:"name"`
		Folder string           `json:"folder"`
		Rules  []map[string]any `json:"rules"`
	} `json:"groups"`
	ContactPoints []struct {
		Name      string           `json:"name"`
		Receivers []map[string]any `json:"receivers"`
	} `json:"contactPoints"`
}

func TestLoadGrafanaContent_Alerting(t *testing.T) {
	content, err := loadGrafanaContent(testDashboardsRepository, grafanaContentOptions{
		alerting:    true,
		recorderURL: "http://recorder.test",
	})
	if err != nil {
		t.Fatalf("loadGrafanaContent() error = %v", err)
	}
	var file alertingFile
	if err := yaml.Unmarshal([]byte(content.Alerting), &file); err != nil {
		t.Fatalf("parse alerting provisioning: %v\n%s", err, content.Alerting)
	}
	t.Run("rule groups", func(t *testing.T) { assertRuleGroups(t, file) })
	t.Run("contact points", func(t *testing.T) { assertContactPoints(t, file) })
	t.Run("dashboard providers", func(t *testing.T) {
		assertDashboardProviders(t, content.DashboardProviders, content.DashboardDirs)
	})
}

func assertRuleGroups(t *testing.T, file alertingFile) {
	t.Helper()
	if len(file.Groups) != 1 {
		t.Fatalf("groups = %v, want only the group whose datasources the local Grafana has", file.Groups)
	}
	group := file.Groups[0]
	if group.Folder != studioFolderTitle+"/Observability" {
		t.Errorf("group folder = %q, want the nested folder's full path", group.Folder)
	}
	rule := group.Rules[0]
	if rule["uid"] != "studio-obs-sample" || rule["for"] != "0s" || rule["noDataState"] != "OK" {
		t.Errorf("rule = %v, want the repository's uid, for and noDataState", rule)
	}
	annotations := field[map[string]any](rule, "annotations")
	// Grafana reads annotations as they are, so their $labels are not escaped.
	if got := annotations["summary"]; got != "Queue {{ $labels.job }} dropping" {
		t.Errorf("summary = %v, want the annotation unchanged", got)
	}
	settings := field[map[string]any](rule, "notification_settings")
	if settings["receiver"] != "Studio Slack Critical" || settings["repeat_interval"] != "24h" {
		t.Errorf("notification_settings = %v, want the receiver and repeat_interval", settings)
	}
}

func assertContactPoints(t *testing.T, file alertingFile) {
	t.Helper()
	if len(file.ContactPoints) != 1 || file.ContactPoints[0].Name != "Studio Slack Critical" {
		t.Fatalf("contact points = %v", file.ContactPoints)
	}
	receiver := file.ContactPoints[0].Receivers[0]
	settings := field[map[string]any](receiver, "settings")
	if got := settings["url"]; got != "http://recorder.test/grafana-slack-webhooks/studio-critical" {
		t.Errorf("webhook url = %v, want the recorder at the Secret's name and key", got)
	}
	if settings["title"] != "{{ .Status }} {{ .CommonLabels.Env }}" {
		t.Errorf("title = %v, want the template unchanged", settings["title"])
	}
	// Grafana expands environment variables in contact point settings, unlike annotations.
	if got := settings["text"]; got != "{{ range $$i, $$a := .Alerts }}{{ $$a.Labels.job }}{{ end }}" {
		t.Errorf("text = %v, want '$' doubled", got)
	}
	if receiver["disableResolveMessage"] != false || receiver["type"] != "slack" {
		t.Errorf("receiver = %v, want type and disableResolveMessage kept", receiver)
	}
}

func assertDashboardProviders(t *testing.T, providersFile string, dirs map[string]string) {
	t.Helper()
	var providers struct {
		Providers []map[string]any `json:"providers"`
	}
	if err := yaml.Unmarshal([]byte(providersFile), &providers); err != nil {
		t.Fatalf("parse dashboard providers: %v", err)
	}
	if len(providers.Providers) != 1 || providers.Providers[0]["folder"] != studioFolderTitle {
		t.Fatalf("providers = %v, want the nested folder's dashboard in its top-level folder", providers.Providers)
	}
	path := field[string](field[map[string]any](providers.Providers[0], "options"), "path")
	if dir := dirs["sample.json"]; dir == "" || !strings.HasSuffix(path, "/"+dir) {
		t.Errorf("dashboard dir = %q, want the provider's directory %q", dir, path)
	}
}

func TestLoadGrafanaContent_NoAlertingByDefault(t *testing.T) {
	content, err := loadGrafanaContent(testDashboardsRepository, grafanaContentOptions{})
	if err != nil {
		t.Fatalf("loadGrafanaContent() error = %v", err)
	}
	if content.Alerting != "" {
		t.Errorf("alerting = %q, want nothing without the full profile", content.Alerting)
	}
}

func TestFolderPath(t *testing.T) {
	folders := map[string]grafanaFolder{
		"root":  {title: "A/B"},
		"child": {title: "C", parent: "root"},
		"loop1": {title: "x", parent: "loop2"},
		"loop2": {title: "y", parent: "loop1"},
	}
	if got, err := folderPath(folders, "child"); err != nil || got != `A\/B/C` {
		t.Errorf("folderPath(child) = %q, %v; want the escaped full path", got, err)
	}
	if _, err := folderPath(folders, "loop1"); !errors.Is(err, errFolderCycle) {
		t.Errorf("folderPath(loop1) error = %v, want a cycle error", err)
	}
	if _, err := folderPath(folders, "missing"); !errors.Is(err, errUnknownFolderRef) {
		t.Errorf("folderPath(missing) error = %v, want an unknown folder error", err)
	}
}

func TestReceiverUID_FitsGrafanaLimit(t *testing.T) {
	uid := receiverUID(strings.Repeat("contact.point/", 10), 3)
	if len(uid) > grafanaUIDMaxLength || !strings.HasSuffix(uid, "-3") || strings.ContainsAny(uid, "./") {
		t.Errorf("receiverUID() = %q", uid)
	}
}
