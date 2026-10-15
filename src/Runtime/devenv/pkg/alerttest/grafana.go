// Package alerttest checks the Studio alert rules that grafana-operator syncs into the fixture's
// Grafana from the dashboards repository, in the full monitoring profile.
//
// Everything is read from the running Grafana, so the tests hold no copy of a query, threshold
// or template. The cluster's Services are reached through the API server's proxy, so no
// port-forward is needed.
package alerttest

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"altinn.studio/devenv/pkg/kubernetes"
	"altinn.studio/devenv/pkg/runtimes/kind/manifests"
)

const (
	// metricsDatasourceUID is the Prometheus-type datasource the observability rules query.
	metricsDatasourceUID = "altinn-studio-metrics"
	requestTimeout       = 30 * time.Second
	// errorBodyLimit is how much of an error response an error message quotes.
	errorBodyLimit = 500
)

var errHTTPStatus = errors.New("unexpected HTTP status")

// Grafana is the fixture's Grafana, reached through the API server's proxy.
type Grafana struct {
	kube *kubernetes.KubernetesClient
}

// Rule is an alert rule as grafana-operator synced it from the dashboards repository.
type Rule struct {
	Annotations          map[string]string `json:"annotations"`
	Labels               map[string]string `json:"labels"`
	NotificationSettings *struct {
		Receiver string `json:"receiver"`
	} `json:"notification_settings"`
	UID       string `json:"uid"`
	Title     string `json:"title"`
	RuleGroup string `json:"ruleGroup"`
	For       string `json:"for"`
}

// Rules returns every alert rule Grafana has.
func (g *Grafana) Rules(ctx context.Context) ([]Rule, error) {
	var rules []Rule
	err := g.request(ctx, http.MethodGet, "/api/v1/provisioning/alert-rules", nil, nil, &rules)
	return rules, err
}

// Rule returns the alert rule with the given UID.
func (g *Grafana) Rule(ctx context.Context, uid string) (Rule, error) {
	var rule Rule
	err := g.request(ctx, http.MethodGet, "/api/v1/provisioning/alert-rules/"+url.PathEscape(uid), nil, nil, &rule)
	return rule, err
}

// RuleState is a rule's latest evaluation, with the folder path and group Grafana lists it in.
type RuleState struct {
	// LastEvaluation is zero until Grafana evaluates the rule.
	LastEvaluation time.Time       `json:"lastEvaluation"`
	UID            string          `json:"uid"`
	State          string          `json:"state"`
	Health         string          `json:"health"`
	LastError      string          `json:"lastError"`
	Folder         string          `json:"folder"`
	Group          string          `json:"group"`
	Alerts         []AlertInstance `json:"alerts"`
}

// AlertInstance is one series of a rule and its state, such as Normal, Pending, Alerting, or
// one of them with a reason, such as "Normal (NoData)".
type AlertInstance struct {
	Labels map[string]string `json:"labels"`
	State  string            `json:"state"`
}

// RuleStates returns the latest evaluation of every rule, by UID.
func (g *Grafana) RuleStates(ctx context.Context) (map[string]RuleState, error) {
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
	states := map[string]RuleState{}
	for _, group := range response.Data.Groups {
		for _, rule := range group.Rules {
			rule.Folder, rule.Group = group.File, group.Name
			states[rule.UID] = rule
		}
	}
	return states, nil
}

// Sample is one series of an instant query result.
type Sample struct {
	Metric map[string]string `json:"metric"`
	Value  [2]any            `json:"value"`
}

// Float returns the sample's value, or 0 when it is not a number.
func (s Sample) Float() float64 {
	text, ok := s.Value[1].(string)
	value, err := strconv.ParseFloat(text, 64)
	if !ok || err != nil {
		return 0
	}
	return value
}

// Query runs an instant PromQL query through the metrics datasource, the path Grafana's rules
// take: Grafana, the observability-proxy and the metrics storage.
func (g *Grafana) Query(ctx context.Context, expr string) ([]Sample, error) {
	var response struct {
		Data struct {
			Result []Sample `json:"result"`
		} `json:"data"`
	}
	path := "/api/datasources/proxy/uid/" + metricsDatasourceUID + "/api/v1/query"
	err := g.request(ctx, http.MethodGet, path, url.Values{"query": {expr}}, nil, &response)
	return response.Data.Result, err
}

// QueryValue runs an instant query and returns the value of its first series, and whether it
// returned one.
func (g *Grafana) QueryValue(ctx context.Context, expr string) (float64, bool, error) {
	samples, err := g.Query(ctx, expr)
	if err != nil || len(samples) == 0 {
		return 0, false, err
	}
	return samples[0].Float(), true, nil
}

// DashboardPanels returns a dashboard's panel titles by ID.
func (g *Grafana) DashboardPanels(ctx context.Context, uid string) (map[int]string, error) {
	type panel struct {
		Title  string  `json:"title"`
		Panels []panel `json:"panels"`
		ID     int     `json:"id"`
	}
	var response struct {
		Dashboard struct {
			Panels []panel `json:"panels"`
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
	var walk func([]panel)
	walk = func(items []panel) {
		for _, item := range items {
			panels[item.ID] = item.Title
			walk(item.Panels)
		}
	}
	walk(response.Dashboard.Panels)
	return panels, nil
}

// ContactPoint is one receiver of a contact point, with its settings decrypted.
type ContactPoint struct {
	Settings              map[string]any `json:"settings"`
	UID                   string         `json:"uid"`
	Name                  string         `json:"name"`
	Type                  string         `json:"type"`
	DisableResolveMessage bool           `json:"disableResolveMessage"`
}

// ContactPoints returns every contact point's receivers.
func (g *Grafana) ContactPoints(ctx context.Context) ([]ContactPoint, error) {
	var export struct {
		ContactPoints []struct {
			Name      string         `json:"name"`
			Receivers []ContactPoint `json:"receivers"`
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
			receiver.Name = point.Name
			points = append(points, receiver)
		}
	}
	return points, nil
}

// TestReceiver sends a test notification with the given labels and annotations through a
// contact point's real notifier, as Grafana's "Test" button does.
func (g *Grafana) TestReceiver(ctx context.Context, point ContactPoint, labels, annotations map[string]string) error {
	body := map[string]any{
		"alert": map[string]any{"labels": labels, "annotations": annotations},
		"receivers": []any{map[string]any{
			"name":                             point.Name,
			"grafana_managed_receiver_configs": []any{point},
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
	path := "/api/alertmanager/grafana/config/api/v1/receivers/test"
	if err := g.request(ctx, http.MethodPost, path, nil, body, &response); err != nil {
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

// RenderTemplate renders template definitions with the given alerts, as the notifier would, and
// returns the output of each template the text defines.
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
	path := "/api/alertmanager/grafana/config/api/v1/templates/test"
	if err := g.request(ctx, http.MethodPost, path, nil, body, &response); err != nil {
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

func (g *Grafana) request(ctx context.Context, method, path string, query url.Values, body, out any) error {
	var data []byte
	header := http.Header{}
	if body != nil {
		var err error
		if data, err = json.Marshal(body); err != nil {
			return fmt.Errorf("encode %s request: %w", path, err)
		}
		header.Set("Content-Type", "application/json")
	}
	response, err := serviceRequest(ctx, g.kube, kubernetes.ServiceProxyRequest{
		Namespace: manifests.GrafanaNamespace,
		Service:   "grafana",
		Port:      "80",
		Method:    method,
		Path:      path,
		Query:     query,
		Header:    header,
		Body:      data,
	})
	if err != nil || out == nil || len(response) == 0 {
		return err
	}
	if err := json.Unmarshal(response, out); err != nil {
		return fmt.Errorf("grafana %s %s: decode response: %w", method, path, err)
	}
	return nil
}

// serviceRequest sends a request to a Service in the cluster and returns the body of a
// successful response.
func serviceRequest(
	ctx context.Context,
	kube *kubernetes.KubernetesClient,
	req kubernetes.ServiceProxyRequest,
) ([]byte, error) {
	ctx, cancel := context.WithTimeout(ctx, requestTimeout)
	defer cancel()
	status, body, err := kube.ServiceProxy(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("%s %s %s: %w", req.Service, req.Method, req.Path, err)
	}
	if status < 200 || status > 299 {
		if len(body) > errorBodyLimit {
			body = body[:errorBodyLimit]
		}
		return nil, fmt.Errorf("%s %s %s: %w %d: %s", req.Service, req.Method, req.Path, errHTTPStatus, status, body)
	}
	return body, nil
}
