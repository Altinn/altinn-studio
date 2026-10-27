//nolint:mnd // Manifest literals intentionally use concrete service ports.
package manifests

import (
	"crypto/sha256"
	_ "embed"
	"encoding/hex"
	"time"

	helmv2 "github.com/fluxcd/helm-controller/api/v2"
	kustomizev1 "github.com/fluxcd/kustomize-controller/api/v1"
	"github.com/fluxcd/pkg/apis/kustomize"
	sourcev1 "github.com/fluxcd/source-controller/api/v1"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/util/intstr"
)

const (
	// GrafanaNamespace is where the local Grafana and its MCP server run.
	GrafanaNamespace = "grafana"
	// GrafanaImage matches the version of the shared Grafana, grafana.dis.altinn.cloud.
	GrafanaImage    = "grafana/grafana:12.4.8"
	grafanaMCPImage = "grafana/mcp-grafana:2.0.1"
	// grafanaLogsPluginVersion is the VictoriaLogs datasource plugin the local Grafana installs.
	grafanaLogsPluginVersion = "0.32.0"
	// GrafanaAdminPassword is the local Grafana's admin password, which the MCP server and
	// grafana-operator use.
	GrafanaAdminPassword = "admin"
	// GrafanaContentName names the artifact of the dashboards repository's resources, and the
	// Flux Kustomization that applies it for grafana-operator.
	GrafanaContentName = "grafana-content"
	// AlertRecorderName is the in-cluster webhook recorder the full monitoring profile's
	// contact points notify, as Service and Deployment.
	AlertRecorderName = "alert-recorder"
	// GrafanaInstanceLabel is the label the dashboards repository's resources select their
	// Grafana instance by, as the shared Grafana's operator does.
	GrafanaInstanceLabel = "external-grafana"

	// grafanaOperatorVersion is the grafana-operator chart the shared Grafana's operator runs.
	// Keep it in step with dis-way/gitops-manifests (oci/grafana-operator) and with the schemas
	// the dashboards repository validates against (schemas/regenerate.py).
	grafanaOperatorVersion = "5.25.0"
	// grafanaResyncPeriod is how often grafana-operator syncs a resource that sets no period of
	// its own, so content comes back soon after Grafana restarts with an empty database. The
	// operator applies changed resources at once.
	grafanaResyncPeriod = "1m"
	grafanaContentSync  = time.Minute
	// grafanaContentTimeout covers the operator's retries, such as of a dashboard synced before
	// its folder.
	grafanaContentTimeout = 3 * time.Minute
	alertRecorderImage    = "python:3.13-alpine"
	alertRecorderPort     = 8080
	grafanaPort           = 3000
	grafanaMCPPort        = 8000
	grafanaMCPHealthPort  = 8001
)

// GrafanaCABundle mounts the fixture's CA bundle ConfigMap into Grafana, which downloads
// its VictoriaLogs plugin at startup.
type GrafanaCABundle struct {
	ConfigMapName string
	Key           string
	ContainerPath string
	Env           []corev1.EnvVar
}

// BuildGrafanaOperator creates grafana-operator, installed as the platform installs it.
func BuildGrafanaOperator() []runtime.Object {
	values := map[string]any{
		"env": []any{map[string]any{"name": "DEFAULT_RESYNC_PERIOD", "value": grafanaResyncPeriod}},
		"resources": map[string]any{
			"requests": map[string]any{"cpu": "10m", "memory": "64Mi"},
			"limits":   map[string]any{"memory": "256Mi"},
		},
	}
	return []runtime.Object{
		buildGrafanaNamespace(),
		buildHelmRepository("grafana", "https://grafana.github.io/helm-charts"),
		&helmv2.HelmRelease{
			TypeMeta:   metav1.TypeMeta{APIVersion: "helm.toolkit.fluxcd.io/v2", Kind: "HelmRelease"},
			ObjectMeta: metav1.ObjectMeta{Name: "grafana-operator", Namespace: GrafanaNamespace},
			Spec: helmv2.HelmReleaseSpec{
				Interval: metav1.Duration{Duration: interval1h},
				Install:  &helmv2.Install{CRDs: helmv2.CreateReplace},
				Upgrade:  &helmv2.Upgrade{CRDs: helmv2.CreateReplace},
				Chart: &helmv2.HelmChartTemplate{
					Spec: helmv2.HelmChartTemplateSpec{
						Chart:   "grafana-operator",
						Version: grafanaOperatorVersion,
						SourceRef: helmv2.CrossNamespaceObjectReference{
							Kind:      "HelmRepository",
							Name:      "grafana",
							Namespace: fluxSystemNamespace,
						},
					},
				},
				Values: mustMarshalJSON(values),
			},
		},
	}
}

// BuildGrafana creates the local Grafana and its MCP server, and with alerting the recorder the
// contact points notify. Neither Grafana nor the MCP server is exposed outside the cluster:
// Grafana allows anonymous admins and the MCP server can write, and the fixture's ingress listens
// on every host interface, so both are reached with kubectl port-forward, which listens on
// localhost.
func BuildGrafana(caBundle *GrafanaCABundle, alerting bool) []runtime.Object {
	objects := []runtime.Object{
		buildGrafanaDeployment(caBundle),
		buildGrafanaService(),
		buildGrafanaMCPDeployment(),
		&corev1.Secret{
			TypeMeta:   metav1.TypeMeta{APIVersion: "v1", Kind: "Secret"},
			ObjectMeta: metav1.ObjectMeta{Name: "grafana-admin", Namespace: GrafanaNamespace},
			Type:       corev1.SecretTypeOpaque,
			StringData: map[string]string{"user": "admin", "password": GrafanaAdminPassword},
		},
	}
	if alerting {
		objects = append(objects, buildAlertRecorder()...)
	}
	return objects
}

// BuildGrafanaContent creates the external Grafana instance grafana-operator syncs into, and the
// Flux Kustomization that applies the dashboards repository's resources for it from the
// fixture's registry. The Kustomization is ready once the operator has synced every resource.
func BuildGrafanaContent() []runtime.Object {
	synchronized := "status.conditions.exists(c, c.type.endsWith('Synchronized') && c.status == 'True' " +
		"&& c.observedGeneration == metadata.generation)"
	kinds := []string{
		"GrafanaFolder", "GrafanaDashboard", "GrafanaDatasource", "GrafanaAlertRuleGroup", "GrafanaContactPoint",
	}
	healthChecks := make([]kustomize.CustomHealthCheck, 0, len(kinds))
	for _, kind := range kinds {
		healthChecks = append(healthChecks, kustomize.CustomHealthCheck{
			APIVersion:             "grafana.integreatly.org/v1beta1",
			Kind:                   kind,
			HealthCheckExpressions: kustomize.HealthCheckExpressions{Current: synchronized},
		})
	}
	return []runtime.Object{
		buildGrafanaInstance(),
		&sourcev1.OCIRepository{
			TypeMeta:   metav1.TypeMeta{APIVersion: "source.toolkit.fluxcd.io/v1", Kind: "OCIRepository"},
			ObjectMeta: metav1.ObjectMeta{Name: GrafanaContentName, Namespace: GrafanaNamespace},
			Spec: sourcev1.OCIRepositorySpec{
				URL:       "oci://kind-registry:5000/" + GrafanaContentName,
				Reference: &sourcev1.OCIRepositoryRef{Tag: "local"},
				Insecure:  true,
				Interval:  metav1.Duration{Duration: grafanaContentSync},
			},
		},
		&kustomizev1.Kustomization{
			TypeMeta:   metav1.TypeMeta{APIVersion: "kustomize.toolkit.fluxcd.io/v1", Kind: "Kustomization"},
			ObjectMeta: metav1.ObjectMeta{Name: GrafanaContentName, Namespace: GrafanaNamespace},
			Spec: kustomizev1.KustomizationSpec{
				SourceRef: kustomizev1.CrossNamespaceSourceReference{
					Kind: sourcev1.OCIRepositoryKind,
					Name: GrafanaContentName,
				},
				Path:             "./",
				Prune:            true,
				TargetNamespace:  GrafanaNamespace,
				Interval:         metav1.Duration{Duration: grafanaContentSync},
				Wait:             true,
				Timeout:          &metav1.Duration{Duration: grafanaContentTimeout},
				HealthCheckExprs: healthChecks,
			},
		},
	}
}

// buildGrafanaInstance is the Grafana resource grafana-operator syncs into: the local Grafana as
// an external instance, labeled as the shared Grafana is so the repository's resources select
// it. The platform authenticates with a service account token, the fixture as the admin.
func buildGrafanaInstance() *unstructured.Unstructured {
	secretKey := func(key string) map[string]any { return map[string]any{"name": "grafana-admin", "key": key} }
	return &unstructured.Unstructured{Object: map[string]any{
		"apiVersion": "grafana.integreatly.org/v1beta1",
		"kind":       "Grafana",
		"metadata": map[string]any{
			"name":      GrafanaInstanceLabel,
			"namespace": GrafanaNamespace,
			"labels":    map[string]any{"dashboards": GrafanaInstanceLabel},
		},
		"spec": map[string]any{
			"external": map[string]any{
				"url":           "http://grafana." + GrafanaNamespace + ".svc.cluster.local",
				"adminUser":     secretKey("user"),
				"adminPassword": secretKey("password"),
			},
		},
	}}
}

func buildGrafanaNamespace() *corev1.Namespace {
	return &corev1.Namespace{
		TypeMeta:   metav1.TypeMeta{APIVersion: "v1", Kind: "Namespace"},
		ObjectMeta: metav1.ObjectMeta{Name: GrafanaNamespace},
	}
}

func buildGrafanaConfigMap(name string, data map[string]string) *corev1.ConfigMap {
	return &corev1.ConfigMap{
		TypeMeta:   metav1.TypeMeta{APIVersion: "v1", Kind: "ConfigMap"},
		ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: GrafanaNamespace},
		Data:       data,
	}
}

func buildGrafanaDeployment(caBundle *GrafanaCABundle) *appsv1.Deployment {
	container := corev1.Container{
		Name:            "grafana",
		Image:           GrafanaImage,
		ImagePullPolicy: corev1.PullIfNotPresent,
		Ports: []corev1.ContainerPort{
			{Name: "http", ContainerPort: grafanaPort, Protocol: corev1.ProtocolTCP},
		},
		Env: []corev1.EnvVar{
			{Name: "GF_AUTH_ANONYMOUS_ENABLED", Value: "true"},
			{Name: "GF_AUTH_ANONYMOUS_ORG_ROLE", Value: "Admin"},
			{Name: "GF_SECURITY_ADMIN_PASSWORD", Value: GrafanaAdminPassword},
			// Pinned, so a restart does not bring a newer plugin than the shared Grafana's.
			{Name: "GF_INSTALL_PLUGINS", Value: "victoriametrics-logs-datasource " + grafanaLogsPluginVersion},
			// Keep the datasources bundled with the pinned image instead of fetching newer ones.
			{Name: "GF_PLUGINS_PREINSTALL_AUTO_UPDATE", Value: "false"},
			{Name: "GF_LOG_LEVEL", Value: "warn"},
			// Links in notifications are absolute, for the port-forward the README gives.
			{Name: "GF_SERVER_ROOT_URL", Value: "http://localhost:3000/"},
		},
		ReadinessProbe: &corev1.Probe{
			ProbeHandler: corev1.ProbeHandler{
				HTTPGet: &corev1.HTTPGetAction{Path: "/api/health", Port: intstr.FromInt32(grafanaPort)},
			},
			PeriodSeconds: 5,
		},
		Resources: grafanaResources("50m", "128Mi", "512Mi"),
	}
	var volumes []corev1.Volume
	if caBundle != nil {
		container.Env = append(container.Env, caBundle.Env...)
		container.VolumeMounts = append(container.VolumeMounts, corev1.VolumeMount{
			Name:      "ca-bundle",
			MountPath: caBundle.ContainerPath,
			SubPath:   caBundle.Key,
			ReadOnly:  true,
		})
		volumes = append(volumes, configMapVolume("ca-bundle", caBundle.ConfigMapName))
	}
	return grafanaDeployment("grafana", nil, container, volumes)
}

func buildGrafanaMCPDeployment() *appsv1.Deployment {
	container := corev1.Container{
		Name:            "mcp-grafana",
		Image:           grafanaMCPImage,
		ImagePullPolicy: corev1.PullIfNotPresent,
		// The MCP server listens on the pod's loopback only, where kubectl port-forward
		// reaches it and other pods do not, and answers only to a client that forwarded
		// local port 8000. Its health check gets a listener of its own.
		Args: []string{
			"-t", "streamable-http",
			"--address", "127.0.0.1:8000",
			"--allowed-hosts", "localhost:8000,127.0.0.1:8000",
			"--healthz-address", "0.0.0.0:8001",
		},
		Ports: []corev1.ContainerPort{
			{Name: "mcp", ContainerPort: grafanaMCPPort, Protocol: corev1.ProtocolTCP},
			{Name: "health", ContainerPort: grafanaMCPHealthPort, Protocol: corev1.ProtocolTCP},
		},
		Env: []corev1.EnvVar{
			{Name: "GRAFANA_URL", Value: "http://grafana." + GrafanaNamespace + ".svc.cluster.local"},
			{Name: "GRAFANA_USERNAME", Value: "admin"},
			{Name: "GRAFANA_PASSWORD", Value: GrafanaAdminPassword},
		},
		ReadinessProbe: &corev1.Probe{
			ProbeHandler: corev1.ProbeHandler{
				HTTPGet: &corev1.HTTPGetAction{Path: "/healthz", Port: intstr.FromInt32(grafanaMCPHealthPort)},
			},
			PeriodSeconds: 5,
		},
		Resources: grafanaResources("10m", "32Mi", "256Mi"),
	}
	return grafanaDeployment("grafana-mcp", nil, container, nil)
}

func grafanaDeployment(
	name string,
	annotations map[string]string,
	container corev1.Container,
	volumes []corev1.Volume,
) *appsv1.Deployment {
	replicas := int32(1)
	labels := map[string]string{"app": name}
	return &appsv1.Deployment{
		TypeMeta:   metav1.TypeMeta{APIVersion: "apps/v1", Kind: "Deployment"},
		ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: GrafanaNamespace},
		Spec: appsv1.DeploymentSpec{
			Replicas: &replicas,
			Selector: &metav1.LabelSelector{MatchLabels: labels},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{Labels: labels, Annotations: annotations},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{container},
					Volumes:    volumes,
				},
			},
		},
	}
}

func buildGrafanaService() *corev1.Service {
	return &corev1.Service{
		TypeMeta:   metav1.TypeMeta{APIVersion: "v1", Kind: "Service"},
		ObjectMeta: metav1.ObjectMeta{Name: "grafana", Namespace: GrafanaNamespace},
		Spec: corev1.ServiceSpec{
			Type:     corev1.ServiceTypeClusterIP,
			Selector: map[string]string{"app": "grafana"},
			Ports: []corev1.ServicePort{{
				Name:       "http",
				Port:       80,
				TargetPort: intstr.FromInt32(grafanaPort),
				Protocol:   corev1.ProtocolTCP,
			}},
		},
	}
}

func configMapVolume(name, configMap string) corev1.Volume {
	return corev1.Volume{
		Name: name,
		VolumeSource: corev1.VolumeSource{
			ConfigMap: &corev1.ConfigMapVolumeSource{
				LocalObjectReference: corev1.LocalObjectReference{Name: configMap},
			},
		},
	}
}

func grafanaResources(cpu, memory, memoryLimit string) corev1.ResourceRequirements {
	return corev1.ResourceRequirements{
		Requests: corev1.ResourceList{
			corev1.ResourceCPU:    resource.MustParse(cpu),
			corev1.ResourceMemory: resource.MustParse(memory),
		},
		Limits: corev1.ResourceList{
			corev1.ResourceMemory: resource.MustParse(memoryLimit),
		},
	}
}

//go:embed alertrecorder/server.py
var alertRecorderServer string

// buildAlertRecorder creates the webhook recorder that stands in for Slack in the full
// monitoring profile: it keeps the notifications Grafana sends and shows them as Slack messages.
// Like Grafana, it is reached with kubectl port-forward or through the API server's proxy.
func buildAlertRecorder() []runtime.Object {
	nonRoot := true
	readOnly := true
	noEscalation := false
	user := int64(65534)
	container := corev1.Container{
		Name:            AlertRecorderName,
		Image:           alertRecorderImage,
		ImagePullPolicy: corev1.PullIfNotPresent,
		Command:         []string{"python3", "-u", "/opt/alert-recorder/server.py"},
		Ports: []corev1.ContainerPort{
			{Name: "http", ContainerPort: alertRecorderPort, Protocol: corev1.ProtocolTCP},
		},
		VolumeMounts: []corev1.VolumeMount{{Name: "code", MountPath: "/opt/alert-recorder", ReadOnly: true}},
		ReadinessProbe: &corev1.Probe{
			ProbeHandler: corev1.ProbeHandler{
				HTTPGet: &corev1.HTTPGetAction{Path: "/healthz", Port: intstr.FromInt32(alertRecorderPort)},
			},
			PeriodSeconds: 5,
		},
		SecurityContext: &corev1.SecurityContext{
			RunAsNonRoot:             &nonRoot,
			RunAsUser:                &user,
			ReadOnlyRootFilesystem:   &readOnly,
			AllowPrivilegeEscalation: &noEscalation,
			Capabilities:             &corev1.Capabilities{Drop: []corev1.Capability{"ALL"}},
		},
		Resources: grafanaResources("5m", "32Mi", "128Mi"),
	}
	digest := sha256.Sum256([]byte(alertRecorderServer))
	deployment := grafanaDeployment(
		AlertRecorderName,
		// The code is mounted from the ConfigMap, so a change restarts the pod.
		map[string]string{"altinn.studio/alert-recorder": hex.EncodeToString(digest[:8])},
		container,
		[]corev1.Volume{configMapVolume("code", AlertRecorderName)},
	)
	deployment.Spec.Template.Spec.AutomountServiceAccountToken = &noEscalation
	return []runtime.Object{
		buildGrafanaConfigMap(AlertRecorderName, map[string]string{"server.py": alertRecorderServer}),
		deployment,
		&corev1.Service{
			TypeMeta:   metav1.TypeMeta{APIVersion: "v1", Kind: "Service"},
			ObjectMeta: metav1.ObjectMeta{Name: AlertRecorderName, Namespace: GrafanaNamespace},
			Spec: corev1.ServiceSpec{
				Type:     corev1.ServiceTypeClusterIP,
				Selector: map[string]string{"app": AlertRecorderName},
				Ports: []corev1.ServicePort{{
					Name:       "http",
					Port:       80,
					TargetPort: intstr.FromInt32(alertRecorderPort),
					Protocol:   corev1.ProtocolTCP,
				}},
			},
		},
	}
}
