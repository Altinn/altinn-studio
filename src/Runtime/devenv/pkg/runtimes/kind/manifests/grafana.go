//nolint:mnd // Manifest literals intentionally use concrete service ports.
package manifests

import (
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
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
	// GrafanaAdminPassword is the local Grafana's admin password, which the MCP server uses.
	GrafanaAdminPassword = "admin"

	grafanaDashboardsPath = "/var/lib/grafana/dashboards"
	grafanaPort           = 3000
	grafanaMCPPort        = 8000
	grafanaMCPHealthPort  = 8001
)

// GrafanaContent is what the local Grafana provisions.
type GrafanaContent struct {
	// Datasources is a Grafana datasource provisioning file.
	Datasources string
	// DashboardProviders is a Grafana dashboard provisioning file reading from the dashboards path.
	DashboardProviders string
	// Dashboards maps a dashboard file name to its JSON.
	Dashboards map[string]string
	// Digest identifies the content, so a change restarts Grafana and it provisions again.
	Digest string
}

// GrafanaCABundle mounts the fixture's CA bundle ConfigMap into Grafana, which downloads
// its VictoriaLogs plugin at startup.
type GrafanaCABundle struct {
	ConfigMapName string
	Key           string
	ContainerPath string
	Env           []corev1.EnvVar
}

// BuildGrafana creates the local Grafana and its MCP server. Neither is exposed outside
// the cluster: Grafana allows anonymous admins and the MCP server can write, and the
// fixture's ingress listens on every host interface, so both are reached with
// kubectl port-forward, which listens on localhost.
func BuildGrafana(content GrafanaContent, caBundle *GrafanaCABundle) []runtime.Object {
	return []runtime.Object{
		buildGrafanaNamespace(),
		buildGrafanaConfigMap("grafana-provisioning", map[string]string{
			"datasources.yaml": content.Datasources,
			"dashboards.yaml":  content.DashboardProviders,
		}),
		buildGrafanaConfigMap("grafana-dashboards", content.Dashboards),
		buildGrafanaDeployment(content.Digest, caBundle),
		buildGrafanaService(),
		buildGrafanaMCPDeployment(),
	}
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

func buildGrafanaDeployment(digest string, caBundle *GrafanaCABundle) *appsv1.Deployment {
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
		},
		VolumeMounts: []corev1.VolumeMount{
			{
				Name:      "provisioning",
				MountPath: "/etc/grafana/provisioning/datasources/datasources.yaml",
				SubPath:   "datasources.yaml",
				ReadOnly:  true,
			},
			{
				Name:      "provisioning",
				MountPath: "/etc/grafana/provisioning/dashboards/dashboards.yaml",
				SubPath:   "dashboards.yaml",
				ReadOnly:  true,
			},
			{Name: "dashboards", MountPath: grafanaDashboardsPath, ReadOnly: true},
		},
		ReadinessProbe: &corev1.Probe{
			ProbeHandler: corev1.ProbeHandler{
				HTTPGet: &corev1.HTTPGetAction{Path: "/api/health", Port: intstr.FromInt32(grafanaPort)},
			},
			PeriodSeconds: 5,
		},
		Resources: grafanaResources("50m", "128Mi", "512Mi"),
	}
	volumes := []corev1.Volume{
		configMapVolume("provisioning", "grafana-provisioning"),
		configMapVolume("dashboards", "grafana-dashboards"),
	}
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
	return grafanaDeployment("grafana", map[string]string{"altinn.studio/grafana-content": digest}, container, volumes)
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
