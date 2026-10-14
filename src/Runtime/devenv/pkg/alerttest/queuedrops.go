package alerttest

import (
	"context"
	_ "embed"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/intstr"

	"altinn.studio/devenv/pkg/kubernetes"
)

//go:embed queuedrops/refuser.py
var refuserScript string

//go:embed queuedrops/load.py
var loadScript string

const (
	observabilityNamespace = "observability"
	fluxNamespace          = "default"
	victoriaKustomization  = "observability-victoria"
	metricsAgent           = "metrics"
	metricsAgentSet        = "vmagent-metrics"
	// The agent's second remote-write URL is storage copy b; the alert's copy label comes
	// from the queue's directory, 2_<hash>.
	refusedCopyIndex = 1
	refusedCopy      = "b"
	loadedReplica    = "vmagent-metrics-0"
	agentPort        = 8429
	mebibyteShift    = 20
	// nobodyUser is the unprivileged user the test pods run as.
	nobodyUser = 65534

	testLabel       = "altinn.studio/alert-test"
	testName        = "queue-drops"
	refuserName     = "alert-test-refuser"
	loadName        = "alert-test-load"
	scriptsName     = "alert-test-queue-drops"
	testImage       = "python:3.13-alpine"
	refuserPort     = 8080
	dummyMetricName = "alert_test_queue_fill"
	// originalAnnotation keeps the agent's remote-write settings while the test overrides
	// them, so cleanup can restore them even after an interrupted run.
	originalAnnotation = "altinn.studio/alert-test-original"
	suspendedByTest    = "altinn.studio/alert-test-suspended"

	// queueTestLimit is vmagent's smallest queue per destination, 512MiB plus a block header;
	// anything smaller is rounded up to it. It is a test override: the profile allows 1GiB.
	queueTestLimit = "536871040"
	// blockTestLimit keeps vmagent's in-memory blocks small while it buffers the dummy
	// telemetry, whose 3 KiB labels would otherwise fill its 512Mi memory limit.
	blockTestLimit = 1 << 20
	// loadByteCap bounds the dummy telemetry, about three times the queue.
	loadByteCap = 1536 << 20
	// loadRate paces the dummy telemetry so the agent buffers it within its memory limit; at
	// this rate the queue overflows in about a minute and a half.
	loadRate           = 8 << 20
	loadDeadline       = 10 * time.Minute
	drainedBytes       = 1 << 20
	agentRolloutWait   = 4 * time.Minute
	scenarioPoll       = 5 * time.Second
	refuserReadyWait   = 3 * time.Minute
	dropObservedWait   = 12 * time.Minute
	queueDrainWait     = 6 * time.Minute
	scenarioCPURequest = "50m"
)

var (
	vmAgentGVR = schema.GroupVersionResource{
		Group:    "operator.victoriametrics.com",
		Version:  "v1beta1",
		Resource: "vmagents",
	}
	kustomizationGVR = schema.GroupVersionResource{
		Group:    "kustomize.toolkit.fluxcd.io",
		Version:  "v1",
		Resource: "kustomizations",
	}
	statefulSetGVR   = appsv1.SchemeGroupVersion.WithResource("statefulsets")
	deploymentGVR    = appsv1.SchemeGroupVersion.WithResource("deployments")
	serviceGVR       = corev1.SchemeGroupVersion.WithResource("services")
	configMapGVR     = corev1.SchemeGroupVersion.WithResource("configmaps")
	jobGVR           = batchv1.SchemeGroupVersion.WithResource("jobs")
	networkPolicyGVR = networkingv1.SchemeGroupVersion.WithResource("networkpolicies")

	errAgentShape = errors.New("unexpected VMAgent remote-write configuration")
	errLoadFailed = errors.New("the dummy telemetry did not overflow the queue")
)

// QueueDropsScenario fires studio-obs-agent-queue-drops-prod with a genuine queue overflow:
// vmagent's write to storage copy b goes to a destination that refuses it with 503, dummy
// telemetry fills the agent's real persistent queue for that copy until it drops blocks, and
// vmagent-self scrapes the drop counter into the metrics storage, where the rule reads it.
// Recovery lets the destination accept, the queue drains, and the rule's five-minute window
// clears. The production query, threshold and window are untouched; the test overrides are
// the queue's size, the destination and a relabeling that keeps the dummy telemetry out of
// copy a, each restored afterwards.
type QueueDropsScenario struct{}

// NewQueueDropsScenario returns the queue-drops scenario.
func NewQueueDropsScenario() *QueueDropsScenario {
	return &QueueDropsScenario{}
}

// Name identifies the scenario on the command line.
func (s *QueueDropsScenario) Name() string { return testName }

// Description says what fault the scenario causes.
func (s *QueueDropsScenario) Description() string {
	return "vmagent's destination for storage copy b refuses writes until its real queue overflows"
}

// RuleUID is the rule the scenario fires.
func (s *QueueDropsScenario) RuleUID() string { return "studio-obs-agent-queue-drops-prod" }

// ExpectedLabels are the labels of the alert instance the fault fires: vmagent's queue for copy b.
func (s *QueueDropsScenario) ExpectedLabels() map[string]string {
	return map[string]string{"job": "vmagent", "copy": refusedCopy}
}

// Inject overrides the agent, starts the dummy telemetry and returns once the drop counter has
// increased in the metrics storage, read through Grafana's datasource as the rule reads it.
func (s *QueueDropsScenario) Inject(ctx context.Context, env *Env) error {
	ev := env.Evidence
	if err := s.applyTestResources(ctx, env); err != nil {
		return err
	}
	if err := waitDeployment(ctx, env.Kube, refuserName, refuserReadyWait); err != nil {
		return err
	}
	ev.Logf("refusing destination %s is up, answering writes with 503", refuserName)

	if err := suspendFlux(ctx, env.Kube); err != nil {
		return err
	}
	ev.Logf("suspended Flux Kustomization %s/%s so it does not undo the test overrides",
		fluxNamespace, victoriaKustomization)
	if err := s.overrideAgent(ctx, env.Kube); err != nil {
		return err
	}
	ev.Logf("VMAgent %s: copy b's URL is now %s, queue limit %s bytes, blocks of at most %d bytes, "+
		"dummy metric dropped for copy a", metricsAgent, refuserURL(), queueTestLimit, blockTestLimit)
	if err := waitAgentRollout(ctx, env.Kube, true); err != nil {
		return err
	}
	ev.Logf("vmagent-metrics rolled out with the overrides")

	baseline, err := queueDrops(ctx, env.Grafana)
	if err != nil {
		ev.Logf("no drop counter for copy b yet (%v); counting from 0", err)
	}
	if _, err = env.Kube.ApplyObjects(ctx, loadJob()); err != nil {
		return fmt.Errorf("start dummy telemetry: %w", err)
	}
	ev.Logf("dummy telemetry started against %s (random 3 KiB labels, %d MiB/s, capped at %d MiB)",
		loadedReplica, loadRate>>mebibyteShift, loadByteCap>>mebibyteShift)

	var drops float64
	err = poll(ctx, dropObservedWait, scenarioPoll, func() (bool, error) {
		if failed, jobErr := jobFailed(ctx, env.Kube); jobErr == nil && failed {
			return false, permanent(errLoadFailed)
		}
		value, queryErr := queueDrops(ctx, env.Grafana)
		if queryErr != nil {
			return false, queryErr
		}
		drops = value
		return value > baseline, nil
	})
	if err != nil {
		return fmt.Errorf("waiting for queue drops in the metrics storage: %w", err)
	}
	ev.Logf("vmagent copy b dropped blocks: counter %v -> %v, scraped by vmagent-self and read through Grafana",
		baseline, drops)
	return env.Evidence.WriteJSON("queue-drops.json", map[string]any{"before": baseline, "after": drops})
}

// Recover lets the destination accept writes and waits for the queue to drain.
func (s *QueueDropsScenario) Recover(ctx context.Context, env *Env) error {
	ev := env.Evidence
	saveLoadLogs(ctx, env)
	if err := env.Kube.DeleteResource(ctx, jobGVR, observabilityNamespace, loadName); err != nil {
		return fmt.Errorf("stop the dummy telemetry: %w", err)
	}
	status, body, err := env.Kube.ServiceProxy(ctx, kubernetes.ServiceProxyRequest{
		Namespace: observabilityNamespace,
		Service:   refuserName,
		Port:      strconv.Itoa(refuserPort),
		Method:    http.MethodPost,
		Path:      "/mode",
		Query:     url.Values{"status": {"204"}},
	})
	if err != nil || status != http.StatusOK {
		return fmt.Errorf("let the destination accept writes: %w %d %s", errors.Join(err, errHTTPStatus), status, body)
	}
	ev.Logf("destination accepts writes again (204)")
	var pending float64
	err = poll(ctx, queueDrainWait, scenarioPoll, func() (bool, error) {
		value, queryErr := env.Grafana.QueryValue(ctx,
			`max(vmagent_remotewrite_pending_data_bytes{job="vmagent", url=~"2:.*"})`)
		if queryErr != nil {
			return false, queryErr
		}
		pending = value
		return value < drainedBytes, nil
	})
	if err != nil {
		return fmt.Errorf("waiting for copy b's queue to drain: %w", err)
	}
	ev.Logf("copy b's queue drained: %.0f bytes pending", pending)
	return nil
}

// Cleanup removes the test resources, restores the agent's settings and resumes Flux.
func (s *QueueDropsScenario) Cleanup(ctx context.Context, env *Env) error {
	saveLoadLogs(ctx, env)
	var errs []error
	for _, object := range []struct {
		gvr  schema.GroupVersionResource
		name string
	}{
		{jobGVR, loadName},
		{deploymentGVR, refuserName},
		{serviceGVR, refuserName},
		{configMapGVR, scriptsName},
		{networkPolicyGVR, refuserName + "-egress"},
		{networkPolicyGVR, loadName + "-ingress"},
	} {
		if err := env.Kube.DeleteResource(ctx, object.gvr, observabilityNamespace, object.name); err != nil {
			errs = append(errs, err)
		}
	}
	restored, err := restoreAgent(ctx, env.Kube)
	if err != nil {
		errs = append(errs, err)
	}
	resumed, err := resumeFlux(ctx, env.Kube)
	if err != nil {
		errs = append(errs, err)
	}
	if restored {
		if err := waitAgentRollout(ctx, env.Kube, false); err != nil {
			errs = append(errs, err)
		} else {
			env.Evidence.Logf("VMAgent %s restored and rolled out", metricsAgent)
		}
	}
	if resumed {
		env.Evidence.Logf("Flux Kustomization %s/%s resumed", fluxNamespace, victoriaKustomization)
	}
	return errors.Join(errs...)
}

// saveLoadLogs keeps the dummy telemetry's output, while its pod still exists.
func saveLoadLogs(ctx context.Context, env *Env) {
	logs, err := env.Kube.PodLogs(ctx, observabilityNamespace, "app="+loadName)
	if err != nil || logs == "" {
		return
	}
	if err := env.Evidence.WriteFile("load.log", logs); err != nil {
		env.Evidence.Logf("could not save the load's logs: %v", err)
	}
}

func (s *QueueDropsScenario) applyTestResources(ctx context.Context, env *Env) error {
	objects := []runtime.Object{
		&corev1.ConfigMap{
			TypeMeta:   metav1.TypeMeta{APIVersion: "v1", Kind: "ConfigMap"},
			ObjectMeta: testMeta(scriptsName),
			Data:       map[string]string{"refuser.py": refuserScript, "load.py": loadScript},
		},
		refuserDeployment(),
		&corev1.Service{
			TypeMeta:   metav1.TypeMeta{APIVersion: "v1", Kind: "Service"},
			ObjectMeta: testMeta(refuserName),
			Spec: corev1.ServiceSpec{
				Selector: map[string]string{"app": refuserName},
				Ports: []corev1.ServicePort{{
					Name: "http", Port: refuserPort, TargetPort: intstr.FromInt32(refuserPort),
					Protocol: corev1.ProtocolTCP,
				}},
			},
		},
		// The production policies let the agent reach only its storage, and only the proxy and
		// vmagent-self reach the agent. These add the test's paths without changing them.
		&networkingv1.NetworkPolicy{
			TypeMeta:   metav1.TypeMeta{APIVersion: "networking.k8s.io/v1", Kind: "NetworkPolicy"},
			ObjectMeta: testMeta(refuserName + "-egress"),
			Spec: networkingv1.NetworkPolicySpec{
				PodSelector: metricsAgentSelector(),
				PolicyTypes: []networkingv1.PolicyType{networkingv1.PolicyTypeEgress},
				Egress: []networkingv1.NetworkPolicyEgressRule{
					{
						To: []networkingv1.NetworkPolicyPeer{
							{PodSelector: &metav1.LabelSelector{MatchLabels: map[string]string{"app": refuserName}}},
						},
						Ports: []networkingv1.NetworkPolicyPort{tcpPort(refuserPort)},
					},
				},
			},
		},
		&networkingv1.NetworkPolicy{
			TypeMeta:   metav1.TypeMeta{APIVersion: "networking.k8s.io/v1", Kind: "NetworkPolicy"},
			ObjectMeta: testMeta(loadName + "-ingress"),
			Spec: networkingv1.NetworkPolicySpec{
				PodSelector: metricsAgentSelector(),
				PolicyTypes: []networkingv1.PolicyType{networkingv1.PolicyTypeIngress},
				Ingress: []networkingv1.NetworkPolicyIngressRule{
					{
						From: []networkingv1.NetworkPolicyPeer{
							{PodSelector: &metav1.LabelSelector{MatchLabels: map[string]string{"app": loadName}}},
						},
						Ports: []networkingv1.NetworkPolicyPort{tcpPort(agentPort)},
					},
				},
			},
		},
	}
	if _, err := env.Kube.ApplyObjects(ctx, objects...); err != nil {
		return fmt.Errorf("apply test resources: %w", err)
	}
	return nil
}

// overrideAgent points copy b's URL at the refusing destination, sets the smallest queue and
// keeps the dummy metric out of copy a, saving the original settings in an annotation first.
func (s *QueueDropsScenario) overrideAgent(ctx context.Context, kube *kubernetes.KubernetesClient) error {
	agent, err := kube.GetResource(ctx, vmAgentGVR, observabilityNamespace, metricsAgent)
	if err != nil {
		return fmt.Errorf("read VMAgent: %w", err)
	}
	specMap, isMap := nested(agent.Object, "spec").(map[string]any)
	remoteWrite, isList := specMap["remoteWrite"].([]any)
	if !isMap || !isList || len(remoteWrite) != 2 {
		return fmt.Errorf("%w: want two remote-write URLs, copy a and copy b", errAgentShape)
	}
	if _, saved := agent.GetAnnotations()[originalAnnotation]; !saved {
		original, err := json.Marshal(map[string]any{
			"remoteWrite":         specMap["remoteWrite"],
			"remoteWriteSettings": specMap["remoteWriteSettings"],
		})
		if err != nil {
			return fmt.Errorf("encode original agent settings: %w", err)
		}
		if err := patchJSON(ctx, kube, vmAgentGVR, observabilityNamespace, metricsAgent, types.MergePatchType,
			map[string]any{"metadata": map[string]any{
				"annotations": map[string]string{originalAnnotation: string(original)},
			}}); err != nil {
			return err
		}
	}
	return patchJSON(ctx, kube, vmAgentGVR, observabilityNamespace, metricsAgent, types.JSONPatchType,
		[]map[string]any{
			{"op": "replace", "path": fmt.Sprintf("/spec/remoteWrite/%d/url", refusedCopyIndex), "value": refuserURL()},
			{"op": "add", "path": "/spec/remoteWrite/0/inlineUrlRelabelConfig", "value": []any{map[string]any{
				"action": "drop", "source_labels": []string{"__name__"}, "regex": dummyMetricName,
			}}},
			{"op": "add", "path": "/spec/remoteWriteSettings/maxDiskUsagePerURL", "value": queueTestLimit},
			{"op": "add", "path": "/spec/remoteWriteSettings/maxBlockSize", "value": blockTestLimit},
		})
}

// restoreAgent puts back the settings overrideAgent saved; it reports whether it changed anything.
func restoreAgent(ctx context.Context, kube *kubernetes.KubernetesClient) (bool, error) {
	agent, err := kube.GetResource(ctx, vmAgentGVR, observabilityNamespace, metricsAgent)
	if err != nil {
		return false, fmt.Errorf("read VMAgent: %w", err)
	}
	saved, ok := agent.GetAnnotations()[originalAnnotation]
	if !ok {
		return false, nil
	}
	var original map[string]any
	if err = json.Unmarshal([]byte(saved), &original); err != nil {
		return false, fmt.Errorf("decode saved agent settings: %w", err)
	}
	err = patchJSON(ctx, kube, vmAgentGVR, observabilityNamespace, metricsAgent, types.JSONPatchType,
		[]map[string]any{
			{"op": "replace", "path": "/spec/remoteWrite", "value": original["remoteWrite"]},
			{"op": "replace", "path": "/spec/remoteWriteSettings", "value": original["remoteWriteSettings"]},
			{"op": "remove", "path": "/metadata/annotations/" + strings.ReplaceAll(originalAnnotation, "/", "~1")},
		})
	return err == nil, err
}

func suspendFlux(ctx context.Context, kube *kubernetes.KubernetesClient) error {
	kustomization, err := kube.GetResource(ctx, kustomizationGVR, fluxNamespace, victoriaKustomization)
	if err != nil {
		return fmt.Errorf("read Flux Kustomization: %w", err)
	}
	if suspended, ok := nested(kustomization.Object, "spec", "suspend").(bool); ok && suspended {
		return nil
	}
	return patchJSON(ctx, kube, kustomizationGVR, fluxNamespace, victoriaKustomization, types.MergePatchType,
		map[string]any{
			"metadata": map[string]any{"annotations": map[string]string{suspendedByTest: "true"}},
			"spec":     map[string]any{"suspend": true},
		})
}

// resumeFlux resumes the Kustomization if the test suspended it, and asks Flux to reconcile now.
func resumeFlux(ctx context.Context, kube *kubernetes.KubernetesClient) (bool, error) {
	kustomization, err := kube.GetResource(ctx, kustomizationGVR, fluxNamespace, victoriaKustomization)
	if err != nil {
		return false, fmt.Errorf("read Flux Kustomization: %w", err)
	}
	if _, ok := kustomization.GetAnnotations()[suspendedByTest]; !ok {
		return false, nil
	}
	err = patchJSON(ctx, kube, kustomizationGVR, fluxNamespace, victoriaKustomization, types.MergePatchType,
		map[string]any{
			"metadata": map[string]any{"annotations": map[string]any{
				suspendedByTest:                   nil,
				"reconcile.fluxcd.io/requestedAt": time.Now().UTC().Format(time.RFC3339Nano),
			}},
			"spec": map[string]any{"suspend": false},
		})
	return err == nil, err
}

// patchJSON encodes a patch and applies it to one object.
func patchJSON(
	ctx context.Context,
	kube *kubernetes.KubernetesClient,
	gvr schema.GroupVersionResource,
	namespace, name string,
	patchType types.PatchType,
	patch any,
) error {
	data, err := json.Marshal(patch)
	if err != nil {
		return fmt.Errorf("encode patch for %s/%s: %w", namespace, name, err)
	}
	if err := kube.PatchResource(ctx, gvr, namespace, name, patchType, data); err != nil {
		return fmt.Errorf("patch %s %s/%s: %w", gvr.Resource, namespace, name, err)
	}
	return nil
}

// waitAgentRollout waits until the operator has (or, with overridden false, no longer has) the
// refusing destination in vmagent-metrics' pod template, and the StatefulSet has rolled out.
func waitAgentRollout(ctx context.Context, kube *kubernetes.KubernetesClient, overridden bool) error {
	err := poll(ctx, agentRolloutWait, scenarioPoll, func() (bool, error) {
		set, err := kube.GetResource(ctx, statefulSetGVR, observabilityNamespace, metricsAgentSet)
		if err != nil {
			return false, fmt.Errorf("read %s: %w", metricsAgentSet, err)
		}
		template, err := json.Marshal(set.Object["spec"])
		if err != nil {
			return false, fmt.Errorf("encode %s: %w", metricsAgentSet, err)
		}
		return strings.Contains(string(template), refuserName) == overridden, nil
	})
	if err != nil {
		return fmt.Errorf("waiting for the operator to update %s: %w", metricsAgentSet, err)
	}
	if err := kube.StatefulSetRolloutStatus(
		ctx,
		metricsAgentSet,
		observabilityNamespace,
		agentRolloutWait,
	); err != nil {
		return fmt.Errorf("waiting for %s to roll out: %w", metricsAgentSet, err)
	}
	return nil
}

func waitDeployment(ctx context.Context, kube *kubernetes.KubernetesClient, name string, timeout time.Duration) error {
	if err := kube.RolloutStatus(ctx, name, observabilityNamespace, timeout); err != nil {
		return fmt.Errorf("waiting for %s: %w", name, err)
	}
	return nil
}

func jobFailed(ctx context.Context, kube *kubernetes.KubernetesClient) (bool, error) {
	job, err := kube.GetResource(ctx, jobGVR, observabilityNamespace, loadName)
	if err != nil {
		return false, fmt.Errorf("read the load Job: %w", err)
	}
	switch value := nested(job.Object, "status", "failed").(type) {
	case int64:
		return value > 0, nil
	case float64:
		return value > 0, nil
	default:
		return false, nil
	}
}

// queueDrops is the drop counter of vmagent's queue for copy b, summed over the replicas, as
// the metrics storage has it.
func queueDrops(ctx context.Context, grafana *Grafana) (float64, error) {
	return grafana.QueryValue(ctx,
		`sum(vm_persistentqueue_blocks_dropped_total{job="vmagent", path=~".*/2_[^/]*"})`)
}

func refuserURL() string {
	return fmt.Sprintf(
		"http://%s.%s.svc.cluster.local:%d/api/v1/write",
		refuserName,
		observabilityNamespace,
		refuserPort,
	)
}

func refuserDeployment() *appsv1.Deployment {
	labels := map[string]string{"app": refuserName, testLabel: testName}
	replicas := int32(1)
	return &appsv1.Deployment{
		TypeMeta:   metav1.TypeMeta{APIVersion: "apps/v1", Kind: "Deployment"},
		ObjectMeta: testMeta(refuserName),
		Spec: appsv1.DeploymentSpec{
			Replicas: &replicas,
			Selector: &metav1.LabelSelector{MatchLabels: map[string]string{"app": refuserName}},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{Labels: labels},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{testContainer(refuserName, "/opt/alert-test/refuser.py", nil,
						&corev1.Probe{ProbeHandler: corev1.ProbeHandler{
							HTTPGet: &corev1.HTTPGetAction{Path: "/status", Port: intstr.FromInt32(refuserPort)},
						}, PeriodSeconds: 2},
					)},
					Volumes: []corev1.Volume{scriptsVolume()},
				},
			},
		},
	}
}

func loadJob() *batchv1.Job {
	backoff := int32(0)
	deadline := int64(loadDeadline.Seconds())
	return &batchv1.Job{
		TypeMeta:   metav1.TypeMeta{APIVersion: "batch/v1", Kind: "Job"},
		ObjectMeta: testMeta(loadName),
		Spec: batchv1.JobSpec{
			BackoffLimit:          &backoff,
			ActiveDeadlineSeconds: &deadline,
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{Labels: map[string]string{"app": loadName, testLabel: testName}},
				Spec: corev1.PodSpec{
					RestartPolicy: corev1.RestartPolicyNever,
					Containers: []corev1.Container{testContainer(loadName, "/opt/alert-test/load.py", []corev1.EnvVar{
						{Name: "TARGET", Value: "http://" + loadedReplica + ":" + strconv.Itoa(agentPort)},
						{Name: "QUEUE", Value: "/2_"},
						{Name: "METRIC", Value: dummyMetricName},
						{Name: "MAX_BYTES", Value: strconv.Itoa(loadByteCap)},
						{Name: "RATE", Value: strconv.Itoa(loadRate)},
					}, nil)},
					Volumes: []corev1.Volume{scriptsVolume()},
				},
			},
		},
	}
}

func testContainer(name, script string, env []corev1.EnvVar, readiness *corev1.Probe) corev1.Container {
	nonRoot := true
	user := int64(nobodyUser)
	noEscalation := false
	readOnly := true
	return corev1.Container{
		Name:           name,
		Image:          testImage,
		Command:        []string{"python3", "-u", script},
		Env:            env,
		ReadinessProbe: readiness,
		VolumeMounts:   []corev1.VolumeMount{{Name: "scripts", MountPath: "/opt/alert-test", ReadOnly: true}},
		SecurityContext: &corev1.SecurityContext{
			RunAsNonRoot:             &nonRoot,
			RunAsUser:                &user,
			ReadOnlyRootFilesystem:   &readOnly,
			AllowPrivilegeEscalation: &noEscalation,
			Capabilities:             &corev1.Capabilities{Drop: []corev1.Capability{"ALL"}},
		},
		Resources: corev1.ResourceRequirements{
			Requests: corev1.ResourceList{
				corev1.ResourceCPU:    resource.MustParse(scenarioCPURequest),
				corev1.ResourceMemory: resource.MustParse("32Mi"),
			},
			Limits: corev1.ResourceList{corev1.ResourceMemory: resource.MustParse("128Mi")},
		},
	}
}

func scriptsVolume() corev1.Volume {
	return corev1.Volume{
		Name: "scripts",
		VolumeSource: corev1.VolumeSource{ConfigMap: &corev1.ConfigMapVolumeSource{
			LocalObjectReference: corev1.LocalObjectReference{Name: scriptsName},
		}},
	}
}

func testMeta(name string) metav1.ObjectMeta {
	return metav1.ObjectMeta{
		Name:      name,
		Namespace: observabilityNamespace,
		Labels:    map[string]string{testLabel: testName},
	}
}

func metricsAgentSelector() metav1.LabelSelector {
	return metav1.LabelSelector{MatchLabels: map[string]string{
		"app.kubernetes.io/name": "vmagent", "app.kubernetes.io/instance": metricsAgent,
	}}
}

func tcpPort(port int32) networkingv1.NetworkPolicyPort {
	protocol := corev1.ProtocolTCP
	value := intstr.FromInt32(port)
	return networkingv1.NetworkPolicyPort{Protocol: &protocol, Port: &value}
}

// nested returns the value at a path of keys, or nil.
func nested(object map[string]any, fields ...string) any {
	var current any = object
	for _, key := range fields {
		m, ok := current.(map[string]any)
		if !ok {
			return nil
		}
		current = m[key]
	}
	return current
}
