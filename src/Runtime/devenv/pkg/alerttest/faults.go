package alerttest

import (
	"context"
	_ "embed"
	"encoding/json"
	"errors"
	"fmt"
	"maps"
	"slices"
	"strconv"
	"strings"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"

	"altinn.studio/devenv/pkg/kubernetes"
)

//go:embed faults/traffic.py
var trafficScript string

const (
	proxyKustomization = "observability"
	proxyDeployment    = "observability-proxy"
	proxyPort          = 8080
	// The local proxy accepts this token for the runtime-local identity (see
	// infra/observability/local/studio-common/auth-tokens.yaml); it is no secret.
	runtimeIngestToken = "local-runtime-ingest-token-not-a-secret"
	runtimeIdentity    = "runtime-local"
	unknownToken       = "alert-test-unknown-token" //nolint:gosec // A token the proxy rejects, by design.
	trafficName        = "alert-test-traffic"
	trafficScriptsName = "alert-test-traffic-script"
	trafficInterval    = "1"
	// overrideAnnotation keeps the original value of every field a fault overrides, on the
	// object itself, so cleanup restores it even after an interrupted run.
	overrideAnnotation = "altinn.studio/alert-test-override"
	faultWait          = 10 * time.Minute
)

var (
	vmSingleGVR = schema.GroupVersionResource{
		Group: "operator.victoriametrics.com", Version: "v1beta1", Resource: "vmsingles",
	}
	vlSingleGVR = schema.GroupVersionResource{
		Group: "operator.victoriametrics.com", Version: "v1", Resource: "vlsingles",
	}
	vlAgentGVR = schema.GroupVersionResource{
		Group: "operator.victoriametrics.com", Version: "v1", Resource: "vlagents",
	}

	errBadPointer = errors.New("JSON pointer does not resolve")
)

// override sets one field of a cluster object while a fault lasts. The Flux Kustomization that
// owns the object is suspended meanwhile, so it does not undo the change.
type override struct {
	gvr           schema.GroupVersionResource
	value         func(current any) (any, error)
	name          string
	kustomization string
	// pointer is the field, as a JSON pointer such as /spec/replicaCount.
	pointer string
	// describe says what the override does, for the timeline.
	describe string
}

func setTo(value any) func(any) (any, error) {
	return func(any) (any, error) { return value, nil }
}

// FaultScenario fires a rule by overriding fields of the stack's own objects (scaling a
// component to zero, setting a flag) and, where the rule needs traffic, by sending OTLP requests
// to observability-proxy. Recovery restores the fields; the rule's query, threshold and window
// are the repository's own.
type FaultScenario struct {
	labels      map[string]string
	name        string
	description string
	ruleUID     string
	// injected is PromQL that returns a positive value once the fault shows in the metrics
	// storage, read through Grafana as the rule reads it, or empty when the fault takes away the
	// read path itself; recovered likewise once it is gone.
	injected  string
	recovered string
	// token, when set, starts a pod sending OTLP log exports to the proxy with it.
	token     string
	overrides []override
	// stopTraffic stops the traffic on recovery rather than at cleanup.
	stopTraffic bool
}

// Name identifies the scenario on the command line.
func (s *FaultScenario) Name() string { return s.name }

// Description says what fault the scenario causes.
func (s *FaultScenario) Description() string { return s.description }

// RuleUID is the rule the scenario fires.
func (s *FaultScenario) RuleUID() string { return s.ruleUID }

// ExpectedLabels are labels the firing alert instance must carry.
func (s *FaultScenario) ExpectedLabels() map[string]string { return s.labels }

// Inject starts the traffic, applies the overrides and waits for the fault to show.
func (s *FaultScenario) Inject(ctx context.Context, env *Env) error {
	ev := env.Evidence
	if s.token != "" {
		if _, err := env.Kube.ApplyObjects(ctx, trafficObjects(s.name, s.token)...); err != nil {
			return fmt.Errorf("start the OTLP traffic: %w", err)
		}
		ev.Logf("OTLP traffic started: an empty log export to observability-proxy every %ss, as %s",
			trafficInterval, s.tokenDescription())
	}
	for _, kustomization := range s.kustomizations() {
		if err := suspendKustomization(ctx, env.Kube, kustomization); err != nil {
			return err
		}
		ev.Logf("suspended Flux Kustomization %s/%s so it does not undo the overrides", fluxNamespace, kustomization)
	}
	for _, o := range s.overrides {
		if err := applyOverride(ctx, env.Kube, o); err != nil {
			return err
		}
		ev.Logf("%s %s: %s", strings.TrimSuffix(o.gvr.Resource, "s"), o.name, o.describe)
	}
	if s.injected == "" {
		return nil
	}
	if err := waitQuery(ctx, env, s.injected, faultWait); err != nil {
		return fmt.Errorf("waiting for the fault to show: %w", err)
	}
	ev.Logf("fault shows in the metrics storage: %s", s.injected)
	return nil
}

// Recover restores the overrides, stops the traffic if the scenario says so, and waits for the
// stack to be healthy again.
func (s *FaultScenario) Recover(ctx context.Context, env *Env) error {
	ev := env.Evidence
	if s.stopTraffic {
		if err := s.deleteTraffic(ctx, env); err != nil {
			return err
		}
		ev.Logf("OTLP traffic stopped")
	}
	for _, o := range s.overrides {
		restored, err := restoreOverride(ctx, env.Kube, o)
		if err != nil {
			return err
		}
		if restored {
			ev.Logf("%s %s restored", strings.TrimSuffix(o.gvr.Resource, "s"), o.name)
		}
	}
	if err := waitQuery(ctx, env, s.recovered, faultWait); err != nil {
		return fmt.Errorf("waiting for the stack to recover: %w", err)
	}
	ev.Logf("recovered: %s", s.recovered)
	return nil
}

// Cleanup stops the traffic, restores every override and resumes Flux.
func (s *FaultScenario) Cleanup(ctx context.Context, env *Env) error {
	var errs []error
	if s.token != "" {
		errs = append(errs, s.deleteTraffic(ctx, env))
	}
	for _, o := range s.overrides {
		if _, err := restoreOverride(ctx, env.Kube, o); err != nil {
			errs = append(errs, err)
		}
	}
	for _, kustomization := range s.kustomizations() {
		resumed, err := resumeKustomization(ctx, env.Kube, kustomization)
		if err != nil {
			errs = append(errs, err)
		} else if resumed {
			env.Evidence.Logf("Flux Kustomization %s/%s resumed", fluxNamespace, kustomization)
		}
	}
	if err := errors.Join(errs...); err != nil {
		return err
	}
	if err := waitQuery(ctx, env, s.recovered, faultWait); err != nil {
		return fmt.Errorf("waiting for the stack to recover: %w", err)
	}
	return nil
}

func (s *FaultScenario) kustomizations() []string {
	var names []string
	for _, o := range s.overrides {
		if !slices.Contains(names, o.kustomization) {
			names = append(names, o.kustomization)
		}
	}
	return names
}

func (s *FaultScenario) tokenDescription() string {
	if s.token == runtimeIngestToken {
		return runtimeIdentity
	}
	return "a token the proxy does not accept"
}

func (s *FaultScenario) deleteTraffic(ctx context.Context, env *Env) error {
	if logs, err := env.Kube.PodLogs(ctx, observabilityNamespace, "app="+trafficName); err == nil && logs != "" {
		if err := env.Evidence.WriteFile("traffic.log", logs); err != nil {
			env.Evidence.Logf("could not save the traffic's logs: %v", err)
		}
	}
	errs := make([]error, 0, len(trafficObjects("", "")))
	for _, object := range []struct {
		gvr  schema.GroupVersionResource
		name string
	}{
		{deploymentGVR, trafficName},
		{configMapGVR, trafficScriptsName},
		{networkPolicyGVR, trafficName + "-ingress"},
	} {
		errs = append(errs, env.Kube.DeleteResource(ctx, object.gvr, observabilityNamespace, object.name))
	}
	return errors.Join(errs...)
}

// FaultScenarios are the scenarios that fire a rule by changing the stack's own objects.
func FaultScenarios() []Scenario {
	return append(storageScenarios(), proxyScenarios()...)
}

// storageScenarios take down the scraper or the storage, or make the storage read-only.
func storageScenarios() []Scenario {
	scaleToZero := setTo(0)
	return []Scenario{
		&FaultScenario{
			name:        "heartbeat",
			description: "vmagent-self, the scraper every rule reads, is scaled to zero",
			ruleUID:     "studio-obs-heartbeat-prod",
			labels:      map[string]string{},
			overrides: []override{{
				gvr: vmAgentGVR, name: "self", kustomization: victoriaKustomization,
				pointer: "/spec/replicaCount", value: scaleToZero, describe: "replicaCount 0",
			}},
			injected:  `absent(up{job="vmagent-self"} == 1)`,
			recovered: `count(up{job="vmagent-self"} == 1)`,
		},
		&FaultScenario{
			name:        "copy-down",
			description: "metrics storage copy b is scaled to zero, so its scrape fails",
			ruleUID:     "studio-obs-storage-copy-down-prod",
			labels:      map[string]string{"job": "vmsingle", "copy": "b"},
			overrides: []override{{
				gvr: vmSingleGVR, name: "metrics-b", kustomization: victoriaKustomization,
				pointer: "/spec/replicaCount", value: scaleToZero, describe: "replicaCount 0",
			}},
			injected:  `max(up{job="vmsingle", copy="b"} == 0) + 1`,
			recovered: `min(up{job=~"vmsingle|vlsingle|vtsingle"}) == 1`,
		},
		&FaultScenario{
			name:        "signal-unavailable",
			description: "both logs storage copies are scaled to zero",
			ruleUID:     "studio-obs-signal-unavailable-prod",
			labels:      map[string]string{"job": "vlsingle", "signal": "logs"},
			overrides: []override{
				{
					gvr: vlSingleGVR, name: "logs-a", kustomization: victoriaKustomization,
					pointer: "/spec/replicaCount", value: scaleToZero, describe: "replicaCount 0",
				},
				{
					gvr: vlSingleGVR, name: "logs-b", kustomization: victoriaKustomization,
					pointer: "/spec/replicaCount", value: scaleToZero, describe: "replicaCount 0",
				},
			},
			injected:  `(max(up{job="vlsingle"}) == 0) + 1`,
			recovered: `min(up{job=~"vmsingle|vlsingle|vtsingle"}) == 1`,
		},
		&FaultScenario{
			name: "read-only",
			description: "metrics storage copy b is restarted with a free-space floor above its disk, " +
				"so it turns read-only",
			ruleUID: "studio-obs-storage-read-only-prod",
			labels:  map[string]string{"job": "vmsingle", "copy": "b"},
			overrides: []override{{
				gvr: vmSingleGVR, name: "metrics-b", kustomization: victoriaKustomization,
				pointer: "/spec/extraArgs", value: withExtraArg("storage.minFreeDiskSpaceBytes", "100TiB"),
				describe: "-storage.minFreeDiskSpaceBytes=100TiB",
			}},
			injected:  `max(vm_storage_is_read_only{job="vmsingle", copy="b"}) > 0`,
			recovered: `(max(vm_storage_is_read_only{job="vmsingle"}) == 0) + 1 and min(up{job="vmsingle"}) == 1`,
		},
	}
}

// proxyScenarios degrade observability-proxy or the ingest through it.
func proxyScenarios() []Scenario {
	return []Scenario{
		&FaultScenario{
			name: "datasource-error",
			description: "observability-proxy, Grafana's path to the metrics storage, is scaled to zero, " +
				"so every rule's query fails",
			ruleUID: "studio-obs-heartbeat-prod",
			labels:  map[string]string{},
			overrides: []override{{
				gvr: deploymentGVR, name: proxyDeployment, kustomization: proxyKustomization,
				pointer: "/spec/replicas", value: setTo(0), describe: "replicas 0",
			}},
			// The datasource itself is down, so the fault cannot be read through it.
			recovered: `count(up{job="observability-proxy"} == 1) >= 2`,
		},
		&FaultScenario{
			name:        "proxy-degraded",
			description: "observability-proxy is scaled to one replica",
			ruleUID:     "studio-obs-proxy-degraded-prod",
			labels:      map[string]string{},
			overrides: []override{{
				gvr: deploymentGVR, name: proxyDeployment, kustomization: proxyKustomization,
				pointer: "/spec/replicas", value: setTo(1), describe: "replicas 1",
			}},
			injected:  `count(up{job="observability-proxy"} == 1) == 1`,
			recovered: `count(up{job="observability-proxy"} == 1) >= 2`,
		},
		&FaultScenario{
			name:        "forwarding-errors",
			description: "the logs agent is scaled to zero while OTLP logs arrive at observability-proxy",
			ruleUID:     "studio-obs-ingest-forwarding-errors-prod",
			labels:      map[string]string{"signal": "logs"},
			token:       runtimeIngestToken,
			overrides: []override{{
				gvr: vlAgentGVR, name: "logs", kustomization: victoriaKustomization,
				pointer: "/spec/replicaCount", value: setTo(0), describe: "replicaCount 0",
			}},
			injected: `sum(increase(altinn_observability_proxy_forwarding_errors_total{` +
				`altinn_observability_proxy_signal="logs"}[2m])) > 0`,
			recovered: `count(up{job="vlagent"} == 1) >= 2`,
		},
		&FaultScenario{
			name:        "unauthenticated",
			description: "OTLP logs arrive at observability-proxy with a token it does not accept",
			ruleUID:     "studio-obs-ingest-unauthenticated-prod",
			labels:      map[string]string{"signal": "logs", "error_type": "unknown_token"},
			token:       unknownToken,
			stopTraffic: true,
			injected: `sum(increase(altinn_observability_proxy_authentication_failures_total{` +
				`altinn_observability_proxy_signal="logs"}[2m])) > 0`,
			recovered: `count(up{job="observability-proxy"} == 1) >= 2`,
		},
		&FaultScenario{
			name:        "rate-limited",
			description: "runtime-local's rate limit is cut to one request a minute while OTLP logs arrive every second",
			ruleUID:     "studio-obs-ingest-rate-limited-prod",
			labels:      map[string]string{"source_identity": runtimeIdentity},
			token:       runtimeIngestToken,
			overrides: []override{{
				gvr: deploymentGVR, name: proxyDeployment, kustomization: proxyKustomization,
				pointer:  "/spec/template/spec/containers/0/env",
				value:    withEnv("ObservabilityProxy__RateLimiting__PermitLimits__"+runtimeIdentity, "1"),
				describe: "ObservabilityProxy__RateLimiting__PermitLimits__" + runtimeIdentity + "=1",
			}},
			injected: `sum(increase(altinn_observability_proxy_rate_limit_rejections_total{` +
				`altinn_observability_proxy_source_identity="` + runtimeIdentity + `"}[2m])) > 0`,
			recovered: `count(up{job="observability-proxy"} == 1) >= 2`,
		},
	}
}

// withExtraArg adds a flag to a Victoria custom resource's extraArgs.
func withExtraArg(name, value string) func(any) (any, error) {
	return func(current any) (any, error) {
		args := map[string]any{}
		if existing, ok := current.(map[string]any); ok {
			maps.Copy(args, existing)
		}
		args[name] = value
		return args, nil
	}
}

// withEnv sets one environment variable in a container's env list.
func withEnv(name, value string) func(any) (any, error) {
	return func(current any) (any, error) {
		var existing []any
		if list, ok := current.([]any); ok {
			existing = list
		}
		env := make([]any, 0, len(existing)+1)
		for _, item := range existing {
			if entry, ok := item.(map[string]any); ok && entry["name"] == name {
				continue
			}
			env = append(env, item)
		}
		return append(env, map[string]any{"name": name, "value": value}), nil
	}
}

// savedField is a field's value before an override; Present is false when it was unset.
type savedField struct {
	Value   any  `json:"value,omitempty"`
	Present bool `json:"present"`
}

// applyOverride saves the field's original value in an annotation, unless an earlier,
// interrupted run already did, and sets the new value.
func applyOverride(ctx context.Context, kube *kubernetes.KubernetesClient, o override) error {
	object, err := kube.GetResource(ctx, o.gvr, observabilityNamespace, o.name)
	if err != nil {
		return fmt.Errorf("read %s %s: %w", o.gvr.Resource, o.name, err)
	}
	saved, err := savedFields(object.GetAnnotations())
	if err != nil {
		return err
	}
	current, present, err := lookupPointer(object.Object, o.pointer)
	if err != nil {
		return err
	}
	original, alreadySaved := saved[o.pointer]
	if !alreadySaved {
		original = savedField{Value: current, Present: present}
		saved[o.pointer] = original
		encoded, encodeErr := json.Marshal(saved)
		if encodeErr != nil {
			return fmt.Errorf("encode original fields: %w", encodeErr)
		}
		if err = patchJSON(ctx, kube, o.gvr, observabilityNamespace, o.name, types.MergePatchType,
			map[string]any{"metadata": map[string]any{
				"annotations": map[string]string{overrideAnnotation: string(encoded)},
			}}); err != nil {
			return err
		}
	}
	// The new value is computed from the original, so a repeated run does not stack changes.
	value, err := o.value(original.Value)
	if err != nil {
		return err
	}
	return patchJSON(ctx, kube, o.gvr, observabilityNamespace, o.name, types.JSONPatchType,
		[]map[string]any{{"op": "add", "path": o.pointer, "value": value}})
}

// restoreOverride puts back the field applyOverride saved; it reports whether it changed anything.
func restoreOverride(ctx context.Context, kube *kubernetes.KubernetesClient, o override) (bool, error) {
	object, err := kube.GetResource(ctx, o.gvr, observabilityNamespace, o.name)
	if err != nil {
		return false, fmt.Errorf("read %s %s: %w", o.gvr.Resource, o.name, err)
	}
	saved, err := savedFields(object.GetAnnotations())
	if err != nil {
		return false, err
	}
	original, ok := saved[o.pointer]
	if !ok {
		return false, nil
	}
	ops := []map[string]any{}
	_, present, err := lookupPointer(object.Object, o.pointer)
	if err != nil {
		return false, err
	}
	switch {
	case original.Present:
		ops = append(ops, map[string]any{"op": "add", "path": o.pointer, "value": original.Value})
	case present:
		ops = append(ops, map[string]any{"op": "remove", "path": o.pointer})
	}
	delete(saved, o.pointer)
	annotationPath := "/metadata/annotations/" + strings.ReplaceAll(overrideAnnotation, "/", "~1")
	if len(saved) == 0 {
		ops = append(ops, map[string]any{"op": "remove", "path": annotationPath})
	} else {
		encoded, encodeErr := json.Marshal(saved)
		if encodeErr != nil {
			return false, fmt.Errorf("encode original fields: %w", encodeErr)
		}
		ops = append(ops, map[string]any{"op": "replace", "path": annotationPath, "value": string(encoded)})
	}
	if err := patchJSON(ctx, kube, o.gvr, observabilityNamespace, o.name, types.JSONPatchType, ops); err != nil {
		return false, err
	}
	return true, nil
}

func savedFields(annotations map[string]string) (map[string]savedField, error) {
	saved := map[string]savedField{}
	if encoded, ok := annotations[overrideAnnotation]; ok {
		if err := json.Unmarshal([]byte(encoded), &saved); err != nil {
			return nil, fmt.Errorf("decode %s: %w", overrideAnnotation, err)
		}
	}
	return saved, nil
}

// lookupPointer resolves a JSON pointer whose last segment may be absent.
func lookupPointer(object map[string]any, pointer string) (any, bool, error) {
	segments := strings.Split(strings.TrimPrefix(pointer, "/"), "/")
	var current any = object
	for i, segment := range segments {
		last := i == len(segments)-1
		switch node := current.(type) {
		case map[string]any:
			value, ok := node[segment]
			if !ok {
				if last {
					return nil, false, nil
				}
				return nil, false, fmt.Errorf("%w: %s at %q", errBadPointer, pointer, segment)
			}
			current = value
		case []any:
			index, err := strconv.Atoi(segment)
			if err != nil || index < 0 || index >= len(node) {
				return nil, false, fmt.Errorf("%w: %s at %q", errBadPointer, pointer, segment)
			}
			current = node[index]
		default:
			return nil, false, fmt.Errorf("%w: %s at %q", errBadPointer, pointer, segment)
		}
	}
	return current, true, nil
}

// waitQuery waits until the PromQL expression returns a positive value through Grafana.
func waitQuery(ctx context.Context, env *Env, expr string, timeout time.Duration) error {
	return poll(ctx, timeout, scenarioPoll, func() (bool, error) {
		value, err := env.Grafana.QueryValue(ctx, expr)
		if errors.Is(err, errQueryNotFound) {
			return false, nil
		}
		if err != nil {
			return false, err
		}
		return value > 0, nil
	})
}

// trafficObjects are a pod that sends OTLP log exports to the proxy with the given token, and
// the policy that lets it reach the proxy, which otherwise admits only the runtime's gateway.
func trafficObjects(scenario, token string) []runtime.Object {
	labels := map[string]string{"app": trafficName, testLabel: scenario}
	replicas := int32(1)
	return []runtime.Object{
		&corev1.ConfigMap{
			TypeMeta:   metav1.TypeMeta{APIVersion: "v1", Kind: "ConfigMap"},
			ObjectMeta: scenarioMeta(trafficScriptsName, scenario),
			Data:       map[string]string{"traffic.py": trafficScript},
		},
		&appsv1.Deployment{
			TypeMeta:   metav1.TypeMeta{APIVersion: "apps/v1", Kind: "Deployment"},
			ObjectMeta: scenarioMeta(trafficName, scenario),
			Spec: appsv1.DeploymentSpec{
				Replicas: &replicas,
				Selector: &metav1.LabelSelector{MatchLabels: map[string]string{"app": trafficName}},
				Template: corev1.PodTemplateSpec{
					ObjectMeta: metav1.ObjectMeta{Labels: labels},
					Spec: corev1.PodSpec{
						Containers: []corev1.Container{testContainer(trafficName, "/opt/alert-test/traffic.py",
							[]corev1.EnvVar{
								{Name: "TARGET", Value: proxyLogsURL()},
								{Name: "TOKEN", Value: token},
								{Name: "INTERVAL", Value: trafficInterval},
							}, nil)},
						Volumes: []corev1.Volume{{
							Name: "scripts",
							VolumeSource: corev1.VolumeSource{ConfigMap: &corev1.ConfigMapVolumeSource{
								LocalObjectReference: corev1.LocalObjectReference{Name: trafficScriptsName},
							}},
						}},
					},
				},
			},
		},
		&networkingv1.NetworkPolicy{
			TypeMeta:   metav1.TypeMeta{APIVersion: "networking.k8s.io/v1", Kind: "NetworkPolicy"},
			ObjectMeta: scenarioMeta(trafficName+"-ingress", scenario),
			Spec: networkingv1.NetworkPolicySpec{
				PodSelector: metav1.LabelSelector{MatchLabels: map[string]string{"app": proxyDeployment}},
				PolicyTypes: []networkingv1.PolicyType{networkingv1.PolicyTypeIngress},
				Ingress: []networkingv1.NetworkPolicyIngressRule{{
					From: []networkingv1.NetworkPolicyPeer{
						{PodSelector: &metav1.LabelSelector{MatchLabels: map[string]string{"app": trafficName}}},
					},
					Ports: []networkingv1.NetworkPolicyPort{tcpPort(proxyPort)},
				}},
			},
		},
	}
}

func proxyLogsURL() string {
	return fmt.Sprintf("http://%s.%s.svc.cluster.local/internal/observability/otlp/v1/logs",
		proxyDeployment, observabilityNamespace)
}

func scenarioMeta(name, scenario string) metav1.ObjectMeta {
	return metav1.ObjectMeta{
		Name:      name,
		Namespace: observabilityNamespace,
		Labels:    map[string]string{testLabel: scenario},
	}
}
