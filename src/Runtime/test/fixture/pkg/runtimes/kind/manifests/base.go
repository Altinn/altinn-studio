package manifests

import (
	"encoding/json"
	"time"

	helmv2 "github.com/fluxcd/helm-controller/api/v2"
	sourcev1 "github.com/fluxcd/source-controller/api/v1"
	corev1 "k8s.io/api/core/v1"
	apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
)

const (
	fluxSystemNamespace = "flux-system"
	interval1h          = time.Hour
)

// BuildBaseInfrastructure creates all base infrastructure resources.
func BuildBaseInfrastructure(caCrt, issuerCrt, issuerKey []byte, includeLinkerd bool) []runtime.Object {
	// TODO: take this one step further and have abstractions to represent resources and have better support
	// for modelling references/dependencies without a ton of magic strings.
	objs := []runtime.Object{
		// Namespaces
		buildNamespace("traefik"),
		buildNamespace("monitoring"),

		// HelmRepositories
		buildHelmRepository("metrics-server", "https://kubernetes-sigs.github.io/metrics-server/"),
		buildHelmRepository("traefik", "https://traefik.github.io/charts"),
		buildHelmRepository("traefik-crds", "https://traefik.github.io/charts"),
		buildHelmRepository("altinn-studio", "https://charts.altinn.studio"),

		// HelmReleases
		buildMetricsServerRelease(),
		buildTraefikCRDsRelease(),
		buildTraefikRelease(includeLinkerd),
	}

	if includeLinkerd {
		objs = append(objs,
			buildNamespace("linkerd"),
			buildLinkerdIdentitySecret(caCrt, issuerCrt, issuerKey),
			buildHelmRepository("linkerd-edge", "https://helm.linkerd.io/edge"),
			buildLinkerdCRDsRelease(),
			buildLinkerdControlPlaneRelease(),
		)
	}

	return objs
}

func buildNamespace(name string) *corev1.Namespace {
	return &corev1.Namespace{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "v1",
			Kind:       "Namespace",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name: name,
		},
	}
}

func buildLinkerdIdentitySecret(caCrt, issuerCrt, issuerKey []byte) *corev1.Secret {
	return &corev1.Secret{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "v1",
			Kind:       "Secret",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      "linkerd-identity-issuer",
			Namespace: "linkerd",
		},
		Type: corev1.SecretTypeOpaque,
		StringData: map[string]string{
			"ca.crt":  string(caCrt),
			"tls.crt": string(issuerCrt),
			"tls.key": string(issuerKey),
		},
	}
}

func buildHelmRepository(name, url string) *sourcev1.HelmRepository {
	return &sourcev1.HelmRepository{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "source.toolkit.fluxcd.io/v1",
			Kind:       "HelmRepository",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: fluxSystemNamespace,
		},
		Spec: sourcev1.HelmRepositorySpec{
			Interval: metav1.Duration{Duration: interval1h},
			URL:      url,
		},
	}
}

func buildMetricsServerRelease() *helmv2.HelmRelease {
	values := map[string]interface{}{
		"args": []string{
			"--kubelet-insecure-tls",
			"--kubelet-preferred-address-types=InternalIP,Hostname,ExternalIP",
		},
	}

	return &helmv2.HelmRelease{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "helm.toolkit.fluxcd.io/v2",
			Kind:       "HelmRelease",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      "metrics-server",
			Namespace: "kube-system",
		},
		Spec: helmv2.HelmReleaseSpec{
			Interval: metav1.Duration{Duration: interval1h},
			Install: &helmv2.Install{
				DisableWait: true,
			},
			Upgrade: &helmv2.Upgrade{
				DisableWait: true,
			},
			Chart: &helmv2.HelmChartTemplate{
				Spec: helmv2.HelmChartTemplateSpec{
					Chart:   "metrics-server",
					Version: "3.13.0",
					SourceRef: helmv2.CrossNamespaceObjectReference{
						Kind:      "HelmRepository",
						Name:      "metrics-server",
						Namespace: fluxSystemNamespace,
					},
				},
			},
			Values: mustMarshalJSON(values),
		},
	}
}

func buildTraefikCRDsRelease() *helmv2.HelmRelease {
	return &helmv2.HelmRelease{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "helm.toolkit.fluxcd.io/v2",
			Kind:       "HelmRelease",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      "traefik-crds",
			Namespace: "traefik",
		},
		Spec: helmv2.HelmReleaseSpec{
			Interval: metav1.Duration{Duration: interval1h},
			Chart: &helmv2.HelmChartTemplate{
				Spec: helmv2.HelmChartTemplateSpec{
					Chart:   "traefik-crds",
					Version: "1.11.0",
					SourceRef: helmv2.CrossNamespaceObjectReference{
						Kind:      "HelmRepository",
						Name:      "traefik-crds",
						Namespace: fluxSystemNamespace,
					},
				},
			},
		},
	}
}

func buildLinkerdCRDsRelease() *helmv2.HelmRelease {
	return &helmv2.HelmRelease{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "helm.toolkit.fluxcd.io/v2",
			Kind:       "HelmRelease",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      "linkerd-crds",
			Namespace: "linkerd",
		},
		Spec: helmv2.HelmReleaseSpec{
			Interval: metav1.Duration{Duration: interval1h},
			Chart: &helmv2.HelmChartTemplate{
				Spec: helmv2.HelmChartTemplateSpec{
					Chart:   "linkerd-crds",
					Version: "2025.7.6",
					SourceRef: helmv2.CrossNamespaceObjectReference{
						Kind:      "HelmRepository",
						Name:      "linkerd-edge",
						Namespace: fluxSystemNamespace,
					},
				},
			},
		},
	}
}

func buildLinkerdControlPlaneRelease() *helmv2.HelmRelease {
	values := map[string]interface{}{
		"policyController": map[string]interface{}{
			"image": map[string]interface{}{
				"name": "ghcr.io/linkerd/policy-controller",
			},
		},
		"proxy": map[string]interface{}{
			"image": map[string]interface{}{
				"name": "ghcr.io/linkerd/proxy",
			},
		},
		"proxyInit": map[string]interface{}{
			"image": map[string]interface{}{
				"name": "ghcr.io/linkerd/proxy-init",
			},
		},
		"debugContainer": map[string]interface{}{
			"image": map[string]interface{}{
				"name": "ghcr.io/linkerd/debug",
			},
		},
	}

	return &helmv2.HelmRelease{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "helm.toolkit.fluxcd.io/v2",
			Kind:       "HelmRelease",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      "linkerd-control-plane",
			Namespace: "linkerd",
		},
		Spec: helmv2.HelmReleaseSpec{
			Interval: metav1.Duration{Duration: interval1h},
			Install: &helmv2.Install{
				CRDs: helmv2.Skip,
			},
			Upgrade: &helmv2.Upgrade{
				CRDs: helmv2.Skip,
			},
			DependsOn: []helmv2.DependencyReference{
				{Name: "linkerd-crds", Namespace: "linkerd"},
			},
			Chart: &helmv2.HelmChartTemplate{
				Spec: helmv2.HelmChartTemplateSpec{
					Chart:   "linkerd-control-plane",
					Version: "2025.7.6",
					SourceRef: helmv2.CrossNamespaceObjectReference{
						Kind:      "HelmRepository",
						Name:      "linkerd-edge",
						Namespace: fluxSystemNamespace,
					},
				},
			},
			Values: mustMarshalJSON(values),
			ValuesFrom: []helmv2.ValuesReference{
				{
					Kind:       "Secret",
					Name:       "linkerd-identity-issuer",
					ValuesKey:  "ca.crt",
					TargetPath: "identityTrustAnchorsPEM",
				},
				{
					Kind:       "Secret",
					Name:       "linkerd-identity-issuer",
					ValuesKey:  "tls.crt",
					TargetPath: "identity.issuer.tls.crtPEM",
				},
				{
					Kind:       "Secret",
					Name:       "linkerd-identity-issuer",
					ValuesKey:  "tls.key",
					TargetPath: "identity.issuer.tls.keyPEM",
				},
			},
		},
	}
}

func buildTraefikRelease(includeLinkerd bool) *helmv2.HelmRelease {
	values := map[string]interface{}{
		"global": map[string]interface{}{
			"checkNewVersion":    false,
			"sendAnonymousUsage": false,
		},
		"deployment": map[string]interface{}{
			"podAnnotations": map[string]interface{}{
				"linkerd.io/inject": "enabled",
			},
		},
		"providers": map[string]interface{}{
			"kubernetesCRD": map[string]interface{}{
				"enabled": true,
			},
			"kubernetesGateway": map[string]interface{}{
				"enabled": false,
			},
			"kubernetesIngress": map[string]interface{}{
				"enabled": false,
			},
		},
		"ports": map[string]interface{}{
			"web": map[string]interface{}{
				"nodePort": 30000,
				"expose": map[string]interface{}{
					"default": true,
				},
			},
			"websecure": map[string]interface{}{
				"nodePort": 30001,
				"expose": map[string]interface{}{
					"default": true,
				},
			},
			"traefik": map[string]interface{}{
				"nodePort": 30002,
				"expose": map[string]interface{}{
					"default": true,
				},
				"forwardedHeaders": map[string]interface{}{
					"insecure": true,
				},
			},
		},
		"service": map[string]interface{}{
			"type": "NodePort",
		},
	}

	dependsOn := []helmv2.DependencyReference{
		{Name: "traefik-crds", Namespace: "traefik"},
	}
	if includeLinkerd {
		dependsOn = append(dependsOn,
			helmv2.DependencyReference{Name: "linkerd-crds", Namespace: "linkerd"},
			helmv2.DependencyReference{Name: "linkerd-control-plane", Namespace: "linkerd"},
		)
	}

	return &helmv2.HelmRelease{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "helm.toolkit.fluxcd.io/v2",
			Kind:       "HelmRelease",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      "traefik",
			Namespace: "traefik",
		},
		Spec: helmv2.HelmReleaseSpec{
			Interval: metav1.Duration{Duration: interval1h},
			Install: &helmv2.Install{
				DisableWait: true,
				CRDs:        helmv2.Skip,
			},
			Upgrade: &helmv2.Upgrade{
				DisableWait: true,
				CRDs:        helmv2.Skip,
			},
			DependsOn: dependsOn,
			Chart: &helmv2.HelmChartTemplate{
				Spec: helmv2.HelmChartTemplateSpec{
					Chart:   "traefik",
					Version: "37.1.1",
					SourceRef: helmv2.CrossNamespaceObjectReference{
						Kind:      "HelmRepository",
						Name:      "traefik",
						Namespace: fluxSystemNamespace,
					},
				},
			},
			Values: mustMarshalJSON(values),
		},
	}
}

func mustMarshalJSON(v interface{}) *apiextensionsv1.JSON {
	data, err := json.Marshal(v)
	if err != nil {
		panic(err)
	}
	return &apiextensionsv1.JSON{Raw: data}
}
