package alerttest

import (
	"errors"
	"fmt"
	"strings"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/util/intstr"
)

const (
	observabilityNamespace = "observability"
	fluxNamespace          = "default"
	victoriaKustomization  = "observability-victoria"
	proxyKustomization     = "observability"
	proxyDeployment        = "observability-proxy"
	proxyPort              = 8080
	// The local proxy accepts this token for the runtime-local identity (see
	// infra/observability/local/studio-common/auth-tokens.yaml); it is no secret.
	runtimeIngestToken = "local-runtime-ingest-token-not-a-secret"
	runtimeIdentity    = "runtime-local"
	unknownToken       = "alert-test-unknown-token" //nolint:gosec // A token the proxy rejects, by design.
	trafficName        = "alert-test-traffic"
	testLabel          = "altinn.studio/alert-test"
	testImage          = "python:3.13-alpine"
	nobodyUser         = 65534
	// overrideAnnotation keeps the original value of every field a fault overrides, on the
	// object itself, so cleanup restores it even after an interrupted run.
	overrideAnnotation = "altinn.studio/alert-test-override"
	suspendedByTest    = "altinn.studio/alert-test-suspended"
	rolloutWait        = 4 * time.Minute
	// proxyHealthy is the recovery of every scenario that disturbs the proxy: both replicas are up.
	proxyHealthy = `count(up{job="observability-proxy"} == 1) >= 2`
)

var (
	vmAgentGVR       = victoriaGVR("v1beta1", "vmagents")
	vmSingleGVR      = victoriaGVR("v1beta1", "vmsingles")
	vlSingleGVR      = victoriaGVR("v1", "vlsingles")
	vlAgentGVR       = victoriaGVR("v1", "vlagents")
	deploymentGVR    = appsv1.SchemeGroupVersion.WithResource("deployments")
	statefulSetGVR   = appsv1.SchemeGroupVersion.WithResource("statefulsets")
	kustomizationGVR = schema.GroupVersionResource{
		Group: "kustomize.toolkit.fluxcd.io", Version: "v1", Resource: "kustomizations",
	}

	errBadPointer = errors.New("JSON pointer does not resolve")
	errLoadFailed = errors.New("a load Job failed")
)

func victoriaGVR(version, plural string) schema.GroupVersionResource {
	return schema.GroupVersionResource{Group: "operator.victoriametrics.com", Version: version, Resource: plural}
}

// scaleToZero overrides a Victoria component's replica count.
func scaleToZero(gvr schema.GroupVersionResource, name string) override {
	return override{gvr: gvr, name: name, kustomization: victoriaKustomization, pointer: "/spec/replicaCount", value: 0}
}

// faultScenarios fire a rule by overriding fields of the stack's own objects (scaling a component
// to zero, setting a flag) and, where the rule needs ingest traffic, by sending OTLP requests to
// observability-proxy.
func faultScenarios() []*Scenario {
	return append(storageScenarios(), proxyScenarios()...)
}

// storageScenarios take down the scraper or the storage, or make the storage read-only.
func storageScenarios() []*Scenario {
	storageHealthy := `min(up{job=~"vmsingle|vlsingle|vtsingle"}) == 1`
	return []*Scenario{
		{
			name:        "heartbeat",
			description: "vmagent-self, the scraper every rule reads, is scaled to zero",
			ruleUID:     "studio-obs-heartbeat-prod",
			overrides:   []override{scaleToZero(vmAgentGVR, "self")},
			injected:    `absent(up{job="vmagent-self"} == 1)`,
			recovered:   `count(up{job="vmagent-self"} == 1)`,
		},
		{
			name:        "copy-down",
			description: "metrics storage copy b is scaled to zero, so its scrape fails",
			ruleUID:     "studio-obs-storage-copy-down-prod",
			labels:      map[string]string{"job": "vmsingle", "copy": "b"},
			overrides:   []override{scaleToZero(vmSingleGVR, "metrics-b")},
			injected:    `max(up{job="vmsingle", copy="b"} == 0) + 1`,
			recovered:   storageHealthy,
		},
		{
			name:        "signal-unavailable",
			description: "both logs storage copies are scaled to zero",
			ruleUID:     "studio-obs-signal-unavailable-prod",
			labels:      map[string]string{"job": "vlsingle", "signal": "logs"},
			overrides: []override{
				scaleToZero(vlSingleGVR, "logs-a"),
				scaleToZero(vlSingleGVR, "logs-b"),
			},
			injected:  `(max(up{job="vlsingle"}) == 0) + 1`,
			recovered: storageHealthy,
		},
		{
			name: "read-only",
			description: "metrics storage copy b is restarted with a free-space floor above its disk, " +
				"so it turns read-only",
			ruleUID: "studio-obs-storage-read-only-prod",
			labels:  map[string]string{"job": "vmsingle", "copy": "b"},
			overrides: []override{{
				gvr: vmSingleGVR, name: "metrics-b", kustomization: victoriaKustomization,
				pointer: "/spec/extraArgs/storage.minFreeDiskSpaceBytes", value: "100TiB",
			}},
			injected:  `max(vm_storage_is_read_only{job="vmsingle", copy="b"}) > 0`,
			recovered: `(max(vm_storage_is_read_only{job="vmsingle"}) == 0) + 1 and min(up{job="vmsingle"}) == 1`,
		},
	}
}

// proxyScenarios degrade observability-proxy, or the ingest through it.
func proxyScenarios() []*Scenario {
	return []*Scenario{
		{
			name: "datasource-error",
			description: "observability-proxy, Grafana's path to the metrics storage, is scaled to zero, " +
				"so every rule's query fails",
			ruleUID: "studio-obs-heartbeat-prod",
			overrides: []override{{
				gvr: deploymentGVR, name: proxyDeployment, kustomization: proxyKustomization,
				pointer: "/spec/replicas", value: 0,
			}},
			// The datasource itself is down, so the fault cannot be read through it.
			recovered: proxyHealthy,
		},
		{
			name:        "proxy-degraded",
			description: "observability-proxy is scaled to one replica",
			ruleUID:     "studio-obs-proxy-degraded-prod",
			overrides: []override{{
				gvr: deploymentGVR, name: proxyDeployment, kustomization: proxyKustomization,
				pointer: "/spec/replicas", value: 1,
			}},
			injected:  `count(up{job="observability-proxy"} == 1) == 1`,
			recovered: proxyHealthy,
		},
		{
			name:        "forwarding-errors",
			description: "the logs agent is scaled to zero while OTLP logs arrive at observability-proxy",
			ruleUID:     "studio-obs-ingest-forwarding-errors-prod",
			labels:      map[string]string{"signal": "logs"},
			objects:     trafficObjects(runtimeIngestToken),
			overrides:   []override{scaleToZero(vlAgentGVR, "logs")},
			injected: `sum(increase(altinn_observability_proxy_forwarding_errors_total{` +
				`altinn_observability_proxy_signal="logs"}[2m])) > 0`,
			recovered: `count(up{job="vlagent"} == 1) >= 2`,
		},
		{
			name:        "unauthenticated",
			description: "OTLP logs arrive at observability-proxy with a token it does not accept",
			ruleUID:     "studio-obs-ingest-unauthenticated-prod",
			labels:      map[string]string{"signal": "logs", "error_type": "unknown_token"},
			objects:     trafficObjects(unknownToken),
			stopObjects: true,
			injected: `sum(increase(altinn_observability_proxy_authentication_failures_total{` +
				`altinn_observability_proxy_signal="logs"}[2m])) > 0`,
			recovered: proxyHealthy,
		},
		{
			name: "rate-limited",
			description: "runtime-local's rate limit is cut to one request a minute while OTLP logs " +
				"arrive every second",
			ruleUID: "studio-obs-ingest-rate-limited-prod",
			labels:  map[string]string{"source_identity": runtimeIdentity},
			objects: trafficObjects(runtimeIngestToken),
			overrides: []override{{
				gvr: deploymentGVR, name: proxyDeployment, kustomization: proxyKustomization,
				pointer: "/spec/template/spec/containers/0/env",
				value:   withEnv("ObservabilityProxy__RateLimiting__PermitLimits__"+runtimeIdentity, "1"),
			}},
			injected: `sum(increase(altinn_observability_proxy_rate_limit_rejections_total{` +
				`altinn_observability_proxy_source_identity="` + runtimeIdentity + `"}[2m])) > 0`,
			recovered: proxyHealthy,
		},
	}
}

// trafficObjects are a pod that sends an empty OTLP log export, a valid request that stores
// nothing, to the proxy every second with the given token, and the policy that lets it reach
// the proxy, which otherwise admits only the runtime's gateway.
func trafficObjects(token string) []runtime.Object {
	target := fmt.Sprintf("http://%s.%s.svc.cluster.local/internal/observability/otlp/v1/logs",
		proxyDeployment, observabilityNamespace)
	container := testContainer(trafficName, []string{"sh", "-c", `while :; do
  wget -q -O /dev/null --header "Authorization: Bearer $TOKEN" \
    --header "Content-Type: application/x-protobuf" --post-data "" "$TARGET"; sleep 1
done`}, nil)
	container.Env = []corev1.EnvVar{{Name: "TARGET", Value: target}, {Name: "TOKEN", Value: token}}
	return []runtime.Object{
		testDeployment(trafficName, container, nil),
		networkPolicy(
			trafficName,
			map[string]string{"app": proxyDeployment},
			proxyPort,
			networkingv1.PolicyTypeIngress,
		),
	}
}

func testMeta(name string) metav1.ObjectMeta {
	return metav1.ObjectMeta{Name: name, Namespace: observabilityNamespace, Labels: map[string]string{testLabel: name}}
}

func testDeployment(name string, container corev1.Container, volumes []corev1.Volume) *appsv1.Deployment {
	replicas := int32(1)
	labels := map[string]string{"app": name, testLabel: name}
	return &appsv1.Deployment{
		TypeMeta:   metav1.TypeMeta{APIVersion: "apps/v1", Kind: "Deployment"},
		ObjectMeta: testMeta(name),
		Spec: appsv1.DeploymentSpec{
			Replicas: &replicas,
			Selector: &metav1.LabelSelector{MatchLabels: map[string]string{"app": name}},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{Labels: labels},
				Spec:       corev1.PodSpec{Containers: []corev1.Container{container}, Volumes: volumes},
			},
		},
	}
}

// networkPolicy adds a path between a test pod and the selected pods of the stack, whose own
// policies stay as they are: with ingress, the test pod reaches their port; with egress, they
// reach the test pod's port.
func networkPolicy(
	test string,
	pods map[string]string,
	port int32,
	direction networkingv1.PolicyType,
) *networkingv1.NetworkPolicy {
	protocol := corev1.ProtocolTCP
	target := intstr.FromInt32(port)
	peer := []networkingv1.NetworkPolicyPeer{
		{PodSelector: &metav1.LabelSelector{MatchLabels: map[string]string{"app": test}}},
	}
	ports := []networkingv1.NetworkPolicyPort{{Protocol: &protocol, Port: &target}}
	spec := networkingv1.NetworkPolicySpec{
		PodSelector: metav1.LabelSelector{MatchLabels: pods},
		PolicyTypes: []networkingv1.PolicyType{direction},
	}
	if direction == networkingv1.PolicyTypeEgress {
		spec.Egress = []networkingv1.NetworkPolicyEgressRule{{To: peer, Ports: ports}}
	} else {
		spec.Ingress = []networkingv1.NetworkPolicyIngressRule{{From: peer, Ports: ports}}
	}
	return &networkingv1.NetworkPolicy{
		TypeMeta:   metav1.TypeMeta{APIVersion: "networking.k8s.io/v1", Kind: "NetworkPolicy"},
		ObjectMeta: testMeta(test + "-" + strings.ToLower(string(direction))),
		Spec:       spec,
	}
}

// testContainer runs a command unprivileged, with small, bounded resources.
func testContainer(name string, command []string, mounts []corev1.VolumeMount) corev1.Container {
	nonRoot := true
	user := int64(nobodyUser)
	noEscalation := false
	readOnly := true
	return corev1.Container{
		Name:         name,
		Image:        testImage,
		Command:      command,
		VolumeMounts: mounts,
		SecurityContext: &corev1.SecurityContext{
			RunAsNonRoot:             &nonRoot,
			RunAsUser:                &user,
			ReadOnlyRootFilesystem:   &readOnly,
			AllowPrivilegeEscalation: &noEscalation,
			Capabilities:             &corev1.Capabilities{Drop: []corev1.Capability{"ALL"}},
		},
		Resources: corev1.ResourceRequirements{
			Requests: corev1.ResourceList{
				corev1.ResourceCPU:    resource.MustParse("50m"),
				corev1.ResourceMemory: resource.MustParse("32Mi"),
			},
			Limits: corev1.ResourceList{corev1.ResourceMemory: resource.MustParse("128Mi")},
		},
	}
}

// nested returns the value at a path of fields in an object, or nil.
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
