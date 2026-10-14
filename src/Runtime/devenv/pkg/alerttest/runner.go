package alerttest

import (
	"context"
	"errors"
	"fmt"
	"maps"
	"net/url"
	"slices"
	"strconv"
	"strings"
	"time"

	"altinn.studio/devenv/pkg/kubernetes"
)

// Env is what a scenario works with: the cluster, the fixture's Grafana and recorder, and the
// evidence of the run.
type Env struct {
	Kube     *kubernetes.KubernetesClient
	Grafana  *Grafana
	Recorder *Recorder
	Evidence *Evidence
}

// Scenario fires one alert rule with a real fault and then removes the fault. The runner checks
// the healthy baseline, the firing alert and notification, the recovery, the resolved
// notification and the notification's links; a scenario only puts the fault in place and
// takes it away. Add a scenario for another rule by implementing this and listing it in
// Scenarios.
type Scenario interface {
	// Name identifies the scenario on the command line.
	Name() string
	// Description says, in a sentence, what fault the scenario causes.
	Description() string
	// RuleUID is the rule the scenario fires, as the dashboards repository names it.
	RuleUID() string
	// ExpectedLabels are labels the firing alert instance must carry.
	ExpectedLabels() map[string]string
	// Inject puts the fault in place and returns once the rule's condition holds.
	Inject(ctx context.Context, env *Env) error
	// Recover removes the fault and returns once the system is healthy again.
	Recover(ctx context.Context, env *Env) error
	// Cleanup removes everything the scenario created or changed. It runs after every run,
	// whether it passed or not, and must be safe to repeat.
	Cleanup(ctx context.Context, env *Env) error
}

// Scenarios lists the fault scenarios the run command knows.
func Scenarios() []Scenario {
	return []Scenario{NewQueueDropsScenario()}
}

// Timing bounds each wait. The rules evaluate every minute and Grafana waits group_wait (30s)
// before notifying, so firing is a few minutes; resolution waits for the rule's own window.
type Timing struct {
	Poll     time.Duration
	Baseline time.Duration
	Fire     time.Duration
	Notify   time.Duration
	Resolve  time.Duration
	Cleanup  time.Duration
}

const (
	defaultPoll     = 10 * time.Second
	defaultBaseline = 5 * time.Minute
	defaultFire     = 6 * time.Minute
	defaultNotify   = 4 * time.Minute
	defaultResolve  = 12 * time.Minute
	defaultCleanup  = 6 * time.Minute
)

// DefaultTiming is generous enough for the five-minute windows of the observability rules.
func DefaultTiming() Timing {
	return Timing{
		Poll:     defaultPoll,
		Baseline: defaultBaseline,
		Fire:     defaultFire,
		Notify:   defaultNotify,
		Resolve:  defaultResolve,
		Cleanup:  defaultCleanup,
	}
}

var (
	errNotHealthy       = errors.New("rule is not healthy")
	errMissingLink      = errors.New("notification lacks a link")
	errLinkTarget       = errors.New("notification link does not open the expected target")
	errUnexpectedFiring = errors.New("rule already firing before the fault")
)

// RunScenario runs one scenario end to end and returns the first failed check. Cleanup runs
// whatever happens, with a context of its own so a timeout does not skip it.
func RunScenario(ctx context.Context, env *Env, scenario Scenario, timing Timing) (runErr error) {
	ev := env.Evidence
	ev.Logf("scenario %s: %s", scenario.Name(), scenario.Description())
	defer func() {
		cleanupCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), timing.Cleanup)
		defer cancel()
		ev.Logf("cleanup: removing the scenario's test resources and overrides")
		if err := scenario.Cleanup(cleanupCtx, env); err != nil {
			ev.Logf("cleanup FAILED: %v", err)
			runErr = errors.Join(runErr, fmt.Errorf("cleanup: %w", err))
		} else {
			ev.Logf("cleanup done")
		}
		if err := saveNotifications(context.WithoutCancel(ctx), env); err != nil {
			runErr = errors.Join(runErr, err)
		}
		if err := ev.WriteFile("timeline.log", ev.Timeline()); err != nil {
			runErr = errors.Join(runErr, err)
		}
	}()

	rule, err := env.Grafana.Rule(ctx, scenario.RuleUID())
	if err != nil {
		return err
	}
	if err = ev.WriteJSON("rule.json", rule); err != nil {
		return err
	}
	ev.Logf("rule %q (%s) loaded from the dashboards repository; evaluates %s, for %s",
		rule.Title, rule.UID, rule.RuleGroup, rule.For)

	if err = waitBaseline(ctx, env, scenario, rule, timing); err != nil {
		return err
	}
	if err = env.Recorder.Reset(ctx); err != nil {
		return err
	}

	ev.Logf("inject: %s", scenario.Description())
	if err = scenario.Inject(ctx, env); err != nil {
		return fmt.Errorf("inject: %w", err)
	}
	firing, err := waitForInstance(ctx, env, scenario, timing.Fire, "Alerting")
	if err != nil {
		return err
	}
	ev.Logf("rule Alerting: instance %s", formatLabels(firing.Labels, scenario.ExpectedLabels()))
	firingMessage, err := waitForNotification(ctx, env, rule, "firing", timing)
	if err != nil {
		return err
	}
	ev.Logf("firing notification received at %s: %q", firingMessage.ReceivedAt, firstLine(firingMessage))
	if err = checkLinks(ctx, env, rule, firingMessage); err != nil {
		return err
	}

	ev.Logf("recover: removing the fault")
	if err = scenario.Recover(ctx, env); err != nil {
		return fmt.Errorf("recover: %w", err)
	}
	if err = waitForNormal(ctx, env, scenario, timing.Resolve); err != nil {
		return err
	}
	resolved, err := waitForNotification(ctx, env, rule, "resolved", timing)
	if err != nil {
		return err
	}
	ev.Logf("resolved notification received at %s: %q", resolved.ReceivedAt, firstLine(resolved))
	ev.Logf("PASS: %s fired and resolved, and both notifications reached the recorder", rule.Title)
	return nil
}

func waitBaseline(ctx context.Context, env *Env, scenario Scenario, rule Rule, timing Timing) error {
	ev := env.Evidence
	ev.Logf("baseline: waiting for the rule to evaluate healthy with no %s instance",
		formatLabels(scenario.ExpectedLabels(), nil))
	var last RuleStateWithFolder
	err := poll(ctx, timing.Baseline, timing.Poll, func() (bool, error) {
		state, err := env.Grafana.RuleState(ctx, rule.UID)
		if err != nil {
			return false, err
		}
		last = state
		if state.Rule.Health != "ok" {
			return false, nil
		}
		for _, alert := range state.Rule.Alerts {
			if matches(alert.Labels, scenario.ExpectedLabels()) && alert.State != "Normal" {
				return false, nil
			}
		}
		return true, nil
	})
	if err != nil {
		if last.Rule.Health != "ok" {
			return fmt.Errorf("%w: health %q, last error %q", errNotHealthy, last.Rule.Health, last.Rule.LastError)
		}
		return fmt.Errorf("%w: %w", errUnexpectedFiring, err)
	}
	ev.Logf("baseline healthy: rule %s, health %s, in folder %q", last.Rule.State, last.Rule.Health, last.Folder)
	return env.Evidence.WriteJSON("state-baseline.json", last)
}

func waitForInstance(
	ctx context.Context,
	env *Env,
	scenario Scenario,
	timeout time.Duration,
	want string,
) (AlertInstance, error) {
	var found AlertInstance
	var last RuleStateWithFolder
	err := poll(ctx, timeout, DefaultTiming().Poll, func() (bool, error) {
		state, err := env.Grafana.RuleState(ctx, scenario.RuleUID())
		if err != nil {
			return false, err
		}
		last = state
		for _, alert := range state.Rule.Alerts {
			if matches(alert.Labels, scenario.ExpectedLabels()) && alert.State == want {
				found = alert
				return true, nil
			}
		}
		return false, nil
	})
	if err != nil {
		return AlertInstance{}, fmt.Errorf("waiting for a %s instance %s (last state %s, %d instances): %w",
			want, formatLabels(scenario.ExpectedLabels(), nil), last.Rule.State, len(last.Rule.Alerts), err)
	}
	if err := env.Evidence.WriteJSON("state-firing.json", last); err != nil {
		return AlertInstance{}, err
	}
	return found, nil
}

func waitForNormal(ctx context.Context, env *Env, scenario Scenario, timeout time.Duration) error {
	ev := env.Evidence
	ev.Logf("waiting for the rule to return to Normal (its own window must clear)")
	var last RuleStateWithFolder
	err := poll(ctx, timeout, DefaultTiming().Poll, func() (bool, error) {
		state, err := env.Grafana.RuleState(ctx, scenario.RuleUID())
		if err != nil {
			return false, err
		}
		last = state
		for _, alert := range state.Rule.Alerts {
			if matches(alert.Labels, scenario.ExpectedLabels()) && alert.State != "Normal" {
				return false, nil
			}
		}
		return state.Rule.Health == "ok", nil
	})
	if err != nil {
		return fmt.Errorf("waiting for the rule to return to Normal (last state %s): %w", last.Rule.State, err)
	}
	ev.Logf("rule Normal again")
	return env.Evidence.WriteJSON("state-resolved.json", last)
}

// waitForNotification waits for a recorded notification for the rule with the given status,
// matched on the rule's title and the status word, which every Slack template carries.
func waitForNotification(ctx context.Context, env *Env, rule Rule, status string, timing Timing) (Message, error) {
	var found Message
	err := poll(ctx, timing.Notify, timing.Poll, func() (bool, error) {
		messages, err := env.Recorder.Messages(ctx)
		if err != nil {
			return false, err
		}
		for _, message := range messages {
			text := message.Text()
			if strings.Contains(text, rule.Title) && strings.Contains(strings.ToLower(text), status) {
				found = message
				return true, nil
			}
		}
		return false, nil
	})
	if err != nil {
		return Message{}, fmt.Errorf("waiting for a %s notification for %q: %w", status, rule.Title, err)
	}
	return found, nil
}

// checkLinks follows the notification's links: one must open the rule's dashboard panel and one
// the rule itself, in the fixture's Grafana.
func checkLinks(ctx context.Context, env *Env, rule Rule, message Message) error {
	ev := env.Evidence
	links := message.Links()
	if err := ev.WriteJSON("links.json", links); err != nil {
		return err
	}
	if rule.Annotations["__dashboardUid__"] != "" {
		if err := checkPanelLink(ctx, env, rule, links); err != nil {
			return err
		}
	}
	link, ok := findLink(links, func(u *url.URL) bool {
		return strings.HasPrefix(u.Path, "/alerting/grafana/"+rule.UID+"/")
	})
	if !ok {
		return fmt.Errorf("%w to rule %s: %v", errMissingLink, rule.UID, links)
	}
	if _, err := env.Grafana.Rule(ctx, rule.UID); err != nil {
		return fmt.Errorf("%w: %s: %w", errLinkTarget, link, err)
	}
	ev.Logf("rule link opens rule %s: %s", rule.UID, link)
	return nil
}

// checkPanelLink checks that a link opens the dashboard panel the rule's annotations name.
func checkPanelLink(ctx context.Context, env *Env, rule Rule, links map[string]string) error {
	dashboardUID := rule.Annotations["__dashboardUid__"]
	panelID, err := strconv.Atoi(rule.Annotations["__panelId__"])
	if err != nil {
		return fmt.Errorf("rule %s: __panelId__ %q: %w", rule.UID, rule.Annotations["__panelId__"], err)
	}
	link, ok := findLink(links, func(u *url.URL) bool {
		return u.Path == "/d/"+dashboardUID && u.Query().Get("viewPanel") == strconv.Itoa(panelID)
	})
	if !ok {
		return fmt.Errorf("%w to dashboard %s panel %d: %v", errMissingLink, dashboardUID, panelID, links)
	}
	panels, err := env.Grafana.DashboardPanels(ctx, dashboardUID)
	if err != nil {
		return fmt.Errorf("%w: %s: %w", errLinkTarget, link, err)
	}
	title, ok := panels[panelID]
	if !ok {
		return fmt.Errorf("%w: %s: dashboard %s has no panel %d", errLinkTarget, link, dashboardUID, panelID)
	}
	env.Evidence.Logf("panel link opens dashboard %s, panel %d %q: %s", dashboardUID, panelID, title, link)
	return nil
}

func findLink(links map[string]string, match func(*url.URL) bool) (string, bool) {
	for _, label := range slices.Sorted(maps.Keys(links)) {
		parsed, err := url.Parse(links[label])
		if err == nil && match(parsed) {
			return links[label], true
		}
	}
	return "", false
}

func saveNotifications(ctx context.Context, env *Env) error {
	messages, err := env.Recorder.Messages(ctx)
	if err != nil {
		return err
	}
	if err = env.Evidence.WriteJSON("notifications.json", messages); err != nil {
		return err
	}
	preview, err := env.Recorder.Preview(ctx, messages)
	if err != nil {
		return err
	}
	return env.Evidence.WriteFile("notifications.html", preview)
}

func matches(labels, want map[string]string) bool {
	for key, value := range want {
		if labels[key] != value {
			return false
		}
	}
	return true
}

func formatLabels(labels map[string]string, only map[string]string) string {
	keys := slices.Sorted(maps.Keys(labels))
	parts := make([]string, 0, len(keys))
	for _, key := range keys {
		if only != nil {
			if _, ok := only[key]; !ok {
				continue
			}
		}
		parts = append(parts, key+"="+labels[key])
	}
	return "{" + strings.Join(parts, ", ") + "}"
}

func firstLine(message Message) string {
	for _, attachment := range message.Attachments() {
		if attachment.Title != "" {
			return attachment.Title
		}
	}
	text := message.Text()
	if before, _, ok := strings.Cut(text, "\n"); ok {
		return before
	}
	return text
}

var errTimeout = errors.New("timed out")

// permanentError stops a poll at once instead of retrying until the timeout.
type permanentError struct{ err error }

func (e permanentError) Error() string { return e.err.Error() }
func (e permanentError) Unwrap() error { return e.err }

// permanent marks an error that no retry will fix.
func permanent(err error) error { return permanentError{err: err} }

// poll calls check every interval until it returns true, it fails, or the timeout passes.
// A failing check is retried until the timeout, since the stack is being disturbed on purpose,
// unless its error is permanent; the last error is returned with the timeout.
func poll(ctx context.Context, timeout, interval time.Duration, check func() (bool, error)) error {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	var lastErr error
	for {
		ok, err := check()
		if err == nil && ok {
			return nil
		}
		var stop permanentError
		if errors.As(err, &stop) {
			return stop.err
		}
		if err != nil {
			lastErr = err
		}
		select {
		case <-ctx.Done():
			if lastErr != nil {
				return fmt.Errorf("%w after %s: %w", errTimeout, timeout, lastErr)
			}
			return fmt.Errorf("%w after %s", errTimeout, timeout)
		case <-time.After(interval):
		}
	}
}
