package alerttest

import (
	"errors"
	"reflect"
	"slices"
	"testing"
)

func TestScenarios(t *testing.T) {
	scenarios := Scenarios()
	names := make([]string, 0, len(scenarios))
	for _, s := range scenarios {
		if slices.Contains(names, s.Name()) {
			t.Errorf("scenario %s is listed twice", s.Name())
		}
		names = append(names, s.Name())
		if s.RuleUID() == "" || s.recovered == "" {
			t.Errorf("scenario %s lacks a rule or a recovery query", s.Name())
		}
		for _, o := range s.overrides {
			if o.kustomization == "" {
				t.Errorf("scenario %s overrides %s without suspending its Flux Kustomization", s.Name(), o.name)
			}
		}
	}
}

func TestLookupPointer(t *testing.T) {
	object := map[string]any{"spec": map[string]any{
		"replicaCount": int64(1),
		"containers":   []any{map[string]any{"name": "proxy"}},
	}}
	if value, present, err := lookupPointer(object, "/spec/replicaCount"); err != nil || !present || value != int64(1) {
		t.Errorf("replicaCount = %v, %v, %v", value, present, err)
	}
	if value, present, err := lookupPointer(
		object,
		"/spec/containers/0/name",
	); err != nil || !present ||
		value != "proxy" {
		t.Errorf("container name = %v, %v, %v", value, present, err)
	}
	if _, present, err := lookupPointer(object, "/spec/extraArgs"); err != nil || present {
		t.Errorf("an absent last field = %v, %v; want absent", present, err)
	}
	if _, _, err := lookupPointer(object, "/spec/extraArgs/flag"); !errors.Is(err, errBadPointer) {
		t.Errorf("an absent parent: error = %v, want %v", err, errBadPointer)
	}
}

func TestWithEnv(t *testing.T) {
	current := []any{
		map[string]any{"name": "A", "value": "1"},
		map[string]any{"name": "B", "value": "2"},
	}
	want := []any{
		map[string]any{"name": "A", "value": "1"},
		map[string]any{"name": "B", "value": "3"},
	}
	if got := withEnv("B", "3")(current); !reflect.DeepEqual(got, want) {
		t.Errorf("withEnv() = %v, want %v", got, want)
	}
	if original := []any{
		map[string]any{"name": "A", "value": "1"},
		map[string]any{"name": "B", "value": "2"},
	}; !reflect.DeepEqual(current, original) {
		t.Errorf("withEnv() changed the original: %v", current)
	}
}

func TestMessageLinks(t *testing.T) {
	var message Message
	message.Body.Attachments = append(message.Body.Attachments, struct {
		Title     string `json:"title"`
		TitleLink string `json:"title_link"`
		Text      string `json:"text"`
	}{
		TitleLink: "http://localhost:3000/alerting/list",
		Text:      "<http://localhost:3000/d/obs?viewPanel=10|Open Observability panel>\n<http://localhost:3000/alerting/grafana/rule/view>",
	})
	want := []string{
		"http://localhost:3000/alerting/list",
		"http://localhost:3000/d/obs?viewPanel=10",
		"http://localhost:3000/alerting/grafana/rule/view",
	}
	if got := message.Links(); !reflect.DeepEqual(got, want) {
		t.Errorf("Links() = %v, want %v", got, want)
	}
}
