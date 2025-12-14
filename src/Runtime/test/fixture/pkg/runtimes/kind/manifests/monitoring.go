package manifests

import (
	"time"

	helmv2 "github.com/fluxcd/helm-controller/api/v2"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
)

// BuildMonitoringInfrastructure creates the kube-prometheus-stack HelmRelease.
func BuildMonitoringInfrastructure() []runtime.Object {
	return []runtime.Object{
		buildKubePrometheusStackRelease(),
	}
}

func buildKubePrometheusStackRelease() *helmv2.HelmRelease {
	values := map[string]interface{}{
		"prometheus": map[string]interface{}{
			"prometheusSpec": map[string]interface{}{
				"serviceMonitorSelectorNilUsesHelmValues": false,
				"podMonitorSelectorNilUsesHelmValues":     false,
				"retention":                               "10d",
			},
			"podAnnotations": map[string]interface{}{
				"linkerd.io/inject": "enabled",
			},
		},
		"grafana": map[string]interface{}{
			"enabled": true,
			"grafana.ini": map[string]interface{}{
				"server": map[string]interface{}{
					"root_url":            "http://localhost/grafana",
					"serve_from_sub_path": true,
				},
				"auth.anonymous": map[string]interface{}{
					"enabled":  true,
					"org_role": "Admin",
				},
			},
		},
		"kubeStateMetrics": map[string]interface{}{
			"enabled": true,
		},
		"nodeExporter": map[string]interface{}{
			"enabled": true,
		},
		"alertmanager": map[string]interface{}{
			"enabled": false,
		},
	}

	return &helmv2.HelmRelease{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "helm.toolkit.fluxcd.io/v2",
			Kind:       "HelmRelease",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      "kube-prometheus-stack",
			Namespace: "monitoring",
		},
		Spec: helmv2.HelmReleaseSpec{
			Interval: metav1.Duration{Duration: time.Hour},
			Install: &helmv2.Install{
				DisableWait: true,
				CRDs:        helmv2.Skip,
			},
			Upgrade: &helmv2.Upgrade{
				DisableWait: true,
				CRDs:        helmv2.Skip,
			},
			DependsOn: []helmv2.DependencyReference{
				{Name: "linkerd-crds", Namespace: "linkerd"},
				{Name: "prometheus-operator-crds", Namespace: "monitoring"},
				{Name: "linkerd-control-plane", Namespace: "linkerd"},
			},
			Chart: &helmv2.HelmChartTemplate{
				Spec: helmv2.HelmChartTemplateSpec{
					Chart:   "kube-prometheus-stack",
					Version: "79.2.1",
					SourceRef: helmv2.CrossNamespaceObjectReference{
						Kind:      "HelmRepository",
						Name:      "prometheus-community",
						Namespace: fluxSystemNamespace,
					},
				},
			},
			Values: mustMarshalJSON(values),
		},
	}
}
