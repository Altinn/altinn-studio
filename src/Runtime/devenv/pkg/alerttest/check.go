package alerttest

import (
	"context"
	"errors"
	"fmt"
	"maps"
	"regexp"
	"slices"
	"strings"
	"time"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"

	"altinn.studio/devenv/pkg/kubernetes"
	"altinn.studio/devenv/pkg/runtimes/kind/manifests"
)

const (
	// syncWait covers grafana-operator's first sync after the fixture starts, and the first
	// evaluation of each rule, which Grafana runs every minute.
	syncWait     = 3 * time.Minute
	deliveryWait = time.Minute
	pollInterval = 5 * time.Second
)

var (
	errCheckFailed   = errors.New("alert check failed")
	errNotSynced     = errors.New("grafana-operator has not synced resources")
	errNoRules       = errors.New("grafana has no alert rules; is the fixture running with --monitoring-profile full?")
	errNotHealthy    = errors.New("rule did not evaluate healthy")
	errNoReceiver    = errors.New("rule's receiver is not a contact point")
	errEmptyTemplate = errors.New("contact point template renders nothing")
	errTargetsDown   = errors.New("self-monitoring targets are down")
	errNotDelivered  = errors.New("test notifications did not reach the recorder")
	errTimeout       = errors.New("timed out")

	labelReference  = regexp.MustCompile(`{{-?\s*\$labels\.([a-zA-Z_][a-zA-Z0-9_]*)\s*-?}}`)
	templateSetting = regexp.MustCompile(`^(title|text|message|subject|body)$`)

	// grafanaResources are the grafana-operator resources the fixture applies.
	grafanaResources = []string{
		"grafanafolders", "grafanadashboards", "grafanadatasources", "grafanaalertrulegroups", "grafanacontactpoints",
	}
)

// Env is what a check works with: the cluster, the fixture's Grafana and recorder, and the
// evidence of the run.
type Env struct {
	Kube     *kubernetes.KubernetesClient
	Grafana  *Grafana
	Recorder *Recorder
	Evidence *Evidence
}

// NewEnv returns the clients for the fixture's Grafana and recorder.
func NewEnv(kube *kubernetes.KubernetesClient, evidence *Evidence) *Env {
	return &Env{Kube: kube, Grafana: &Grafana{kube: kube}, Recorder: &Recorder{kube: kube}, Evidence: evidence}
}

// Check is the quick check of the Studio alert rules in the full profile's Grafana, in the
// healthy state: grafana-operator has synced every resource, every rule evaluates healthy and
// notifies a contact point whose message template renders a firing and a resolved
// notification for it, every self-monitoring target is up, and each contact point delivers a
// test notification to the recorder. It fires nothing.
func Check(ctx context.Context, env *Env) error {
	ev := env.Evidence
	if err := waitSynced(ctx, env); err != nil {
		return err
	}
	rules, states, err := waitEvaluated(ctx, env)
	if err != nil {
		return err
	}
	points, err := env.Grafana.ContactPoints(ctx)
	if err != nil {
		return err
	}
	byName := map[string]ContactPoint{}
	for _, point := range points {
		byName[point.Name] = point
	}

	var failures []error
	fail := func(err error) {
		ev.Logf("FAIL %v", err)
		failures = append(failures, err)
	}
	snapshots := map[string]any{}
	for _, rule := range rules {
		rendered, err := checkRule(ctx, env, rule, states[rule.UID], byName)
		if err != nil {
			fail(fmt.Errorf("%s: %w", rule.UID, err))
			continue
		}
		snapshots[rule.UID] = map[string]any{"rule": rule, "state": states[rule.UID], "rendered": rendered}
	}
	if err := checkTargets(ctx, env); err != nil {
		fail(err)
	}
	if err := sendTestNotifications(ctx, env, byName); err != nil {
		fail(err)
	}
	if err := ev.WriteJSON("rules.json", snapshots); err != nil {
		fail(err)
	}
	if err := saveNotifications(ctx, env); err != nil {
		fail(err)
	}
	if len(failures) > 0 {
		return fmt.Errorf("%w: %w", errCheckFailed, errors.Join(failures...))
	}
	ev.Logf("PASS: %d rules and %d contact points checked", len(rules), len(byName))
	return nil
}

// waitSynced waits until grafana-operator reports every resource the fixture applied as
// synchronized into Grafana.
func waitSynced(ctx context.Context, env *Env) error {
	var pending []string
	counts := map[string]int{}
	err := poll(ctx, syncWait, func() (bool, error) {
		pending = nil
		for _, name := range grafanaResources {
			gvr := schema.GroupVersionResource{Group: "grafana.integreatly.org", Version: "v1beta1", Resource: name}
			objects, err := env.Kube.List(ctx, gvr, manifests.GrafanaNamespace, "")
			if err != nil {
				return false, fmt.Errorf("list Grafana resources: %w", err)
			}
			counts[name] = len(objects)
			for _, object := range objects {
				if !synchronized(object) {
					pending = append(pending, object.GetKind()+"/"+object.GetName())
				}
			}
		}
		return len(pending) == 0, nil
	})
	if err != nil {
		return fmt.Errorf("%w: %v: %w", errNotSynced, pending, err)
	}
	parts := make([]string, 0, len(counts))
	for _, name := range grafanaResources {
		parts = append(parts, fmt.Sprintf("%d %s", counts[name], strings.TrimPrefix(name, "grafana")))
	}
	env.Evidence.Logf("ok   grafana-operator synced %s", strings.Join(parts, ", "))
	return nil
}

// synchronized reports whether grafana-operator's *Synchronized condition on a resource is true
// for its current generation.
func synchronized(object unstructured.Unstructured) bool {
	conditions, _, err := unstructured.NestedSlice(object.Object, "status", "conditions")
	if err != nil {
		return false
	}
	for _, item := range conditions {
		condition, isMap := item.(map[string]any)
		if kind, isString := condition["type"].(string); isMap && isString && strings.HasSuffix(kind, "Synchronized") {
			generation, hasGeneration := condition["observedGeneration"].(int64)
			return condition["status"] == "True" && hasGeneration && generation == object.GetGeneration()
		}
	}
	return false
}

// waitEvaluated waits until Grafana has rules and has evaluated each of them healthy since the
// check started, and returns them sorted by UID with their states. Rules that stay unhealthy are
// returned too, for checkRule to report.
func waitEvaluated(ctx context.Context, env *Env) ([]Rule, map[string]RuleState, error) {
	start := time.Now()
	var rules []Rule
	var states map[string]RuleState
	err := poll(ctx, syncWait, func() (bool, error) {
		var err error
		if rules, err = env.Grafana.Rules(ctx); err != nil {
			return false, err
		}
		if states, err = env.Grafana.RuleStates(ctx); err != nil {
			return false, err
		}
		for _, rule := range rules {
			// Grafana reports a rule it has not evaluated yet as healthy.
			if state := states[rule.UID]; state.Health != "ok" || state.LastEvaluation.Before(start) {
				return false, nil
			}
		}
		return len(rules) > 0, nil
	})
	if len(rules) == 0 {
		return nil, nil, fmt.Errorf("%w: %w", errNoRules, err)
	}
	slices.SortFunc(rules, func(a, b Rule) int { return strings.Compare(a.UID, b.UID) })
	return rules, states, nil
}

// checkRule checks that a rule evaluates healthy and that its receiver's templates render a
// firing and a resolved notification for it, and returns what they render.
func checkRule(
	ctx context.Context,
	env *Env,
	rule Rule,
	state RuleState,
	points map[string]ContactPoint,
) (map[string]string, error) {
	if state.Health != "ok" || state.LastEvaluation.IsZero() {
		return nil, fmt.Errorf("%w: health %q, last evaluated %s: %s",
			errNotHealthy, state.Health, state.LastEvaluation, state.LastError)
	}
	receiver := ""
	if rule.NotificationSettings != nil {
		receiver = rule.NotificationSettings.Receiver
	}
	point, ok := points[receiver]
	if !ok {
		return nil, fmt.Errorf("%w: %q", errNoReceiver, receiver)
	}
	rendered, err := renderForRule(ctx, env, rule, point)
	if err != nil {
		return nil, err
	}
	env.Evidence.Logf("ok   %s %q: evaluates %s in %q, notifies %q, whose template renders",
		rule.UID, rule.Title, state.State, state.Folder, receiver)
	return rendered, nil
}

// renderForRule renders the contact point's templated settings for a firing and a resolved
// alert of the rule, with the labels and annotations it would carry.
func renderForRule(ctx context.Context, env *Env, rule Rule, point ContactPoint) (map[string]string, error) {
	labels := map[string]string{"alertname": rule.Title, "grafana_folder": "(folder)"}
	maps.Copy(labels, rule.Labels)
	annotations := map[string]string{}
	for key, value := range rule.Annotations {
		annotations[key] = labelReference.ReplaceAllStringFunc(value, func(ref string) string {
			name := labelReference.FindStringSubmatch(ref)[1]
			if label, ok := labels[name]; ok {
				return label
			}
			return "<" + name + ">"
		})
	}
	var definitions strings.Builder
	for _, key := range slices.Sorted(maps.Keys(point.Settings)) {
		if text, ok := point.Settings[key].(string); ok && templateSetting.MatchString(key) {
			fmt.Fprintf(&definitions, `{{ define "%s" }}%s{{ end }}`, key, text)
		}
	}
	if definitions.Len() == 0 {
		return map[string]string{}, nil
	}
	now := time.Now().UTC()
	out := map[string]string{}
	for status, ends := range map[string]time.Time{"firing": now.Add(time.Hour), "resolved": now.Add(-time.Minute)} {
		alert := map[string]any{
			"labels": labels, "annotations": annotations,
			"startsAt": now.Add(-time.Hour).Format(time.RFC3339), "endsAt": ends.Format(time.RFC3339),
		}
		rendered, err := env.Grafana.RenderTemplate(ctx, definitions.String(), []map[string]any{alert})
		if err != nil {
			return nil, fmt.Errorf("render %q for a %s alert: %w", point.Name, status, err)
		}
		for name, text := range rendered {
			if strings.TrimSpace(text) == "" {
				return nil, fmt.Errorf("%w: %s for a %s alert", errEmptyTemplate, name, status)
			}
			out[status+"."+name] = text
		}
	}
	return out, nil
}

// checkTargets checks that vmagent-self scrapes every target of the stack, since the rules
// read what it scrapes: a target that is down hides the metrics a rule needs.
func checkTargets(ctx context.Context, env *Env) error {
	samples, err := env.Grafana.Query(ctx, "up")
	if err != nil {
		return err
	}
	var down []string
	for _, sample := range samples {
		if sample.Float() < 1 {
			down = append(down, sample.Metric["job"]+" "+sample.Metric["instance"])
		}
	}
	if len(samples) == 0 || len(down) > 0 {
		return fmt.Errorf("%w: %d targets, down: %v", errTargetsDown, len(samples), down)
	}
	env.Evidence.Logf("ok   all %d self-monitoring targets are up", len(samples))
	return nil
}

// sendTestNotifications sends a test notification through each contact point's real notifier
// and waits for the recorder to receive them all.
func sendTestNotifications(ctx context.Context, env *Env, points map[string]ContactPoint) error {
	if err := env.Recorder.Reset(ctx); err != nil {
		return err
	}
	for _, name := range slices.Sorted(maps.Keys(points)) {
		labels := map[string]string{"alertname": "alerttest check of " + name}
		annotations := map[string]string{"summary": "A test notification from the devenv alert check."}
		if err := env.Grafana.TestReceiver(ctx, points[name], labels, annotations); err != nil {
			return err
		}
	}
	var messages []Message
	err := poll(ctx, deliveryWait, func() (bool, error) {
		var err error
		messages, _, err = env.Recorder.Messages(ctx)
		return len(messages) >= len(points), err
	})
	if err != nil {
		return fmt.Errorf("%w: %d of %d: %w", errNotDelivered, len(messages), len(points), err)
	}
	for _, message := range messages {
		title, _, _ := strings.Cut(message.Text(), "\n")
		env.Evidence.Logf("ok   the recorder received %q at %s", title, message.Path)
	}
	return nil
}

// poll calls check every pollInterval until it returns true or the timeout passes, and then
// returns the last error check returned.
func poll(parent context.Context, timeout time.Duration, check func() (bool, error)) error {
	ctx, cancel := context.WithTimeout(parent, timeout)
	defer cancel()
	for {
		ok, err := check()
		if ok && err == nil {
			return nil
		}
		select {
		case <-ctx.Done():
			if parent.Err() != nil {
				return fmt.Errorf("stopped: %w", parent.Err())
			}
			if err != nil {
				return fmt.Errorf("%w after %s: %w", errTimeout, timeout, err)
			}
			return fmt.Errorf("%w after %s", errTimeout, timeout)
		case <-time.After(pollInterval):
		}
	}
}
