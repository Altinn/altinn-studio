package kind

import (
	"errors"
	"fmt"
	"log"
	"maps"
	"os"
	"path/filepath"
	"slices"
	"strings"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/kustomize/api/krusty"
	kustomizeTypes "sigs.k8s.io/kustomize/api/types"
	"sigs.k8s.io/kustomize/kyaml/filesys"

	"altinn.studio/devenv/pkg/cabundle"
	"altinn.studio/devenv/pkg/kubernetes"
	"altinn.studio/devenv/pkg/resource"
	localbackend "altinn.studio/devenv/pkg/resource/executor/local"
	"altinn.studio/devenv/pkg/runtimes/kind/manifests"
)

// The local Grafana gets Studio's content from Altinn/altinn-dashboards-grafana the way the
// shared Grafana does: grafana-operator, at the platform's version, syncs the repository's
// custom resources into it as an external instance. The fixture renders the product directory,
// leaves out what only the platform has (such as ExternalSecrets), points the datasources at the
// local observability-proxy, and adds the Secrets the platform's ExternalSecrets would create.
// Flux applies the result from the fixture's registry, so a resource removed from the
// repository is removed from Grafana too.

const (
	// EnvDashboardsRepository names a local checkout of Altinn/altinn-dashboards-grafana for
	// the monitoring Grafana, when KindContainerRuntimeOptions.DashboardsRepository is empty.
	EnvDashboardsRepository = "DEVENV_DASHBOARDS_REPOSITORY"

	dashboardsRepositoryURL = "https://github.com/Altinn/altinn-dashboards-grafana.git"
	// dashboardsProduct is the product directory in the dashboards repository whose
	// resources the local Grafana gets.
	dashboardsProduct         = "studio"
	monitoringGrafana         = "monitoring-grafana"
	monitoringGrafanaOperator = "monitoring-grafana-operator"
	monitoringGrafanaContent  = "monitoring-grafana-content"
	monitoringGrafanaCA       = "monitoring-grafana-ca-bundle"
	grafanaContentFile        = "content.yaml"

	// The shared Grafana reaches the observability-proxy at its public address; the
	// local one reaches it in the cluster, with the local query token.
	publicObservabilityURL = "https://altinn.studio/internal/observability/"
	localObservabilityURL  = "http://observability-proxy.observability.svc.cluster.local/internal/observability/"
	localQueryToken        = "local-grafana-query-token-not-a-secret" //nolint:gosec // Fixed for a developer's own cluster.

	grafanaOperatorGroup = "grafana.integreatly.org"
)

// alertingKinds are applied in the full monitoring profile only, which has the self-monitoring
// the rules read and the recorder the contact points notify.
var alertingKinds = []string{
	"GrafanaAlertRuleGroup",
	"GrafanaContactPoint",
	"GrafanaMuteTiming",
	"GrafanaNotificationPolicy",
	"GrafanaNotificationPolicyRoute",
	"GrafanaNotificationTemplate",
}

var (
	errNoProductResources = errors.New("the dashboards repository has no kustomization for the product")
	errSecretKeyConflict  = errors.New("a Secret key is referenced for two different purposes")
	errPlatformOnly       = errors.New("only the platform has this resource")
)

// resolveDashboardsRepository returns the dashboards checkout to read: the one given, or a
// clone in the fixture's cache, updated to the repository's main branch when it can be.
func resolveDashboardsRepository(explicit, cachePath string) (string, error) {
	if explicit == "" {
		explicit = os.Getenv(EnvDashboardsRepository)
	}
	if explicit != "" {
		// #nosec G703 -- The dashboards checkout is intentionally a user-chosen path.
		info, err := os.Stat(explicit)
		if err != nil {
			return "", fmt.Errorf("dashboards repository %s: %w", explicit, err)
		}
		if !info.IsDir() {
			return "", fmt.Errorf("dashboards repository %s: %w", explicit, os.ErrInvalid)
		}
		return explicit, nil
	}
	checkout := &resource.GitCheckout{
		Name:    "altinn-dashboards-grafana",
		RepoURL: dashboardsRepositoryURL,
		Ref:     "main",
		Path:    filepath.Join(cachePath, "altinn-dashboards-grafana"),
	}
	if err := localbackend.EnsureGitCheckout(checkout); err != nil {
		// Offline, or with GitHub unavailable, the copy from an earlier start will do.
		if _, statErr := os.Stat(filepath.Join(checkout.Path, ".git")); statErr != nil {
			return "", fmt.Errorf("check out dashboards repository: %w", err)
		}
		log.Printf("warning: using the cached dashboards repository, which could not be updated: %v", err)
	}
	return checkout.Path, nil
}

// renderGrafanaContent renders each kustomization in the product directory, as the platform's
// Flux does, and returns the resources the local Grafana's operator gets, with the Secrets they
// read. The alerting resources are included only when alerting is set.
func renderGrafanaContent(repository string, alerting bool) (string, error) {
	productDir := filepath.Join(repository, "products", dashboardsProduct)
	dirs, err := filepath.Glob(filepath.Join(productDir, "*", "kustomization.yaml"))
	if err != nil {
		return "", fmt.Errorf("find kustomizations in %s: %w", productDir, err)
	}
	if len(dirs) == 0 {
		return "", fmt.Errorf("%w: %s", errNoProductResources, productDir)
	}
	secrets := map[string]map[string][]byte{}
	var objects []runtime.Object
	var platformOnly []string
	for _, file := range dirs {
		rendered, renderErr := renderProductKustomization(filepath.Dir(file))
		if renderErr != nil {
			return "", renderErr
		}
		for _, object := range rendered {
			keep, secretValue, localErr := localGrafanaObject(object, alerting)
			switch {
			case errors.Is(localErr, errPlatformOnly):
				platformOnly = append(platformOnly, object.GetKind()+"/"+object.GetName())
				continue
			case localErr != nil:
				return "", fmt.Errorf("%s %s: %w", object.GetKind(), object.GetName(), localErr)
			case !keep:
				continue
			}
			objects = append(objects, object)
			if secretErr := addSecretValues(secrets, object.Object, secretValue); secretErr != nil {
				return "", fmt.Errorf("%s %s: %w", object.GetKind(), object.GetName(), secretErr)
			}
		}
	}
	if len(platformOnly) > 0 {
		// Such as the ExternalSecrets that fill the Secrets in the shared Grafana's cluster.
		log.Printf("Grafana content: leaving out what only the platform has: %s", strings.Join(platformOnly, ", "))
	}
	for _, name := range slices.Sorted(maps.Keys(secrets)) {
		objects = append(objects, &corev1.Secret{
			TypeMeta:   metav1.TypeMeta{APIVersion: "v1", Kind: "Secret"},
			ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: manifests.GrafanaNamespace},
			Type:       corev1.SecretTypeOpaque,
			Data:       secrets[name],
		})
	}
	manifest, err := kubernetes.ObjectsManifest(objects)
	if err != nil {
		return "", fmt.Errorf("render Grafana content: %w", err)
	}
	return manifest, nil
}

func renderProductKustomization(dir string) ([]*unstructured.Unstructured, error) {
	opts := krusty.MakeDefaultOptions()
	opts.LoadRestrictions = kustomizeTypes.LoadRestrictionsNone
	resources, err := krusty.MakeKustomizer(opts).Run(filesys.MakeFsOnDisk(), dir)
	if err != nil {
		return nil, fmt.Errorf("render %s: %w", dir, err)
	}
	objects := make([]*unstructured.Unstructured, 0, resources.Size())
	for _, res := range resources.Resources() {
		object, err := res.Map()
		if err != nil {
			return nil, fmt.Errorf("render %s: %w", dir, err)
		}
		objects = append(objects, &unstructured.Unstructured{Object: object})
	}
	return objects, nil
}

// localGrafanaObject reports whether the fixture applies a rendered resource, and points a
// datasource at the local proxy. It returns what a Secret key the resource reads holds locally,
// and errPlatformOnly for a resource that is not grafana-operator's, other than a ConfigMap such
// as a dashboard's JSON.
func localGrafanaObject(object *unstructured.Unstructured, alerting bool) (bool, func(secretKeyRef) string, error) {
	gvk := object.GroupVersionKind()
	switch {
	case gvk.Group == "" && gvk.Kind == "ConfigMap":
		return true, nil, nil
	case gvk.Group != grafanaOperatorGroup || gvk.Kind == "Grafana":
		return false, nil, errPlatformOnly
	case gvk.Kind == "GrafanaContactPoint":
		return alerting, recorderURL, nil
	case slices.Contains(alertingKinds, gvk.Kind):
		return alerting, nil, nil
	case gvk.Kind != "GrafanaDatasource":
		return true, nil, nil
	}
	url, _, err := unstructured.NestedString(object.Object, "spec", "datasource", "url")
	if err != nil || !strings.HasPrefix(url, publicObservabilityURL) {
		// The local stack has only the observability-proxy's backends.
		log.Printf("warning: leaving out Grafana datasource %s, which does not query the "+
			"observability-proxy: %q", object.GetName(), url)
		return false, nil, nil //nolint:nilerr // A datasource the fixture cannot serve is left out.
	}
	local := localObservabilityURL + strings.TrimPrefix(url, publicObservabilityURL)
	if err := unstructured.SetNestedField(object.Object, local, "spec", "datasource", "url"); err != nil {
		return false, nil, fmt.Errorf("set datasource URL: %w", err)
	}
	return true, func(secretKeyRef) string { return "Bearer " + localQueryToken }, nil
}

// secretKeyRef is a key of a Secret that a resource reads.
type secretKeyRef struct{ name, key string }

// addSecretValues adds every Secret key a resource reads to secrets.
func addSecretValues(secrets map[string]map[string][]byte, object any, secretValue func(secretKeyRef) string) error {
	if secretValue == nil {
		return nil
	}
	for _, ref := range secretKeyRefs(object) {
		value := []byte(secretValue(ref))
		if existing, ok := secrets[ref.name][ref.key]; ok && string(existing) != string(value) {
			return fmt.Errorf("%w: %s/%s", errSecretKeyConflict, ref.name, ref.key)
		}
		if secrets[ref.name] == nil {
			secrets[ref.name] = map[string][]byte{}
		}
		secrets[ref.name][ref.key] = value
	}
	return nil
}

// secretKeyRefs returns every secretKeyRef in a resource, wherever it names one.
func secretKeyRefs(value any) []secretKeyRef {
	var refs []secretKeyRef
	switch v := value.(type) {
	case map[string]any:
		ref, isRef := v["secretKeyRef"].(map[string]any)
		name, hasName := ref["name"].(string)
		key, hasKey := ref["key"].(string)
		if isRef && hasName && hasKey {
			refs = append(refs, secretKeyRef{name: name, key: key})
		}
		for _, item := range v {
			refs = append(refs, secretKeyRefs(item)...)
		}
	case []any:
		for _, item := range v {
			refs = append(refs, secretKeyRefs(item)...)
		}
	}
	return refs
}

// recorderURL is where a contact point's webhook goes instead of Slack: the in-cluster
// recorder, with the Secret and key in the path so a message shows which webhook it was for.
func recorderURL(ref secretKeyRef) string {
	return fmt.Sprintf("http://%s.%s.svc.cluster.local/%s/%s",
		manifests.AlertRecorderName, manifests.GrafanaNamespace, ref.name, ref.key)
}

// grafanaInputs are what the local Grafana is built from.
type grafanaInputs struct {
	cluster   resource.ResourceRef
	registry  resource.ResourceRef
	baseInfra resource.ResourceRef
	stack     resource.ResourceRef
	content   string
	cachePath string
	full      bool
}

// addGrafanaResources adds grafana-operator, the local Grafana with its MCP server (and, in the
// full profile, the alert recorder), and the content the operator syncs into Grafana, once the
// observability stack is ready.
func addGrafanaResources(graph *resource.Graph, in grafanaInputs) error {
	operatorManifest, err := kubernetes.ObjectsManifest(manifests.BuildGrafanaOperator())
	if err != nil {
		return fmt.Errorf("render grafana-operator manifest: %w", err)
	}
	operator := &resource.KubernetesObjectSet{
		Name:      monitoringGrafanaOperator,
		Cluster:   in.cluster,
		Manifest:  operatorManifest,
		DependsOn: []resource.ResourceRef{in.baseInfra},
		Readiness: []resource.KubernetesReadinessCheck{monitoringReadiness(
			resource.KubernetesReadinessFluxHelmRelease,
			manifests.GrafanaNamespace,
			"grafana-operator",
			monitoringOperatorTimeout,
		)},
	}
	contentDir := filepath.Join(in.cachePath, manifests.GrafanaContentName)
	contentFile := &resource.LocalFile{
		Name:    manifests.GrafanaContentName,
		Path:    filepath.Join(contentDir, grafanaContentFile),
		Content: []byte(in.content),
	}
	contentArtifact := monitoringArtifact(manifests.GrafanaContentName, contentDir, in.registry)
	contentArtifact.DependsOn = append(contentArtifact.DependsOn, resource.Ref(contentFile))
	if err = graph.AddAll(operator, contentFile, contentArtifact); err != nil {
		return fmt.Errorf("add Grafana resources: %w", err)
	}
	grafana, err := addGrafana(graph, in, operator)
	if err != nil {
		return err
	}

	// The operator syncs into Grafana once it answers, so the content follows it.
	contentManifest, err := kubernetes.ObjectsManifest(manifests.BuildGrafanaContent())
	if err != nil {
		return fmt.Errorf("render Grafana content manifest: %w", err)
	}
	if err := graph.Add(&resource.KubernetesObjectSet{
		Name:      monitoringGrafanaContent,
		Cluster:   in.cluster,
		Manifest:  contentManifest,
		DependsOn: []resource.ResourceRef{resource.Ref(grafana), resource.Ref(contentArtifact)},
		Readiness: []resource.KubernetesReadinessCheck{monitoringReadiness(
			resource.KubernetesReadinessFluxKustomization,
			manifests.GrafanaNamespace,
			manifests.GrafanaContentName,
			monitoringOperatorTimeout,
		)},
	}); err != nil {
		return fmt.Errorf("add Grafana content: %w", err)
	}
	return nil
}

// addGrafana adds the local Grafana, its MCP server and, in the full profile, the recorder, with
// the fixture's CA bundle when it has one.
func addGrafana(
	graph *resource.Graph,
	in grafanaInputs,
	operator *resource.KubernetesObjectSet,
) (*resource.KubernetesObjectSet, error) {
	deps := []resource.ResourceRef{in.stack, resource.Ref(operator)}
	bundle, _, err := cabundle.FromEnv()
	if err != nil {
		return nil, fmt.Errorf("resolve CA bundle: %w", err)
	}
	var grafanaCA *manifests.GrafanaCABundle
	caSet, hasCASet, err := cabundle.KubernetesConfigMapObjectSet(
		bundle,
		in.cluster,
		monitoringGrafanaCA,
		[]cabundle.KubernetesWorkload{{Deployment: "grafana", Namespace: manifests.GrafanaNamespace}},
		[]resource.ResourceRef{resource.Ref(operator)},
	)
	if err != nil {
		return nil, fmt.Errorf("create Grafana CA bundle resource: %w", err)
	}
	if hasCASet {
		if err = graph.Add(caSet); err != nil {
			return nil, fmt.Errorf("add Grafana CA bundle resource: %w", err)
		}
		deps = append(deps, resource.Ref(caSet))
		grafanaCA = grafanaCABundle()
	}

	manifest, err := kubernetes.ObjectsManifest(manifests.BuildGrafana(grafanaCA, in.full))
	if err != nil {
		return nil, fmt.Errorf("render Grafana manifest: %w", err)
	}
	deployments := []string{"grafana", "grafana-mcp"}
	if in.full {
		deployments = append(deployments, manifests.AlertRecorderName)
	}
	readiness := make([]resource.KubernetesReadinessCheck, 0, len(deployments))
	for _, name := range deployments {
		readiness = append(readiness, monitoringReadiness(resource.KubernetesReadinessDeploymentAvailable,
			manifests.GrafanaNamespace, name, monitoringStackTimeout))
	}
	grafana := &resource.KubernetesObjectSet{
		Name:      monitoringGrafana,
		Cluster:   in.cluster,
		Manifest:  manifest,
		DependsOn: deps,
		Readiness: readiness,
	}
	if err := graph.Add(grafana); err != nil {
		return nil, fmt.Errorf("add Grafana: %w", err)
	}
	return grafana, nil
}

func grafanaCABundle() *manifests.GrafanaCABundle {
	names := append([]string{cabundle.EnvStudioCABundle}, cabundle.EnvVars()...)
	env := make([]corev1.EnvVar, 0, len(names)+1)
	for _, name := range names {
		env = append(env, corev1.EnvVar{Name: name, Value: cabundle.ContainerPath})
	}
	env = append(env, corev1.EnvVar{Name: cabundle.EnvVarsKey, Value: cabundle.EnvVarCSV()})
	return &manifests.GrafanaCABundle{
		ConfigMapName: cabundle.KubernetesConfigMapName,
		Key:           cabundle.KubernetesConfigMapKey,
		ContainerPath: cabundle.ContainerPath,
		Env:           env,
	}
}
