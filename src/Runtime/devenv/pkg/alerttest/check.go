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
)

var (
	errCheckFailed    = errors.New("alert rule check failed")
	errNoReceiver     = errors.New("rule's receiver is not a contact point")
	errEmptyTemplate  = errors.New("contact point template renders nothing")
	errNoRules        = errors.New("grafana has no alert rules; is the fixture running with --monitoring-profile full?")
	labelReference    = regexp.MustCompile(`{{-?\s*\$labels\.([a-zA-Z_][a-zA-Z0-9_]*)\s*-?}}`)
	templateSettingRe = regexp.MustCompile(`^(title|text|message|subject|body)$`)
)

// Check is the quick check of every alert rule Grafana loaded from the dashboards repository,
// in the healthy state: each rule's queries run without error, the rule evaluates, its receiver
// exists, and the receiver's message template renders a firing and a resolved notification for
// it. Each contact point also sends one test notification through its real notifier to the
// recorder. It fires nothing and changes nothing.
func Check(ctx context.Context, env *Env) error {
	ev := env.Evidence
	rules, err := env.Grafana.Rules(ctx)
	if err != nil {
		return err
	}
	if len(rules) == 0 {
		return errNoRules
	}
	states, err := env.Grafana.RuleStates(ctx)
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
	slices.SortFunc(rules, func(a, b Rule) int { return strings.Compare(a.UID, b.UID) })
	for _, rule := range rules {
		if err := checkRule(ctx, env, rule, states[rule.UID], byName); err != nil {
			ev.Logf("FAIL %s: %v", rule.UID, err)
			failures = append(failures, fmt.Errorf("%s: %w", rule.UID, err))
		}
	}

	if err := env.Recorder.Reset(ctx); err != nil {
		return err
	}
	for _, name := range slices.Sorted(maps.Keys(byName)) {
		point := byName[name]
		labels := map[string]string{"alertname": "alerttest check of " + name}
		annotations := map[string]string{"summary": "A test notification from the devenv alert check."}
		if err := env.Grafana.TestReceiver(ctx, point, labels, annotations); err != nil {
			ev.Logf("FAIL contact point %q: %v", name, err)
			failures = append(failures, err)
			continue
		}
		ev.Logf("ok   contact point %q (%s) delivered a test notification", name, point.Type)
	}
	if err := waitForMessages(ctx, env, len(byName)); err != nil {
		failures = append(failures, err)
	}
	if err := saveNotifications(ctx, env); err != nil {
		failures = append(failures, err)
	}
	if err := ev.WriteFile("timeline.log", ev.Timeline()); err != nil {
		failures = append(failures, err)
	}
	if len(failures) > 0 {
		return fmt.Errorf("%w: %w", errCheckFailed, errors.Join(failures...))
	}
	ev.Logf("PASS: %d rules and %d contact points checked", len(rules), len(byName))
	return nil
}

func checkRule(
	ctx context.Context,
	env *Env,
	rule Rule,
	state RuleStateWithFolder,
	contactPoints map[string]ContactPoint,
) error {
	ev := env.Evidence
	series, err := env.Grafana.QueryRuleData(ctx, rule)
	if err != nil {
		return err
	}
	if state.Rule.Health != "ok" {
		return fmt.Errorf("%w: health %q: %s", errNotHealthy, state.Rule.Health, state.Rule.LastError)
	}
	receiver := ""
	if rule.NotificationSettings != nil {
		receiver = rule.NotificationSettings.Receiver
	}
	point, ok := contactPoints[receiver]
	if !ok {
		return fmt.Errorf("%w: %q", errNoReceiver, receiver)
	}
	rendered, err := renderForRule(ctx, env, rule, point)
	if err != nil {
		return err
	}
	if err := ev.WriteJSON("rules/"+rule.UID+".json", map[string]any{
		"rule": rule, "state": state, "querySeries": series, "rendered": rendered,
	}); err != nil {
		return err
	}
	ev.Logf("ok   %s %q: queries ran (%s), state %s, folder %q, notifies %q; template renders",
		rule.UID, rule.Title, formatCounts(series), state.Rule.State, state.Folder, receiver)
	return nil
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
	now := time.Now().UTC()
	firing := map[string]any{
		"labels": labels, "annotations": annotations,
		"startsAt": now.Add(-time.Minute).Format(time.RFC3339), "endsAt": now.Add(time.Hour).Format(time.RFC3339),
	}
	resolved := map[string]any{
		"labels": labels, "annotations": annotations,
		"startsAt": now.Add(-time.Hour).Format(time.RFC3339), "endsAt": now.Add(-time.Minute).Format(time.RFC3339),
	}
	var definitions strings.Builder
	for _, key := range slices.Sorted(maps.Keys(point.Settings)) {
		text, ok := point.Settings[key].(string)
		if !ok || !templateSettingRe.MatchString(key) {
			continue
		}
		fmt.Fprintf(&definitions, `{{ define "%s" }}%s{{ end }}`, key, text)
	}
	if definitions.Len() == 0 {
		return map[string]string{}, nil
	}
	out := map[string]string{}
	for status, alert := range map[string]map[string]any{"firing": firing, "resolved": resolved} {
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

func waitForMessages(ctx context.Context, env *Env, want int) error {
	return poll(ctx, time.Minute, 2*time.Second, func() (bool, error) {
		messages, err := env.Recorder.Messages(ctx)
		if err != nil {
			return false, err
		}
		return len(messages) >= want, nil
	})
}

func formatCounts(series map[string]int) string {
	parts := make([]string, 0, len(series))
	for _, ref := range slices.Sorted(maps.Keys(series)) {
		parts = append(parts, fmt.Sprintf("%s: %d frames", ref, series[ref]))
	}
	return strings.Join(parts, ", ")
}
