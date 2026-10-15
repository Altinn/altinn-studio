package alerttest

import (
	"context"
	"errors"
	"fmt"
	"maps"
	"slices"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/types"

	"altinn.studio/devenv/pkg/kubernetes"
)

const (
	// quietWatch outlasts the longest pending period a restart could start (the proxy rule's 15
	// minutes) plus an evaluation and the notification's group wait.
	quietWatch     = 17 * time.Minute
	restartWait    = 5 * time.Minute
	restartedAtKey = "kubectl.kubernetes.io/restartedAt"
)

var errNoisy = errors.New("a rule fired during normal operation")

// restart is one routine disruption: a rolling restart of a workload, as a deploy or a node
// upgrade causes.
type restart struct {
	run         func(ctx context.Context, kube *kubernetes.KubernetesClient) error
	description string
}

// restarts are the routine disruptions CheckQuiet goes through. The proxy's Deployment is
// Flux's, so it gets a rolling restart; the operator owns the agents' and the scraper's
// workloads and would undo a restart annotation, so their pods are replaced one at a time, as a
// rolling update replaces them.
func restarts() []restart {
	return []restart{
		{
			description: "rolling restart of the observability-proxy Deployment",
			run: func(ctx context.Context, kube *kubernetes.KubernetesClient) error {
				if err := patchJSON(ctx, kube, deploymentGVR, observabilityNamespace, proxyDeployment,
					types.MergePatchType, map[string]any{"spec": map[string]any{"template": map[string]any{
						"metadata": map[string]any{"annotations": map[string]string{
							restartedAtKey: time.Now().UTC().Format(time.RFC3339),
						}},
					}}}); err != nil {
					return err
				}
				return waitDeployment(ctx, kube, proxyDeployment, restartWait)
			},
		},
		{
			description: "vmagent-self's pod replaced (its Deployment recreates rather than rolls)",
			run: func(ctx context.Context, kube *kubernetes.KubernetesClient) error {
				return replacePods(ctx, kube, "app.kubernetes.io/name=vmagent,app.kubernetes.io/instance=self")
			},
		},
		{
			description: "vlagent-logs' pods replaced one at a time",
			run: func(ctx context.Context, kube *kubernetes.KubernetesClient) error {
				return replacePods(ctx, kube, "app.kubernetes.io/name=vlagent,app.kubernetes.io/instance=logs")
			},
		},
		{
			description: "vmagent-metrics' pods replaced one at a time",
			run: func(ctx context.Context, kube *kubernetes.KubernetesClient) error {
				return replacePods(ctx, kube, "app.kubernetes.io/name=vmagent,app.kubernetes.io/instance=metrics")
			},
		},
	}
}

// CheckQuiet checks that no rule fires while the stack is healthy and through routine restarts
// of the proxy, the scraper and the agents: no rule may reach Alerting and the recorder must
// receive nothing. Pending is allowed and reported, since a rule's pending period is what
// absorbs a restart.
func CheckQuiet(ctx context.Context, env *Env) error {
	ev := env.Evidence
	states, err := env.Grafana.RuleStates(ctx)
	if err != nil {
		return err
	}
	if len(states) == 0 {
		return errNoRules
	}
	if busy := notNormal(states); len(busy) > 0 {
		return fmt.Errorf("%w before the restarts: %s", errNoisy, strings.Join(busy, ", "))
	}
	if err = env.Recorder.Reset(ctx); err != nil {
		return err
	}
	ev.Logf("baseline: all %d rules Normal; watching them through the restarts", len(states))

	watch := newRuleWatch()
	if err = watch.sample(ctx, env); err != nil {
		return err
	}
	for _, r := range restarts() {
		ev.Logf("restart: %s", r.description)
		if err = r.run(ctx, env.Kube); err != nil {
			return fmt.Errorf("%s: %w", r.description, err)
		}
		ev.Logf("restart done")
		if err = watch.sample(ctx, env); err != nil {
			return err
		}
	}
	ev.Logf("watching every rule for %s after the last restart", quietWatch)
	err = poll(ctx, quietWatch, defaultPoll, func() (bool, error) {
		return false, watch.sample(ctx, env)
	})
	if err != nil && !errors.Is(err, errTimeout) {
		return err
	}
	return watch.verdict(ctx, env)
}

// verdict saves what the watch saw and fails if any rule fired or anything was notified.
func (w *ruleWatch) verdict(ctx context.Context, env *Env) error {
	ev := env.Evidence
	if err := saveNotifications(ctx, env); err != nil {
		return err
	}
	messages, err := env.Recorder.Messages(ctx)
	if err != nil {
		return err
	}
	if err = ev.WriteJSON("rule-states-seen.json", w.seen); err != nil {
		return err
	}
	for _, uid := range slices.Sorted(maps.Keys(w.seen)) {
		ev.Logf("rule %s: states seen %v", uid, w.seen[uid])
	}
	if len(w.alerting) > 0 || len(messages) > 0 {
		return fmt.Errorf("%w: alerting %v, %d notifications", errNoisy, w.alerting, len(messages))
	}
	ev.Logf("PASS: no rule fired and no notification was sent through the restarts")
	return nil
}

func notNormal(states map[string]RuleStateWithFolder) []string {
	var busy []string
	for uid, state := range states {
		for _, alert := range state.Rule.Alerts {
			if !isNormal(alert.State) {
				busy = append(busy, uid+" "+alert.State)
			}
		}
	}
	slices.Sort(busy)
	return busy
}

// ruleWatch records the states each rule's instances pass through.
type ruleWatch struct {
	seen     map[string][]string
	alerting []string
}

func newRuleWatch() *ruleWatch {
	return &ruleWatch{seen: map[string][]string{}}
}

func (w *ruleWatch) sample(ctx context.Context, env *Env) error {
	states, err := env.Grafana.RuleStates(ctx)
	if err != nil {
		return err
	}
	for uid, state := range states {
		if _, ok := w.seen[uid]; !ok {
			w.seen[uid] = []string{}
		}
		for _, alert := range state.Rule.Alerts {
			if isNormal(alert.State) || slices.Contains(w.seen[uid], alert.State) {
				continue
			}
			w.seen[uid] = append(w.seen[uid], alert.State)
			env.Evidence.Logf("rule %s instance %s is %s", uid, formatLabels(alert.Labels, nil), alert.State)
			if hasState(alert.State, stateAlerting) && !slices.Contains(w.alerting, uid) {
				w.alerting = append(w.alerting, uid)
			}
		}
	}
	return nil
}

// replacePods deletes the selected pods one at a time, waiting for all of them to be ready
// again before the next, as a rolling update does.
func replacePods(ctx context.Context, kube *kubernetes.KubernetesClient, selector string) error {
	pods, err := kube.ListPods(ctx, observabilityNamespace, selector)
	if err != nil {
		return fmt.Errorf("list pods: %w", err)
	}
	for _, pod := range pods {
		if err := kube.DeleteResource(ctx, podGVR, observabilityNamespace, pod.Name); err != nil {
			return fmt.Errorf("delete pod %s: %w", pod.Name, err)
		}
		err := poll(ctx, restartWait, scenarioPoll, func() (bool, error) {
			current, listErr := kube.ListPods(ctx, observabilityNamespace, selector)
			if listErr != nil {
				return false, fmt.Errorf("list pods: %w", listErr)
			}
			return len(current) == len(pods) && allReady(current, pod.UID), nil
		})
		if err != nil {
			return fmt.Errorf("waiting for %s to be replaced and ready: %w", pod.Name, err)
		}
	}
	return nil
}

// allReady reports whether every pod is ready and none is the deleted one.
func allReady(pods []corev1.Pod, deleted types.UID) bool {
	for _, pod := range pods {
		if pod.UID == deleted || pod.DeletionTimestamp != nil {
			return false
		}
		ready := false
		for _, condition := range pod.Status.Conditions {
			if condition.Type == corev1.PodReady && condition.Status == corev1.ConditionTrue {
				ready = true
			}
		}
		if !ready {
			return false
		}
	}
	return true
}
