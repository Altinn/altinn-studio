package alerttest

import (
	"context"
	"errors"
	"fmt"
	"maps"
	"slices"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/types"
)

// quietWatch outlasts the longest pending period a restart could start (the proxy rule's 15
// minutes) plus an evaluation and the notification's group wait.
const quietWatch = 17 * time.Minute

var (
	errNoisy = errors.New("a rule fired during routine restarts")
	podGVR   = corev1.SchemeGroupVersion.WithResource("pods")
)

// quietRestarts are the workloads CheckQuiet restarts, by pod selector: the proxy, the scraper
// and the agents, whose restarts the rules must ride out.
var quietRestarts = []string{
	"app=" + proxyDeployment,
	"app.kubernetes.io/name=vmagent,app.kubernetes.io/instance=self",
	"app.kubernetes.io/name=vlagent,app.kubernetes.io/instance=logs",
	"app.kubernetes.io/name=vmagent,app.kubernetes.io/instance=metrics",
}

// CheckQuiet checks that no rule fires, and nothing is notified, while the proxy, vmagent-self
// and the agents have their pods replaced one at a time, as a deploy or a node upgrade does.
// Pending is allowed and reported, since a rule's pending period is what absorbs a restart.
func CheckQuiet(ctx context.Context, env *Env) error {
	watch := &ruleWatch{env: env, seen: map[string][]string{}}
	if err := watch.sample(ctx); err != nil {
		return err
	}
	if len(watch.seen) > 0 {
		return fmt.Errorf("%w: rules are not Normal before the restarts: %v", errNoisy, watch.seen)
	}
	if err := env.Recorder.Reset(ctx); err != nil {
		return err
	}
	for _, selector := range quietRestarts {
		env.Evidence.Logf("replacing the pods of %s one at a time", selector)
		if err := replacePods(ctx, env, selector, watch); err != nil {
			return err
		}
	}
	env.Evidence.Logf("watching every rule for %s after the last restart", quietWatch)
	if err := poll(
		ctx,
		quietWatch,
		func() (bool, error) { return false, watch.sample(ctx) },
	); !errors.Is(
		err,
		errTimeout,
	) {
		return err
	}
	if err := saveNotifications(ctx, env); err != nil {
		return err
	}
	messages, _, err := env.Recorder.Messages(ctx)
	if err != nil {
		return err
	}
	for _, uid := range slices.Sorted(maps.Keys(watch.seen)) {
		env.Evidence.Logf("rule %s: states seen %v", uid, watch.seen[uid])
	}
	if len(watch.alerting) > 0 || len(messages) > 0 {
		return fmt.Errorf("%w: alerting %v, %d notifications", errNoisy, watch.alerting, len(messages))
	}
	env.Evidence.Logf("PASS: no rule fired and nothing was notified through the restarts")
	return nil
}

// ruleWatch records the states other than Normal each rule's instances pass through.
type ruleWatch struct {
	env      *Env
	seen     map[string][]string
	alerting []string
}

func (w *ruleWatch) sample(ctx context.Context) error {
	states, err := w.env.Grafana.RuleStates(ctx)
	for uid, state := range states {
		for _, alert := range state.Alerts {
			if hasState(alert.State, "Normal") || slices.Contains(w.seen[uid], alert.State) {
				continue
			}
			w.seen[uid] = append(w.seen[uid], alert.State)
			w.env.Evidence.Logf("rule %s instance %s is %s", uid, formatLabels(alert.Labels), alert.State)
			if hasState(alert.State, stateAlerting) {
				w.alerting = append(w.alerting, uid)
			}
		}
	}
	return err
}

// replacePods deletes the selected pods one at a time, waiting for all of them to be ready
// again before the next, as a rolling update does, and samples the rules meanwhile.
func replacePods(ctx context.Context, env *Env, selector string, watch *ruleWatch) error {
	pods, err := env.Kube.List(ctx, podGVR, observabilityNamespace, selector)
	if err != nil {
		return fmt.Errorf("list pods: %w", err)
	}
	for _, pod := range pods {
		if err := env.Kube.DeleteObjects(ctx, &corev1.Pod{
			TypeMeta:   metav1.TypeMeta{APIVersion: "v1", Kind: "Pod"},
			ObjectMeta: metav1.ObjectMeta{Name: pod.GetName(), Namespace: observabilityNamespace},
		}); err != nil {
			return fmt.Errorf("delete pod: %w", err)
		}
		err := poll(ctx, rolloutWait, func() (bool, error) {
			current, err := env.Kube.List(ctx, podGVR, observabilityNamespace, selector)
			if err != nil {
				return false, fmt.Errorf("list pods: %w", err)
			}
			return len(current) == len(pods) && allReady(current, pod.GetUID()), watch.sample(ctx)
		})
		if err != nil {
			return fmt.Errorf("waiting for %s to be replaced and ready: %w", pod.GetName(), err)
		}
	}
	return nil
}

// allReady reports whether every pod is ready and none is the deleted one.
func allReady(pods []unstructured.Unstructured, deleted types.UID) bool {
	for _, pod := range pods {
		if pod.GetUID() == deleted || pod.GetDeletionTimestamp() != nil {
			return false
		}
		conditions, _ := nested(pod.Object, "status", "conditions").([]any) //nolint:errcheck // Absent is none.
		if !slices.ContainsFunc(conditions, func(item any) bool {
			condition, ok := item.(map[string]any)
			return ok && condition["type"] == "Ready" && condition["status"] == "True"
		}) {
			return false
		}
	}
	return true
}
