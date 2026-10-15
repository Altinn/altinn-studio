package alerttest

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/util/intstr"

	"altinn.studio/devenv/pkg/kubernetes"
)

//go:embed queue/refuser.py
var refuserScript string

//go:embed queue/load.py
var loadScript string

const (
	refuserName = "alert-test-refuser"
	loadName    = "alert-test-load"
	scriptsName = "alert-test-queue-scripts"
	refuserPort = 8080
	agentPort   = 8429
	// The agent's second remote-write URL is storage copy b, and its queue directory is 2_<hash>,
	// from which the rules' copy label comes.
	refusedCopy   = "b"
	loadedReplica = "vmagent-metrics-0"
	dummyMetric   = "alert_test_queue_fill"
	// queueTestLimit is vmagent's smallest queue per destination, 512MiB plus a block header;
	// anything smaller is rounded up to it. It is a test override: the profile allows 1GiB.
	queueTestLimit = "536871040"
	// blockTestLimit keeps vmagent's in-memory blocks small while it buffers the dummy telemetry,
	// whose 3 KiB labels would otherwise fill its 512Mi memory limit.
	blockTestLimit = 1 << 20
	// loadByteCap bounds the dummy telemetry, about three times the queue.
	loadByteCap = 1536 << 20
	// loadRate paces the dummy telemetry so the agent buffers it within its memory limit; at this
	// rate the queue overflows in about a minute and a half.
	loadRate = 8 << 20
	// queueHalfFullBytes is 70% of queueTestLimit.
	queueHalfFullBytes = 375809728
	loadDeadline       = 600
	drainedBytes       = 1 << 20
	queuePath          = `path=~".*/2_[^/]*"`
)

var jobGVR = batchv1.SchemeGroupVersion.WithResource("jobs")

// queueScenarios fire the agent queue rules with a genuine overflow of vmagent's persistent queue
// for storage copy b: copy b's URL goes to a destination that refuses writes with 503, and paced
// dummy telemetry fills the real queue until it drops blocks, or, for the half-full rule, until
// it is 70% full. vmagent-self scrapes the queue's metrics into the metrics storage, where the
// rules read them. Recovery lets the destination accept, so the queue drains there, and then
// restores the agent. The test overrides are the queue's size and block size, the destination,
// and a relabeling that keeps the dummy telemetry out of copy a.
func queueScenarios() []*Scenario {
	drops := `sum(increase(vm_persistentqueue_blocks_dropped_total{job="vmagent", ` + queuePath + `}[5m])) > 0`
	fill := `max(vm_persistentqueue_bytes_pending{job="vmagent", ` + queuePath + `}
  / (vm_persistentqueue_bytes_pending{job="vmagent", ` + queuePath + `}
     + vm_persistentqueue_free_disk_space_bytes{job="vmagent", ` + queuePath + `})) > 0.5`
	return []*Scenario{
		queueScenario("queue-drops", "studio-obs-agent-queue-drops-prod",
			"vmagent's destination for storage copy b refuses writes until its real queue overflows", drops, 0),
		queueScenario("queue-half-full", "studio-obs-agent-queue-half-full-prod",
			"vmagent's destination for storage copy b refuses writes while its real queue fills to 70%",
			fill, queueHalfFullBytes),
	}
}

func queueScenario(name, ruleUID, description, injected string, fillBytes int) *Scenario {
	agent := func(pointer string, value any) override {
		return override{
			gvr: vmAgentGVR, name: "metrics", kustomization: victoriaKustomization, pointer: pointer, value: value,
		}
	}
	agentPods := map[string]string{"app.kubernetes.io/name": "vmagent", "app.kubernetes.io/instance": "metrics"}
	scripts := &corev1.ConfigMap{
		TypeMeta:   metav1.TypeMeta{APIVersion: "v1", Kind: "ConfigMap"},
		ObjectMeta: testMeta(scriptsName),
		Data:       map[string]string{"refuser.py": refuserScript, "load.py": loadScript},
	}
	refuser := testDeployment(refuserName, scriptContainer(refuserName, "refuser.py"), scriptsVolume())
	return &Scenario{
		name:        name,
		description: description,
		ruleUID:     ruleUID,
		labels:      map[string]string{"job": "vmagent", "copy": refusedCopy},
		objects: []runtime.Object{
			scripts,
			refuser,
			&corev1.Service{
				TypeMeta:   metav1.TypeMeta{APIVersion: "v1", Kind: "Service"},
				ObjectMeta: testMeta(refuserName),
				Spec: corev1.ServiceSpec{
					Selector: map[string]string{"app": refuserName},
					Ports:    []corev1.ServicePort{{Port: refuserPort, TargetPort: intstr.FromInt32(refuserPort)}},
				},
			},
			// The production policies let the agent reach only its storage, and only the proxy
			// and vmagent-self reach the agent. These add the test's paths.
			networkPolicy(refuserName, agentPods, refuserPort, networkingv1.PolicyTypeEgress),
			networkPolicy(loadName, agentPods, agentPort, networkingv1.PolicyTypeIngress),
		},
		overrides: []override{
			agent("/spec/remoteWrite/1/url", refuserURL()),
			agent("/spec/remoteWrite/0/inlineUrlRelabelConfig", []any{map[string]any{
				"action": "drop", "source_labels": []string{"__name__"}, "regex": dummyMetric,
			}}),
			agent("/spec/remoteWriteSettings/maxDiskUsagePerURL", queueTestLimit),
			agent("/spec/remoteWriteSettings/maxBlockSize", blockTestLimit),
		},
		rollout:       &rollout{statefulSet: "vmagent-metrics", contains: refuserName},
		load:          []runtime.Object{loadJob(fillBytes)},
		injected:      injected,
		beforeRecover: drainQueue,
		recovered:     `count(up{job="vmagent"} == 1) >= 2`,
	}
}

// drainQueue lets the refusing destination accept writes, and waits until the queue it held
// has drained there.
func drainQueue(ctx context.Context, env *Env) error {
	if _, err := serviceRequest(ctx, env.Kube, kubernetes.ServiceProxyRequest{
		Namespace: observabilityNamespace,
		Service:   refuserName,
		Port:      strconv.Itoa(refuserPort),
		Method:    http.MethodPost,
		Path:      "/mode",
		Query:     url.Values{"status": {"204"}},
	}); err != nil {
		return fmt.Errorf("let the destination accept writes: %w", err)
	}
	env.Evidence.Logf("the destination accepts writes again (204)")
	drained := fmt.Sprintf(
		`max(vmagent_remotewrite_pending_data_bytes{job="vmagent", url=~"2:.*"}) < bool %d`,
		drainedBytes,
	)
	if err := waitQuery(ctx, env, drained, DefaultTiming().Fault, nil); err != nil {
		return fmt.Errorf("waiting for copy b's queue to drain: %w", err)
	}
	env.Evidence.Logf("copy b's queue drained")
	return nil
}

// rollout is a StatefulSet that an operator rolls out once it has the overrides: its pod
// template contains a given text.
type rollout struct {
	statefulSet string
	contains    string
}

func (r *rollout) wait(ctx context.Context, kube *kubernetes.KubernetesClient) error {
	err := poll(ctx, rolloutWait, func() (bool, error) {
		set, err := getObject(ctx, kube, statefulSetGVR, observabilityNamespace, r.statefulSet)
		if err != nil {
			return false, err
		}
		spec, err := json.Marshal(set.Object["spec"])
		return strings.Contains(string(spec), r.contains), err
	})
	if err != nil {
		return fmt.Errorf("waiting for the operator to update %s: %w", r.statefulSet, err)
	}
	if err := kube.StatefulSetRolloutStatus(ctx, r.statefulSet, observabilityNamespace, rolloutWait); err != nil {
		return fmt.Errorf("waiting for %s to roll out: %w", r.statefulSet, err)
	}
	return nil
}

func refuserURL() string {
	return fmt.Sprintf(
		"http://%s.%s.svc.cluster.local:%d/api/v1/write",
		refuserName,
		observabilityNamespace,
		refuserPort,
	)
}

func loadJob(fillBytes int) *batchv1.Job {
	backoff := int32(0)
	deadline := int64(loadDeadline)
	container := scriptContainer(loadName, "load.py")
	container.Env = []corev1.EnvVar{
		{Name: "TARGET", Value: "http://" + loadedReplica + ":" + strconv.Itoa(agentPort)},
		{Name: "QUEUE", Value: "/2_"},
		{Name: "METRIC", Value: dummyMetric},
		{Name: "MAX_BYTES", Value: strconv.Itoa(loadByteCap)},
		{Name: "RATE", Value: strconv.Itoa(loadRate)},
		{Name: "FILL_BYTES", Value: strconv.Itoa(fillBytes)},
	}
	return &batchv1.Job{
		TypeMeta:   metav1.TypeMeta{APIVersion: "batch/v1", Kind: "Job"},
		ObjectMeta: testMeta(loadName),
		Spec: batchv1.JobSpec{
			BackoffLimit:          &backoff,
			ActiveDeadlineSeconds: &deadline,
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{Labels: map[string]string{"app": loadName, testLabel: loadName}},
				Spec: corev1.PodSpec{
					RestartPolicy: corev1.RestartPolicyNever,
					Containers:    []corev1.Container{container},
					Volumes:       scriptsVolume(),
				},
			},
		},
	}
}

func scriptContainer(name, script string) corev1.Container {
	return testContainer(name, []string{"python3", "-u", "/opt/alert-test/" + script},
		[]corev1.VolumeMount{{Name: "scripts", MountPath: "/opt/alert-test", ReadOnly: true}})
}

func scriptsVolume() []corev1.Volume {
	return []corev1.Volume{{
		Name: "scripts",
		VolumeSource: corev1.VolumeSource{ConfigMap: &corev1.ConfigMapVolumeSource{
			LocalObjectReference: corev1.LocalObjectReference{Name: scriptsName},
		}},
	}}
}

// permanentError stops a poll at once instead of retrying until the timeout.
type permanentError struct{ err error }

func (e permanentError) Error() string { return e.err.Error() }
func (e permanentError) Unwrap() error { return e.err }

func permanent(err error) error { return permanentError{err: err} }
