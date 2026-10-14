package kind

import (
	"bufio"
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"log"
	"maps"
	"os"
	"path/filepath"
	"slices"
	"strings"

	corev1 "k8s.io/api/core/v1"
	utilyaml "k8s.io/apimachinery/pkg/util/yaml"
	"sigs.k8s.io/yaml"

	"altinn.studio/devenv/pkg/cabundle"
	"altinn.studio/devenv/pkg/kubernetes"
	"altinn.studio/devenv/pkg/resource"
	localbackend "altinn.studio/devenv/pkg/resource/executor/local"
	"altinn.studio/devenv/pkg/runtimes/kind/manifests"
)

const (
	// EnvDashboardsRepository names a local checkout of Altinn/altinn-dashboards-grafana for
	// the monitoring Grafana, when KindContainerRuntimeOptions.DashboardsRepository is empty.
	EnvDashboardsRepository = "DEVENV_DASHBOARDS_REPOSITORY"

	dashboardsRepositoryURL = "https://github.com/Altinn/altinn-dashboards-grafana.git"
	// dashboardsProduct is the product directory in the dashboards repository whose
	// datasources, folder and dashboards the local Grafana loads.
	dashboardsProduct   = "studio"
	monitoringGrafana   = "monitoring-grafana"
	monitoringGrafanaCA = "monitoring-grafana-ca-bundle"
	// dashboardsReloadSeconds is how often Grafana rereads the provisioned dashboards.
	dashboardsReloadSeconds = 10

	// The shared Grafana reaches the observability-proxy at its public address; the
	// local one reaches it in the cluster, with the local query token.
	publicObservabilityURL = "https://altinn.studio/internal/observability/"
	localObservabilityURL  = "http://observability-proxy.observability.svc.cluster.local/internal/observability/"
	localQueryToken        = "local-grafana-query-token-not-a-secret" //nolint:gosec // Fixed for a developer's own cluster.
	authorizationValue     = "${authorization}"
)

var errDashboardsDatasourceURL = errors.New("datasource URL is not on the observability-proxy")

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

// grafanaContentOptions selects what the local Grafana loads besides datasources and dashboards.
type grafanaContentOptions struct {
	recorderURL string
	alerting    bool
}

// grafanaResources are the product's Grafana resources from the dashboards repository.
type grafanaResources struct {
	folders          map[string]grafanaFolder
	dashboardFolders map[string]string
	datasources      []map[string]any
	ruleGroups       []grafanaObject
	contactPoints    []grafanaObject
	templates        []grafanaObject
}

// loadGrafanaContent reads the product's datasources, folders and dashboards from the
// dashboards repository, and with options.alerting its alert rules and contact points, as
// the shared Grafana's operator would apply them.
func loadGrafanaContent(repository string, options grafanaContentOptions) (manifests.GrafanaContent, error) {
	productDir := filepath.Join(repository, "products", dashboardsProduct)
	resources, err := readGrafanaResources(productDir)
	if err != nil {
		return manifests.GrafanaContent{}, err
	}
	dashboards, err := readDashboards(filepath.Join(productDir, "dashboards"))
	if err != nil {
		return manifests.GrafanaContent{}, err
	}

	datasourcesFile, err := yaml.Marshal(map[string]any{
		"apiVersion":  1,
		"prune":       true,
		"datasources": resources.datasources,
	})
	if err != nil {
		return manifests.GrafanaContent{}, fmt.Errorf("render Grafana datasources: %w", err)
	}
	dashboardDirs, providers, err := dashboardProviders(resources, dashboards)
	if err != nil {
		return manifests.GrafanaContent{}, err
	}
	providersFile, err := yaml.Marshal(map[string]any{"apiVersion": 1, "providers": providers})
	if err != nil {
		return manifests.GrafanaContent{}, fmt.Errorf("render Grafana dashboard providers: %w", err)
	}
	alerting := ""
	if options.alerting {
		if alerting, err = renderGrafanaAlerting(resources, options.recorderURL); err != nil {
			return manifests.GrafanaContent{}, err
		}
	}

	digest := sha256.New()
	digest.Write(datasourcesFile)
	digest.Write(providersFile)
	digest.Write([]byte(alerting))
	for _, name := range slices.Sorted(maps.Keys(dashboards)) {
		digest.Write([]byte(name))
		digest.Write([]byte(dashboardDirs[name]))
		digest.Write([]byte(dashboards[name]))
	}
	return manifests.GrafanaContent{
		Datasources:        string(datasourcesFile),
		DashboardProviders: string(providersFile),
		Dashboards:         dashboards,
		DashboardDirs:      dashboardDirs,
		Alerting:           alerting,
		Digest:             hex.EncodeToString(digest.Sum(nil))[:16],
	}, nil
}

// dashboardProviders places each dashboard in the folder its GrafanaDashboard names, with one
// provider per folder reading its own directory. Grafana's file provider creates only
// top-level folders, so a dashboard in a nested folder goes into that folder's top-level
// ancestor; its UID, and so every link to it, is unchanged. A dashboard without a
// GrafanaDashboard goes into the product's top-level folder.
func dashboardProviders(
	resources grafanaResources,
	dashboards map[string]string,
) (map[string]string, []any, error) {
	defaultFolder := ""
	for _, name := range slices.Sorted(maps.Keys(resources.folders)) {
		if resources.folders[name].parent == "" {
			defaultFolder = resources.folders[name].title
			break
		}
	}
	titles := map[string]string{}
	for _, file := range slices.Sorted(maps.Keys(dashboards)) {
		title := defaultFolder
		if ref, ok := resources.dashboardFolders[file]; ok {
			root, err := rootFolderTitle(resources.folders, ref)
			if err != nil {
				return nil, nil, fmt.Errorf("dashboard %s: %w", file, err)
			}
			title = root
		}
		titles[file] = title
	}

	dirs := map[string]string{}
	providers := []any{}
	for i, title := range slices.Compact(slices.Sorted(maps.Values(titles))) {
		dir := fmt.Sprintf("folder-%d", i)
		for file, fileTitle := range titles {
			if fileTitle == title {
				dirs[file] = dir
			}
		}
		providers = append(providers, map[string]any{
			"name":                  fmt.Sprintf("%s-%d", dashboardsProduct, i),
			"folder":                title,
			"type":                  "file",
			"allowUiUpdates":        true,
			"updateIntervalSeconds": dashboardsReloadSeconds,
			"options":               map[string]any{"path": manifests.GrafanaDashboardsPath + "/" + dir},
		})
	}
	return dirs, providers, nil
}

// readGrafanaResources returns the product's Grafana resources from every YAML file under the
// product directory.
func readGrafanaResources(productDir string) (grafanaResources, error) {
	resources := grafanaResources{
		folders:          map[string]grafanaFolder{},
		dashboardFolders: map[string]string{},
	}
	err := filepath.WalkDir(productDir, func(path string, entry os.DirEntry, walkErr error) error {
		if walkErr != nil || entry.IsDir() || !strings.HasSuffix(path, ".yaml") {
			return walkErr
		}
		return readGrafanaResourceFile(path, &resources)
	})
	if err != nil {
		return grafanaResources{}, fmt.Errorf("read Grafana resources in %s: %w", productDir, err)
	}
	slices.SortFunc(resources.datasources, func(a, b map[string]any) int {
		return strings.Compare(fmt.Sprint(a["uid"]), fmt.Sprint(b["uid"]))
	})
	for _, objects := range [][]grafanaObject{resources.ruleGroups, resources.contactPoints, resources.templates} {
		slices.SortFunc(objects, func(a, b grafanaObject) int { return strings.Compare(a.name, b.name) })
	}
	return resources, nil
}

func readGrafanaResourceFile(path string, resources *grafanaResources) error {
	// #nosec G304 -- Paths come from walking the dashboards checkout.
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read %s: %w", path, err)
	}
	docs, err := yamlDocuments(data)
	if err != nil {
		return fmt.Errorf("%s: %w", path, err)
	}
	for _, doc := range docs {
		var object struct {
			Spec     map[string]any `json:"spec"`
			Kind     string         `json:"kind"`
			Metadata struct {
				Name string `json:"name"`
			} `json:"metadata"`
		}
		if err := yaml.Unmarshal(doc, &object); err != nil {
			return fmt.Errorf("parse %s: %w", path, err)
		}
		named := grafanaObject{name: object.Metadata.Name, spec: object.Spec, path: path}
		switch object.Kind {
		case "GrafanaFolder":
			title := field[string](object.Spec, "title")
			parent := field[string](object.Spec, "parentFolderRef")
			resources.folders[object.Metadata.Name] = grafanaFolder{title: title, parent: parent}
		case "GrafanaDashboard":
			configMap := field[map[string]any](object.Spec, "configMapRef")
			key := field[string](configMap, "key")
			if ref, ok := object.Spec["folderRef"].(string); ok && key != "" {
				resources.dashboardFolders[key] = ref
			}
		case "GrafanaDatasource":
			datasource, err := localDatasource(object.Spec)
			// The local stack has only the observability-proxy's backends, so a datasource
			// for anything else is left out rather than stopping the fixture.
			if errors.Is(err, errDashboardsDatasourceURL) {
				log.Printf("warning: skipping a Grafana datasource in %s: %v", path, err)
				continue
			}
			if err != nil {
				return fmt.Errorf("%s: %w", path, err)
			}
			resources.datasources = append(resources.datasources, datasource)
		case "GrafanaAlertRuleGroup":
			resources.ruleGroups = append(resources.ruleGroups, named)
		case "GrafanaContactPoint":
			resources.contactPoints = append(resources.contactPoints, named)
		case "GrafanaNotificationTemplate":
			resources.templates = append(resources.templates, named)
		}
	}
	return nil
}

// yamlDocuments splits multi-document YAML into its non-empty documents.
func yamlDocuments(data []byte) ([][]byte, error) {
	reader := utilyaml.NewYAMLReader(bufio.NewReader(bytes.NewReader(data)))
	var docs [][]byte
	for {
		doc, err := reader.Read()
		if errors.Is(err, io.EOF) {
			return docs, nil
		}
		if err != nil {
			return nil, fmt.Errorf("split YAML documents: %w", err)
		}
		if len(bytes.TrimSpace(doc)) > 0 {
			docs = append(docs, doc)
		}
	}
}

// localDatasource turns a GrafanaDatasource spec into a provisioning entry that reaches the
// local observability-proxy, with the same name, uid, type and settings.
func localDatasource(spec map[string]any) (map[string]any, error) {
	entry := map[string]any{}
	if datasource, ok := spec["datasource"].(map[string]any); ok {
		maps.Copy(entry, datasource)
	}
	entry["uid"] = spec["uid"]
	entry["orgId"] = 1

	url, ok := entry["url"].(string)
	if !ok || !strings.HasPrefix(url, publicObservabilityURL) {
		return nil, fmt.Errorf("%w: %q", errDashboardsDatasourceURL, url)
	}
	entry["url"] = localObservabilityURL + strings.TrimPrefix(url, publicObservabilityURL)

	if secure, ok := entry["secureJsonData"].(map[string]any); ok {
		local := make(map[string]any, len(secure))
		for key, value := range secure {
			if text, isText := value.(string); isText {
				value = strings.ReplaceAll(text, authorizationValue, "Bearer "+localQueryToken)
			}
			local[key] = value
		}
		entry["secureJsonData"] = local
	}
	// Grafana expands environment variables in provisioning files, which would empty template
	// variables such as ${__span.traceId} or $__rate_interval. The operator passes them through.
	return escapeProvisioningMap(entry), nil
}

// escapeProvisioningMap doubles every '$' in the strings of a provisioning entry, which
// Grafana reads back as a literal '$'.
func escapeProvisioningMap(entry map[string]any) map[string]any {
	escaped := make(map[string]any, len(entry))
	for key, item := range entry {
		escaped[key] = escapeProvisioningValue(item)
	}
	return escaped
}

func escapeProvisioningValue(value any) any {
	switch v := value.(type) {
	case string:
		return strings.ReplaceAll(v, "$", "$$")
	case map[string]any:
		return escapeProvisioningMap(v)
	case []any:
		escaped := make([]any, len(v))
		for i, item := range v {
			escaped[i] = escapeProvisioningValue(item)
		}
		return escaped
	default:
		return value
	}
}

func readDashboards(dir string) (map[string]string, error) {
	entries, err := os.ReadDir(dir)
	if errors.Is(err, os.ErrNotExist) {
		return map[string]string{}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("read dashboards in %s: %w", dir, err)
	}
	dashboards := map[string]string{}
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".json" {
			continue
		}
		// #nosec G304 -- Paths come from the dashboards checkout.
		data, err := os.ReadFile(filepath.Join(dir, entry.Name()))
		if err != nil {
			return nil, fmt.Errorf("read dashboard %s: %w", entry.Name(), err)
		}
		dashboards[entry.Name()] = string(data)
	}
	return dashboards, nil
}

// addGrafanaResources adds the local Grafana, with the dashboards repository's datasources
// and dashboards, and its MCP server, once the observability stack is ready.
func addGrafanaResources(
	graph *resource.Graph,
	content manifests.GrafanaContent,
	cluster resource.ResourceRef,
	stack resource.ResourceRef,
) error {
	deps := []resource.ResourceRef{stack}
	bundle, _, err := cabundle.FromEnv()
	if err != nil {
		return fmt.Errorf("resolve CA bundle: %w", err)
	}
	var grafanaCA *manifests.GrafanaCABundle
	caSet, hasCASet, err := cabundle.KubernetesConfigMapObjectSet(
		bundle,
		cluster,
		monitoringGrafanaCA,
		[]cabundle.KubernetesWorkload{{Deployment: "grafana", Namespace: manifests.GrafanaNamespace}},
		deps,
	)
	if err != nil {
		return fmt.Errorf("create Grafana CA bundle resource: %w", err)
	}
	if hasCASet {
		if err = graph.Add(caSet); err != nil {
			return fmt.Errorf("add Grafana CA bundle resource: %w", err)
		}
		deps = append(deps, resource.Ref(caSet))
		grafanaCA = grafanaCABundle()
	}

	manifest, err := kubernetes.ObjectsManifest(manifests.BuildGrafana(content, grafanaCA))
	if err != nil {
		return fmt.Errorf("render Grafana manifest: %w", err)
	}
	if err := graph.Add(&resource.KubernetesObjectSet{
		Name:      monitoringGrafana,
		Cluster:   cluster,
		Manifest:  manifest,
		DependsOn: deps,
		Readiness: []resource.KubernetesReadinessCheck{
			monitoringReadiness(
				resource.KubernetesReadinessDeploymentAvailable,
				manifests.GrafanaNamespace,
				"grafana",
				monitoringStackTimeout,
			),
			monitoringReadiness(
				resource.KubernetesReadinessDeploymentAvailable,
				manifests.GrafanaNamespace,
				"grafana-mcp",
				monitoringStackTimeout,
			),
		},
	}); err != nil {
		return fmt.Errorf("add Grafana resources: %w", err)
	}
	return nil
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
