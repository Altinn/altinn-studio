// Package alerttest checks and fires the Studio alert rules that the full monitoring profile
// loads into the fixture's Grafana from the dashboards repository.
//
// Everything is read from the running Grafana, which provisions the repository's own rule
// groups and contact points: the tests hold no copy of a query, threshold or template. The
// cluster's Services are reached through the API server's proxy, so no port-forward is needed.
package alerttest

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"maps"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"altinn.studio/devenv/pkg/kubernetes"
	"altinn.studio/devenv/pkg/runtimes/kind/manifests"
)

const (
	// MetricsDatasourceUID is the Prometheus-type datasource the observability rules query.
	MetricsDatasourceUID = "altinn-studio-metrics"
	grafanaService       = "grafana"
	grafanaPort          = "80"
	requestTimeout       = 30 * time.Second
	// errorBodyLimit is how much of an error response an error message quotes.
	errorBodyLimit = 500
)

var (
	errHTTPStatus    = errors.New("unexpected HTTP status")
	errRuleNotFound  = errors.New("alert rule not found in Grafana")
	errQueryNotFound = errors.New("query result has no data")
)

// Grafana is the fixture's Grafana, reached through the API server's proxy.
type Grafana struct {
	kube *kubernetes.KubernetesClient
}

// NewGrafana returns a client for the fixture's Grafana.
func NewGrafana(kube *kubernetes.KubernetesClient) *Grafana {
	return &Grafana{kube: kube}
}

// Rule is an alert rule as Grafana provisioned it from the dashboards repository.
type Rule struct {
	Annotations          map[string]string `json:"annotations"`
	Labels               map[string]string `json:"labels"`
	NotificationSettings *struct {
		Receiver string `json:"receiver"`
	} `json:"notification_settings"`
	UID          string            `json:"uid"`
	Title        string            `json:"title"`
	FolderUID    string            `json:"folderUID"`
	RuleGroup    string            `json:"ruleGroup"`
	For          string            `json:"for"`
	NoDataState  string            `json:"noDataState"`
	ExecErrState string            `json:"execErrState"`
	Condition    string            `json:"condition"`
	Data         []json.RawMessage `json:"data"`
}

// Rules returns every alert rule Grafana has.
func (g *Grafana) Rules(ctx context.Context) ([]Rule, error) {
	var rules []Rule
	if err := g.request(ctx, http.MethodGet, "/api/v1/provisioning/alert-rules", nil, nil, &rules); err != nil {
		return nil, err
	}
	return rules, nil
}

// Rule returns the alert rule with the given UID.
func (g *Grafana) Rule(ctx context.Context, uid string) (Rule, error) {
	var rule Rule
	if err := g.request(
		ctx,
		http.MethodGet,
		"/api/v1/provisioning/alert-rules/"+url.PathEscape(uid),
		nil,
		nil,
		&rule,
	); err != nil {
		return Rule{}, fmt.Errorf("%w: %s: %w", errRuleNotFound, uid, err)
	}
	return rule, nil
}

// RuleState is a rule's evaluation state and its alert instances.
type RuleState struct {
	Name      string          `json:"name"`
	UID       string          `json:"uid"`
	State     string          `json:"state"`
	Health    string          `json:"health"`
	LastError string          `json:"lastError"`
	FolderUID string          `json:"folderUid"`
	Alerts    []AlertInstance `json:"alerts"`
}

// AlertInstance is one series of a rule and its state: Normal, Pending, Alerting, NoData or Error.
type AlertInstance struct {
	Labels      map[string]string `json:"labels"`
	Annotations map[string]string `json:"annotations"`
	State       string            `json:"state"`
	ActiveAt    string            `json:"activeAt"`
	Value       string            `json:"value"`
}

// RuleStates returns the evaluation state of every rule, by UID, with each rule's group file
// (its folder path).
func (g *Grafana) RuleStates(ctx context.Context) (map[string]RuleStateWithFolder, error) {
	var response struct {
		Data struct {
			Groups []struct {
				Name  string      `json:"name"`
				File  string      `json:"file"`
				Rules []RuleState `json:"rules"`
			} `json:"groups"`
		} `json:"data"`
	}
	if err := g.request(ctx, http.MethodGet, "/api/prometheus/grafana/api/v1/rules", nil, nil, &response); err != nil {
		return nil, err
	}
	states := map[string]RuleStateWithFolder{}
	for _, group := range response.Data.Groups {
		for _, rule := range group.Rules {
			states[rule.UID] = RuleStateWithFolder{Rule: rule, Folder: group.File, Group: group.Name}
		}
	}
	return states, nil
}

// RuleStateWithFolder is a rule's state with the folder path and group Grafana lists it in.
type RuleStateWithFolder struct {
	Folder string
	Group  string
	Rule   RuleState
}

// RuleState returns one rule's evaluation state.
func (g *Grafana) RuleState(ctx context.Context, uid string) (RuleStateWithFolder, error) {
	states, err := g.RuleStates(ctx)
	if err != nil {
		return RuleStateWithFolder{}, err
	}
	state, ok := states[uid]
	if !ok {
		return RuleStateWithFolder{}, fmt.Errorf("%w: %s", errRuleNotFound, uid)
	}
	return state, nil
}

// Sample is one series of an instant query result.
type Sample struct {
	Metric map[string]string `json:"metric"`
	Value  [2]any            `json:"value"`
}

// Float returns the sample's value.
func (s Sample) Float() float64 {
	text, ok := s.Value[1].(string)
	if !ok {
		return 0
	}
	var value float64
	if _, err := fmt.Sscan(text, &value); err != nil {
		return 0
	}
	return value
}

// Query runs an instant PromQL query through the metrics datasource, which is the path Grafana's
// rules take: Grafana, the observability-proxy and the metrics storage.
func (g *Grafana) Query(ctx context.Context, expr string) ([]Sample, error) {
	var response struct {
		Data struct {
			Result []Sample `json:"result"`
		} `json:"data"`
	}
	path := "/api/datasources/proxy/uid/" + MetricsDatasourceUID + "/api/v1/query"
	if err := g.request(ctx, http.MethodGet, path, url.Values{"query": {expr}}, nil, &response); err != nil {
		return nil, err
	}
	return response.Data.Result, nil
}

// QueryValue runs an instant query that returns one value, such as a sum.
func (g *Grafana) QueryValue(ctx context.Context, expr string) (float64, error) {
	samples, err := g.Query(ctx, expr)
	if err != nil {
		return 0, err
	}
	if len(samples) == 0 {
		return 0, fmt.Errorf("%w: %s", errQueryNotFound, expr)
	}
	return samples[0].Float(), nil
}

// QueryRuleData runs the rule's queries as Grafana's rule evaluation would, through /api/ds/query,
// and returns an error naming the first query that fails.
func (g *Grafana) QueryRuleData(ctx context.Context, rule Rule) (map[string]int, error) {
	now := time.Now()
	series := map[string]int{}
	for _, raw := range rule.Data {
		var query struct {
			Model             map[string]any `json:"model"`
			RefID             string         `json:"refId"`
			DatasourceUID     string         `json:"datasourceUid"`
			RelativeTimeRange struct {
				From int64 `json:"from"`
				To   int64 `json:"to"`
			} `json:"relativeTimeRange"`
		}
		if err := json.Unmarshal(raw, &query); err != nil {
			return nil, fmt.Errorf("decode rule %s query: %w", rule.UID, err)
		}
		if query.DatasourceUID == "__expr__" {
			continue
		}
		model := map[string]any{}
		maps.Copy(model, query.Model)
		model["refId"] = query.RefID
		model["datasource"] = map[string]any{"uid": query.DatasourceUID}
		var response struct {
			Results map[string]struct {
				Error  string            `json:"error"`
				Frames []json.RawMessage `json:"frames"`
			} `json:"results"`
		}
		body := map[string]any{
			"from": strconv.FormatInt(
				now.Add(-time.Duration(query.RelativeTimeRange.From)*time.Second).UnixMilli(),
				10,
			),
			"to": strconv.FormatInt(
				now.Add(-time.Duration(query.RelativeTimeRange.To)*time.Second).UnixMilli(),
				10,
			),
			"queries": []any{model},
		}
		if err := g.request(ctx, http.MethodPost, "/api/ds/query", nil, body, &response); err != nil {
			return nil, fmt.Errorf("rule %s query %s: %w", rule.UID, query.RefID, err)
		}
		result := response.Results[query.RefID]
		if result.Error != "" {
			return nil, fmt.Errorf("rule %s query %s: %w: %s", rule.UID, query.RefID, errHTTPStatus, result.Error)
		}
		series[query.RefID] = len(result.Frames)
	}
	return series, nil
}

// DashboardPanels returns a dashboard's panel titles by ID, or an error when it does not exist.
func (g *Grafana) DashboardPanels(ctx context.Context, uid string) (map[int]string, error) {
	var response struct {
		Dashboard struct {
			Panels []dashboardPanel `json:"panels"`
		} `json:"dashboard"`
	}
	if err := g.request(
		ctx,
		http.MethodGet,
		"/api/dashboards/uid/"+url.PathEscape(uid),
		nil,
		nil,
		&response,
	); err != nil {
		return nil, err
	}
	panels := map[int]string{}
	var walk func([]dashboardPanel)
	walk = func(items []dashboardPanel) {
		for _, panel := range items {
			panels[panel.ID] = panel.Title
			walk(panel.Panels)
		}
	}
	walk(response.Dashboard.Panels)
	return panels, nil
}

type dashboardPanel struct {
	Title  string           `json:"title"`
	Panels []dashboardPanel `json:"panels"`
	ID     int              `json:"id"`
}

// ContactPoint is a contact point with its settings, secrets included.
type ContactPoint struct {
	Settings              map[string]any `json:"settings"`
	UID                   string         `json:"uid"`
	Name                  string         `json:"name"`
	Type                  string         `json:"type"`
	DisableResolveMessage bool           `json:"disableResolveMessage"`
}

// ContactPoints returns every contact point, with its secure settings decrypted.
func (g *Grafana) ContactPoints(ctx context.Context) ([]ContactPoint, error) {
	var export struct {
		ContactPoints []struct {
			Name      string `json:"name"`
			Receivers []struct {
				Settings              map[string]any `json:"settings"`
				UID                   string         `json:"uid"`
				Type                  string         `json:"type"`
				DisableResolveMessage bool           `json:"disableResolveMessage"`
			} `json:"receivers"`
		} `json:"contactPoints"`
	}
	query := url.Values{"decrypt": {"true"}, "format": {"json"}}
	if err := g.request(
		ctx,
		http.MethodGet,
		"/api/v1/provisioning/contact-points/export",
		query,
		nil,
		&export,
	); err != nil {
		return nil, err
	}
	var points []ContactPoint
	for _, point := range export.ContactPoints {
		for _, receiver := range point.Receivers {
			points = append(points, ContactPoint{
				Settings:              receiver.Settings,
				UID:                   receiver.UID,
				Name:                  point.Name,
				Type:                  receiver.Type,
				DisableResolveMessage: receiver.DisableResolveMessage,
			})
		}
	}
	return points, nil
}

// TestReceiver sends a test notification with the given labels and annotations through a
// contact point's real notifier, as Grafana's "Test" button does.
func (g *Grafana) TestReceiver(
	ctx context.Context,
	point ContactPoint,
	labels map[string]string,
	annotations map[string]string,
) error {
	body := map[string]any{
		"alert": map[string]any{"labels": labels, "annotations": annotations},
		"receivers": []any{map[string]any{
			"name": point.Name,
			"grafana_managed_receiver_configs": []any{map[string]any{
				"uid":                   point.UID,
				"name":                  point.Name,
				"type":                  point.Type,
				"settings":              point.Settings,
				"disableResolveMessage": point.DisableResolveMessage,
			}},
		}},
	}
	var response struct {
		Receivers []struct {
			Configs []struct {
				Status string `json:"status"`
				Error  string `json:"error"`
			} `json:"grafana_managed_receiver_configs"`
		} `json:"receivers"`
	}
	if err := g.request(
		ctx,
		http.MethodPost,
		"/api/alertmanager/grafana/config/api/v1/receivers/test",
		nil,
		body,
		&response,
	); err != nil {
		return err
	}
	for _, receiver := range response.Receivers {
		for _, config := range receiver.Configs {
			if config.Status != "ok" {
				return fmt.Errorf(
					"test notification for %s: %w: %s %s",
					point.Name,
					errHTTPStatus,
					config.Status,
					config.Error,
				)
			}
		}
	}
	return nil
}

// RenderTemplate renders a template with the given alerts, as the notifier would, and returns
// the output of each template the text defines.
func (g *Grafana) RenderTemplate(
	ctx context.Context,
	template string,
	alerts []map[string]any,
) (map[string]string, error) {
	var response struct {
		Results []struct {
			Name string `json:"name"`
			Text string `json:"text"`
		} `json:"results"`
		Errors []struct {
			Name    string `json:"name"`
			Message string `json:"message"`
		} `json:"errors"`
	}
	body := map[string]any{"name": "alerttest", "template": template, "alerts": alerts}
	if err := g.request(
		ctx,
		http.MethodPost,
		"/api/alertmanager/grafana/config/api/v1/templates/test",
		nil,
		body,
		&response,
	); err != nil {
		return nil, err
	}
	if len(response.Errors) > 0 {
		return nil, fmt.Errorf(
			"render template %s: %w: %s",
			response.Errors[0].Name,
			errHTTPStatus,
			response.Errors[0].Message,
		)
	}
	out := map[string]string{}
	for _, result := range response.Results {
		out[result.Name] = result.Text
	}
	return out, nil
}

func truncate(text string, limit int) string {
	if len(text) <= limit {
		return text
	}
	return text[:limit] + "…"
}

func (g *Grafana) request(ctx context.Context, method, path string, query url.Values, body any, out any) error {
	ctx, cancel := context.WithTimeout(ctx, requestTimeout)
	defer cancel()
	var data []byte
	header := http.Header{}
	if body != nil {
		var err error
		if data, err = json.Marshal(body); err != nil {
			return fmt.Errorf("encode %s request: %w", path, err)
		}
		header.Set("Content-Type", "application/json")
	}
	status, response, err := g.kube.ServiceProxy(ctx, kubernetes.ServiceProxyRequest{
		Namespace: manifests.GrafanaNamespace,
		Service:   grafanaService,
		Port:      grafanaPort,
		Method:    method,
		Path:      path,
		Query:     query,
		Header:    header,
		Body:      data,
	})
	if err != nil {
		return fmt.Errorf("grafana %s %s: %w", method, path, err)
	}
	if status < 200 || status > 299 {
		return fmt.Errorf(
			"grafana %s %s: %w %d: %s",
			method,
			path,
			errHTTPStatus,
			status,
			truncate(string(response), errorBodyLimit),
		)
	}
	if out == nil || len(response) == 0 {
		return nil
	}
	if err := json.Unmarshal(response, out); err != nil {
		return fmt.Errorf("grafana %s %s: decode response: %w", method, path, err)
	}
	return nil
}
