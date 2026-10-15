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

	"k8s.io/apimachinery/pkg/runtime"

	"altinn.studio/devenv/pkg/kubernetes"
)

// Scenario fires one alert rule with a real fault in the stack and removes it again. The fault
// is the same for every scenario, in kind: test resources such as a pod sending traffic, and
// overrides of fields of the stack's own objects, such as a replica count. RunScenario checks the
// healthy baseline, the firing alert and notification, the notification's links, the recovery
// and the resolved notification. The rule's query, threshold and window are the dashboards
// repository's own.
type Scenario struct {
	// labels are labels the firing alert instance must carry.
	labels map[string]string
	// rollout, when set, is waited for once the overrides are in place, before load starts.
	rollout *rollout
	// beforeRecover, when set, runs first on recovery.
	beforeRecover func(ctx context.Context, env *Env) error
	name          string
	description   string
	ruleUID       string
	// injected is PromQL that returns a positive value once the fault shows in the metrics
	// storage, read through Grafana as the rule reads it; empty when the fault takes away the
	// read path itself. recovered likewise once the stack is healthy again.
	injected  string
	recovered string
	// objects are test resources the fault needs; load are those started once the overrides
	// are in place, and stopped first on recovery.
	objects   []runtime.Object
	load      []runtime.Object
	overrides []override
	// stopObjects deletes the objects on recovery instead of at cleanup.
	stopObjects bool
}

// Name identifies the scenario on the command line.
func (s *Scenario) Name() string { return s.name }

// Description says, in a sentence, what fault the scenario causes.
func (s *Scenario) Description() string { return s.description }

// RuleUID is the rule the scenario fires, as the dashboards repository names it.
func (s *Scenario) RuleUID() string { return s.ruleUID }

// Scenarios lists the scenarios the run command knows.
func Scenarios() []*Scenario {
	return append(queueScenarios(), faultScenarios()...)
}

// Timing bounds each wait. The rules evaluate every minute and Grafana waits group_wait (30s)
// before notifying, so firing is a few minutes past the rule's pending period, which is added
// to fire; resolution waits for the rule's own window, up to ten minutes, and the resolved
// notification for the group_interval (5m) after the firing one.
type Timing struct {
	Baseline time.Duration
	Fire     time.Duration
	Notify   time.Duration
	Resolve  time.Duration
	Fault    time.Duration
	Cleanup  time.Duration
}

// DefaultTiming is generous enough for the five-minute windows of the observability rules.
func DefaultTiming() Timing {
	const (
		baseline = 5 * time.Minute
		fire     = 6 * time.Minute
		notify   = 7 * time.Minute
		resolve  = 16 * time.Minute
		fault    = 12 * time.Minute
		cleanup  = 10 * time.Minute
	)
	return Timing{Baseline: baseline, Fire: fire, Notify: notify, Resolve: resolve, Fault: fault, Cleanup: cleanup}
}

const stateAlerting = "Alerting"

var (
	errUnexpectedFiring = errors.New("rule is not Normal before the fault")
	errMissingLink      = errors.New("notification lacks a link")
	errLinkTarget       = errors.New("notification link does not open its target")
)

// Inject starts the test resources, applies the overrides and waits for the fault to show.
func (s *Scenario) Inject(ctx context.Context, env *Env, timing Timing) error {
	ev := env.Evidence
	if err := apply(ctx, env, "test resources", s.objects); err != nil {
		return err
	}
	for _, name := range s.kustomizations() {
		if err := suspendKustomization(ctx, env.Kube, name); err != nil {
			return err
		}
		ev.Logf("suspended Flux Kustomization %s/%s so it does not undo the overrides", fluxNamespace, name)
	}
	for _, o := range s.overrides {
		if err := o.apply(ctx, env.Kube); err != nil {
			return err
		}
		value := "changed"
		if _, computed := o.value.(func(any) any); !computed {
			value = "= " + mustJSON(o.value)
		}
		ev.Logf("%s %s: %s %s", strings.TrimSuffix(o.gvr.Resource, "s"), o.name, o.pointer, value)
	}
	if s.rollout != nil {
		if err := s.rollout.wait(ctx, env.Kube); err != nil {
			return err
		}
		ev.Logf("%s rolled out with the overrides", s.rollout.statefulSet)
	}
	if err := apply(ctx, env, "load", s.load); err != nil {
		return err
	}
	if s.injected == "" {
		return nil
	}
	if err := waitQuery(ctx, env, s.injected, timing.Fault, s.load); err != nil {
		return fmt.Errorf("waiting for the fault to show: %w", err)
	}
	ev.Logf("fault shows in the metrics storage: %s", s.injected)
	return nil
}

// Recover stops the load, runs the scenario's own recovery, restores the overrides and waits
// for the stack to be healthy again.
func (s *Scenario) Recover(ctx context.Context, env *Env, timing Timing) error {
	if err := env.Kube.DeleteObjects(ctx, s.load...); err != nil {
		return fmt.Errorf("stop the load: %w", err)
	}
	if s.beforeRecover != nil {
		if err := s.beforeRecover(ctx, env); err != nil {
			return err
		}
	}
	if s.stopObjects {
		if err := env.Kube.DeleteObjects(ctx, s.objects...); err != nil {
			return fmt.Errorf("stop the test resources: %w", err)
		}
		env.Evidence.Logf("test resources stopped")
	}
	for _, o := range s.overrides {
		if err := o.restore(ctx, env.Kube); err != nil {
			return err
		}
	}
	env.Evidence.Logf("overrides restored")
	if err := waitQuery(ctx, env, s.recovered, timing.Fault, nil); err != nil {
		return fmt.Errorf("waiting for the stack to recover: %w", err)
	}
	env.Evidence.Logf("recovered: %s", s.recovered)
	return nil
}

// Cleanup removes the test resources, restores every override and resumes Flux. It is safe to
// repeat, and undoes an interrupted run.
func (s *Scenario) Cleanup(ctx context.Context, env *Env, timing Timing) error {
	errs := make([]error, 0, 1+len(s.overrides)+len(s.kustomizations()))
	errs = append(errs, env.Kube.DeleteObjects(ctx, slices.Concat(s.load, s.objects)...))
	for _, o := range s.overrides {
		errs = append(errs, o.restore(ctx, env.Kube))
	}
	for _, name := range s.kustomizations() {
		resumed, err := resumeKustomization(ctx, env.Kube, name)
		if resumed {
			env.Evidence.Logf("Flux Kustomization %s/%s resumed", fluxNamespace, name)
		}
		errs = append(errs, err)
	}
	if err := errors.Join(errs...); err != nil {
		return err
	}
	return waitQuery(ctx, env, s.recovered, timing.Fault, nil)
}

func (s *Scenario) kustomizations() []string {
	var names []string
	for _, o := range s.overrides {
		if !slices.Contains(names, o.kustomization) {
			names = append(names, o.kustomization)
		}
	}
	return names
}

func apply(ctx context.Context, env *Env, what string, objects []runtime.Object) error {
	if len(objects) == 0 {
		return nil
	}
	if _, err := env.Kube.ApplyObjects(ctx, objects...); err != nil {
		return fmt.Errorf("start the %s: %w", what, err)
	}
	names := make([]string, 0, len(objects))
	for _, object := range objects {
		u, err := kubernetes.ObjectToUnstructured(object)
		if err != nil {
			return fmt.Errorf("start the %s: %w", what, err)
		}
		names = append(names, u.GetKind()+"/"+u.GetName())
	}
	env.Evidence.Logf("started the %s: %s", what, strings.Join(names, ", "))
	return nil
}

// waitQuery waits until the PromQL expression returns a positive value through Grafana. It stops
// early when a load Job fails.
func waitQuery(ctx context.Context, env *Env, expr string, timeout time.Duration, load []runtime.Object) error {
	return poll(ctx, timeout, func() (bool, error) {
		if err := checkJobs(ctx, env.Kube, load); err != nil {
			return false, permanent(err)
		}
		value, ok, err := env.Grafana.QueryValue(ctx, expr)
		return ok && value > 0, err
	})
}

func checkJobs(ctx context.Context, kube *kubernetes.KubernetesClient, objects []runtime.Object) error {
	for _, object := range objects {
		u, err := kubernetes.ObjectToUnstructured(object)
		if err != nil || u.GetKind() != "Job" {
			continue
		}
		job, err := getObject(ctx, kube, jobGVR, u.GetNamespace(), u.GetName())
		if err != nil {
			return err
		}
		if failed, ok := nested(job.Object, "status", "failed").(int64); ok && failed > 0 {
			return fmt.Errorf("%w: %s", errLoadFailed, u.GetName())
		}
	}
	return nil
}

// RunScenario runs one scenario end to end and returns the first failed check. Cleanup runs
// whatever happens, with a context of its own, so a timeout or an interrupt does not skip it.
func RunScenario(ctx context.Context, parent *Env, s *Scenario, timing Timing) (runErr error) {
	ev, err := parent.Evidence.Child(s.name)
	if err != nil {
		return err
	}
	env := *parent
	env.Evidence = ev
	ev.Logf("scenario %s: %s", s.name, s.description)
	defer func() {
		cleanupCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), timing.Cleanup)
		defer cancel()
		ev.Logf("cleanup: removing the scenario's test resources and overrides")
		if cleanupErr := s.Cleanup(cleanupCtx, &env, timing); cleanupErr != nil {
			ev.Logf("cleanup FAILED: %v", cleanupErr)
			runErr = errors.Join(runErr, fmt.Errorf("cleanup: %w", cleanupErr))
		} else {
			ev.Logf("cleanup done")
		}
		runErr = errors.Join(runErr, saveNotifications(cleanupCtx, &env), ev.Close())
	}()

	rule, err := env.Grafana.Rule(ctx, s.ruleUID)
	if err != nil {
		return err
	}
	pending, err := time.ParseDuration(rule.For)
	if err != nil {
		return fmt.Errorf("rule %s: for %q: %w", rule.UID, rule.For, err)
	}
	ev.Logf("rule %q (%s), group %s, pending for %s", rule.Title, rule.UID, rule.RuleGroup, rule.For)
	if err = ev.WriteJSON("rule.json", rule); err != nil {
		return err
	}

	ev.Logf("baseline: waiting for the rule to evaluate healthy with no %s instance", formatLabels(s.labels))
	if _, err = waitInstance(ctx, &env, s, timing.Baseline, "baseline", func(state RuleState, _ []AlertInstance) bool {
		return state.Health == "ok"
	}); err != nil {
		return fmt.Errorf("%w: %w", errUnexpectedFiring, err)
	}
	if err = env.Recorder.Reset(ctx); err != nil {
		return err
	}

	if err = fire(ctx, &env, s, rule, timing.Fire+pending, timing); err != nil {
		return err
	}

	ev.Logf("recover: removing the fault")
	if err = s.Recover(ctx, &env, timing); err != nil {
		return fmt.Errorf("recover: %w", err)
	}
	ev.Logf("waiting for the rule to return to Normal (its own window must clear)")
	if _, err = waitInstance(ctx, &env, s, timing.Resolve, "resolved", func(state RuleState, _ []AlertInstance) bool {
		return state.Health == "ok"
	}); err != nil {
		return err
	}
	ev.Logf("rule Normal again")
	if _, err = waitNotification(ctx, &env, rule, "resolved", timing); err != nil {
		return err
	}
	ev.Logf("PASS: %s fired and resolved, and both notifications reached the recorder", rule.Title)
	return nil
}

// fire puts the fault in place and waits for the firing alert and its notification, whose links
// it checks.
func fire(ctx context.Context, env *Env, s *Scenario, rule Rule, timeout time.Duration, timing Timing) error {
	env.Evidence.Logf("inject: %s", s.description)
	if err := s.Inject(ctx, env, timing); err != nil {
		return fmt.Errorf("inject: %w", err)
	}
	firing, err := waitInstance(ctx, env, s, timeout, "firing", func(_ RuleState, matching []AlertInstance) bool {
		return slices.ContainsFunc(matching, func(a AlertInstance) bool { return hasState(a.State, stateAlerting) })
	})
	if err != nil {
		return err
	}
	env.Evidence.Logf("rule Alerting: %d instances %s", len(firing), formatLabels(s.labels))
	message, err := waitNotification(ctx, env, rule, "firing", timing)
	if err != nil {
		return err
	}
	return checkLinks(ctx, env, rule, message)
}

// waitInstance waits until done holds for the rule's state and its instances that carry the
// scenario's labels. A baseline or resolved wait also needs every such instance Normal. It saves
// the state it ended on as state-<step>.json.
func waitInstance(
	ctx context.Context,
	env *Env,
	s *Scenario,
	timeout time.Duration,
	step string,
	done func(RuleState, []AlertInstance) bool,
) ([]AlertInstance, error) {
	var last RuleState
	var matching []AlertInstance
	err := poll(ctx, timeout, func() (bool, error) {
		states, err := env.Grafana.RuleStates(ctx)
		if err != nil {
			return false, err
		}
		last, matching = states[s.ruleUID], nil
		for _, alert := range last.Alerts {
			if matches(alert.Labels, s.labels) {
				if step != "firing" && !hasState(alert.State, "Normal") {
					return false, nil
				}
				matching = append(matching, alert)
			}
		}
		return done(last, matching), nil
	})
	if err != nil {
		return nil, fmt.Errorf("waiting for the %s state (last: %s, health %s %s, %d instances): %w",
			step, last.State, last.Health, last.LastError, len(last.Alerts), err)
	}
	return matching, env.Evidence.WriteJSON("state-"+step+".json", last)
}

// waitNotification waits for a recorded notification for the rule with the given status,
// matched on the rule's title and the status word, which the Slack template carries.
func waitNotification(ctx context.Context, env *Env, rule Rule, status string, timing Timing) (Message, error) {
	var found Message
	err := poll(ctx, timing.Notify, func() (bool, error) {
		messages, _, err := env.Recorder.Messages(ctx)
		for _, message := range messages {
			text := message.Text()
			if strings.Contains(text, rule.Title) && strings.Contains(strings.ToLower(text), status) {
				found = message
				return true, nil
			}
		}
		return false, err
	})
	if err != nil {
		return Message{}, fmt.Errorf("waiting for a %s notification for %q: %w", status, rule.Title, err)
	}
	title, _, _ := strings.Cut(found.Text(), "\n")
	env.Evidence.Logf("%s notification received at %s: %q", status, found.ReceivedAt, title)
	return found, nil
}

// checkLinks follows the notification's links: one must open the rule and, when the rule names a
// dashboard panel, one that panel, in the fixture's Grafana.
func checkLinks(ctx context.Context, env *Env, rule Rule, message Message) error {
	links := message.Links()
	if dashboard := rule.Annotations["__dashboardUid__"]; dashboard != "" {
		panel := rule.Annotations["__panelId__"]
		link, ok := findLink(links, func(u *url.URL) bool {
			return u.Path == "/d/"+dashboard && u.Query().Get("viewPanel") == panel
		})
		if !ok {
			return fmt.Errorf("%w to dashboard %s panel %s: %v", errMissingLink, dashboard, panel, links)
		}
		panels, err := env.Grafana.DashboardPanels(ctx, dashboard)
		if err != nil {
			return fmt.Errorf("%w: %s: %w", errLinkTarget, link, err)
		}
		id, err := strconv.Atoi(panel)
		if _, exists := panels[id]; err != nil || !exists {
			return fmt.Errorf("%w: %s: dashboard %s has no panel %s", errLinkTarget, link, dashboard, panel)
		}
		env.Evidence.Logf("panel link opens dashboard %s, panel %s %q: %s", dashboard, panel, panels[id], link)
	}
	link, ok := findLink(links, func(u *url.URL) bool {
		return strings.HasPrefix(u.Path, "/alerting/grafana/"+rule.UID+"/")
	})
	if !ok {
		return fmt.Errorf("%w to rule %s: %v", errMissingLink, rule.UID, links)
	}
	env.Evidence.Logf("rule link opens rule %s: %s", rule.UID, link)
	return nil
}

func findLink(links []string, match func(*url.URL) bool) (string, bool) {
	for _, link := range links {
		if parsed, err := url.Parse(link); err == nil && match(parsed) {
			return link, true
		}
	}
	return "", false
}

func matches(labels, want map[string]string) bool {
	for key, value := range want {
		if labels[key] != value {
			return false
		}
	}
	return true
}

func formatLabels(labels map[string]string) string {
	parts := make([]string, 0, len(labels))
	for _, key := range slices.Sorted(maps.Keys(labels)) {
		parts = append(parts, key+"="+labels[key])
	}
	return "{" + strings.Join(parts, ", ") + "}"
}

// hasState reports whether an alert instance's state is want, with or without a reason, such
// as "Alerting (Error)".
func hasState(state, want string) bool {
	return state == want || strings.HasPrefix(state, want+" (")
}
