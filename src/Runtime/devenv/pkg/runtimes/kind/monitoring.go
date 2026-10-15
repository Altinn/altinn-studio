package kind

import (
	"errors"
	"fmt"
	"path/filepath"
	"time"

	"altinn.studio/devenv/pkg/resource"
)

// MonitoringProfile selects how much of the observability stack the fixture deploys.
type MonitoringProfile string

const (
	// MonitoringProfileLight is the default: one storage instance per signal, written to by
	// the observability-proxy directly, with no agents and no self-monitoring.
	MonitoringProfileLight MonitoringProfile = "light"
	// MonitoringProfileFull is production's backend: the agents, both storage copies and the
	// vmagent-self scraper, with Studio's alert rules loaded into the local Grafana.
	MonitoringProfileFull MonitoringProfile = "full"
)

var (
	errUnknownMonitoringProfile = errors.New("unknown monitoring profile")
	errFullMonitoringVariant    = errors.New(
		"the full monitoring profile needs the standard variant's three zoned workers",
	)
)

// ParseMonitoringProfile parses a profile name; an empty name is the default, light.
func ParseMonitoringProfile(name string) (MonitoringProfile, error) {
	switch MonitoringProfile(name) {
	case "", MonitoringProfileLight:
		return MonitoringProfileLight, nil
	case MonitoringProfileFull:
		return MonitoringProfileFull, nil
	default:
		return "", fmt.Errorf("%w %q: must be %q or %q",
			errUnknownMonitoringProfile, name, MonitoringProfileLight, MonitoringProfileFull)
	}
}

func validateMonitoringOptions(variant KindContainerRuntimeVariant, options KindContainerRuntimeOptions) error {
	profile, err := ParseMonitoringProfile(string(options.MonitoringProfile))
	if err != nil {
		return err
	}
	if options.IncludeMonitoring && profile == MonitoringProfileFull &&
		variant != KindContainerRuntimeVariantStandard {
		return errFullMonitoringVariant
	}
	return nil
}

// isFull reports whether the profile is the full one; the zero value is light.
func (p MonitoringProfile) isFull() bool {
	return p == MonitoringProfileFull
}

const (
	monitoringOperatorsName = "monitoring-operators"
	monitoringStackName     = "monitoring"
	// ObservabilityProxyImage is the observability-proxy image the local stack runs, as the
	// kind nodes pull it.
	ObservabilityProxyImage = "localhost:5001/observability-proxy:local"
	// The operators' Helm installs pull their charts and images, so they get more time
	// than the default readiness timeout.
	monitoringOperatorTimeout = 5 * time.Minute
	monitoringStackTimeout    = 3 * time.Minute
)

// monitoringInputs are what the monitoring object sets apply from: the proxy image and the
// artifacts Flux reconciles.
type monitoringInputs struct {
	proxyImage            *resource.BuiltImage
	proxyPublished        *resource.PublishedImage
	otelOperator          *resource.OCIArtifact
	victoriaOperator      *resource.OCIArtifact
	observability         *resource.OCIArtifact
	observabilityLocalDir string
	profile               MonitoringProfile
}

// addMonitoringResources adds the platform observability stack from infra/observability:
// the operators, then the runtime collectors, the observability-proxy and the Victoria
// backend, each applied through the same Flux syncroot entries as in a real cluster,
// from artifacts pushed to the fixture's registry.
func addMonitoringResources(
	graph *resource.Graph,
	root string,
	profile MonitoringProfile,
	cluster resource.ResourceRef,
	registry resource.ResourceRef,
	baseInfra *resource.KubernetesObjectSet,
) error {
	inputs := newMonitoringInputs(root, registry)
	inputs.profile = profile
	operators := monitoringOperatorsObjectSet(inputs, cluster, baseInfra)
	stack := monitoringStackObjectSet(inputs, cluster, operators)

	if err := graph.AddAll(
		inputs.proxyImage,
		inputs.proxyPublished,
		inputs.otelOperator,
		inputs.victoriaOperator,
		inputs.observability,
		operators,
		stack,
	); err != nil {
		return fmt.Errorf("add monitoring resources: %w", err)
	}
	return nil
}

func newMonitoringInputs(root string, registry resource.ResourceRef) monitoringInputs {
	observabilityDir := filepath.Join(root, "infra", "observability")
	proxyDir := filepath.Join(root, "src", "observability-proxy")
	proxyImage := &resource.BuiltImage{
		ContextPath: proxyDir,
		Dockerfile:  filepath.Join(proxyDir, "Dockerfile"),
		Tag:         "observability-proxy:local",
	}
	return monitoringInputs{
		proxyImage: proxyImage,
		proxyPublished: &resource.PublishedImage{
			Ref:       ObservabilityProxyImage,
			Source:    resource.Ref(proxyImage),
			DependsOn: []resource.ResourceRef{registry},
		},
		otelOperator: monitoringArtifact(
			"otel-operator-repo",
			filepath.Join(root, "infra", "studio", "otel-operator", "base"),
			registry,
		),
		victoriaOperator: monitoringArtifact(
			"victoriametrics-operator-repo",
			filepath.Join(root, "infra", "studio", "victoriametrics-operator", "base"),
			registry,
		),
		observability:         monitoringArtifact("observability-repo", observabilityDir, registry),
		observabilityLocalDir: filepath.Join(observabilityDir, "local"),
	}
}

func monitoringOperatorsObjectSet(
	inputs monitoringInputs,
	cluster resource.ResourceRef,
	baseInfra *resource.KubernetesObjectSet,
) *resource.KubernetesObjectSet {
	return &resource.KubernetesObjectSet{
		Name:    monitoringOperatorsName,
		Cluster: cluster,
		Path:    filepath.Join(inputs.observabilityLocalDir, "operators"),
		DependsOn: []resource.ResourceRef{
			resource.Ref(baseInfra),
			resource.Ref(inputs.otelOperator),
			resource.Ref(inputs.victoriaOperator),
		},
		Readiness: []resource.KubernetesReadinessCheck{
			monitoringReadiness(
				resource.KubernetesReadinessFluxKustomization,
				"default",
				"otel-operator",
				monitoringOperatorTimeout,
			),
			monitoringReadiness(
				resource.KubernetesReadinessFluxHelmRelease,
				"otel-operator",
				"otel-operator",
				monitoringOperatorTimeout,
			),
			monitoringReadiness(
				resource.KubernetesReadinessFluxKustomization,
				"default",
				"victoriametrics-operator",
				monitoringOperatorTimeout,
			),
			monitoringReadiness(
				resource.KubernetesReadinessFluxHelmRelease,
				"observability",
				"victoriametrics-operator",
				monitoringOperatorTimeout,
			),
		},
	}
}

func monitoringStackObjectSet(
	inputs monitoringInputs,
	cluster resource.ResourceRef,
	operators *resource.KubernetesObjectSet,
) *resource.KubernetesObjectSet {
	syncroot := "syncroot"
	if inputs.profile.isFull() {
		syncroot = "syncroot-full"
	}
	return &resource.KubernetesObjectSet{
		Name:    monitoringStackName,
		Cluster: cluster,
		Path:    filepath.Join(inputs.observabilityLocalDir, syncroot),
		DependsOn: []resource.ResourceRef{
			resource.Ref(operators),
			resource.Ref(inputs.observability),
			resource.Ref(inputs.proxyPublished),
		},
		Readiness: monitoringStackReadiness(inputs.profile),
	}
}

// monitoringStackReadiness waits for the Flux Kustomizations and then for every workload the
// profile runs: the storage instances, the proxy and the collectors, and in the full profile
// also the second storage copies, the agents' StatefulSets and vmagent-self.
func monitoringStackReadiness(profile MonitoringProfile) []resource.KubernetesReadinessCheck {
	readiness := make([]resource.KubernetesReadinessCheck, 0, 16)
	for _, kustomization := range []struct{ namespace, name string }{
		{"default", "observability-victoria"},
		{"default", "observability"},
		{"runtime-obs", "observability"},
	} {
		readiness = append(readiness, monitoringReadiness(
			resource.KubernetesReadinessFluxKustomization,
			kustomization.namespace,
			kustomization.name,
			monitoringStackTimeout,
		))
	}
	deployments := []struct{ namespace, name string }{
		{"observability", "vmsingle-metrics-a"},
		{"observability", "vtsingle-traces-a"},
		{"observability", "vlsingle-logs-a"},
		{"observability", "observability-proxy"},
		{"runtime-obs", "otel-router-collector"},
		{"runtime-obs", "otel-gateway-collector"},
	}
	var statefulSets []string
	if profile.isFull() {
		deployments = append(deployments,
			struct{ namespace, name string }{"observability", "vmsingle-metrics-b"},
			struct{ namespace, name string }{"observability", "vtsingle-traces-b"},
			struct{ namespace, name string }{"observability", "vlsingle-logs-b"},
			struct{ namespace, name string }{"observability", "vmagent-self"},
		)
		statefulSets = []string{"vmagent-metrics", "vlagent-logs", "vtagent-traces"}
	}
	for _, deployment := range deployments {
		readiness = append(readiness, monitoringReadiness(
			resource.KubernetesReadinessDeploymentAvailable,
			deployment.namespace,
			deployment.name,
			monitoringStackTimeout,
		))
	}
	for _, name := range statefulSets {
		readiness = append(readiness, monitoringReadiness(
			resource.KubernetesReadinessStatefulSetReady,
			"observability",
			name,
			monitoringStackTimeout,
		))
	}
	return readiness
}

func monitoringArtifact(repository, path string, registry resource.ResourceRef) *resource.OCIArtifact {
	return &resource.OCIArtifact{
		Format:    resource.OCIArtifactFormatGeneric,
		Name:      repository,
		URL:       "oci://localhost:5001/" + repository + ":local",
		Path:      path,
		DependsOn: []resource.ResourceRef{registry},
	}
}

func monitoringReadiness(
	kind resource.KubernetesReadinessKind,
	namespace string,
	name string,
	timeout time.Duration,
) resource.KubernetesReadinessCheck {
	return resource.KubernetesReadinessCheck{
		Kind:      kind,
		Namespace: namespace,
		Name:      name,
		Timeout:   timeout,
	}
}
