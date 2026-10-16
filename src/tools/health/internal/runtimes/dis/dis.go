package dis

import (
	"cmp"
	"errors"
	"fmt"
	"slices"
	"strings"

	"altinn.studio/runtime-health/internal/az"
	"altinn.studio/runtime-health/internal/kubernetes"
)

var errMissingClusterClient = errors.New("missing cluster client")

type DisContainerRuntime struct {
	Cluster      *az.Cluster
	Context      *kubernetes.ContextInfo
	Client       *kubernetes.ClusterClient
	ClusterName  string
	ServiceOwner string
	Environment  string
}

func (d *DisContainerRuntime) GetName() string {
	return d.ClusterName
}

func (d *DisContainerRuntime) GetEnvironment() string {
	return d.Environment
}

func (d *DisContainerRuntime) GetServiceOwner() string {
	return d.ServiceOwner
}

func (d *DisContainerRuntime) GetKubernetesClient() *kubernetes.ClusterClient {
	return d.Client
}

// Compile-time check to ensure DisContainerRuntime implements KubernetesRuntime.
var _ kubernetes.KubernetesRuntime = (*DisContainerRuntime)(nil)

// Discovery includes both existing Azure runtimes and local contexts missing from discovery.
type Discovery struct {
	Runtimes      []*DisContainerRuntime
	StaleContexts []kubernetes.ContextInfo
}

func Discover(
	environments []string,
	serviceowner string,
	excludedOwners []string,
	kubeconfigPath string,
) (*Discovery, error) {
	result := &Discovery{}

	clusters, err := az.ListClusters()
	if err != nil {
		return nil, fmt.Errorf("list clusters from azure: %w", err)
	}
	contexts, err := kubernetes.ListContexts(kubeconfigPath)
	if err != nil {
		return nil, fmt.Errorf("list kube contexts: %w", err)
	}

	contextByName := make(map[string]*kubernetes.ContextInfo)
	for i := range contexts {
		contextByName[contexts[i].Name] = &contexts[i]
	}
	matchScope := func(name string) (string, string, bool) {
		owner, environment, matches := parseAndFilter(name, environments, serviceowner)
		return owner, environment, matches && !slices.Contains(excludedOwners, owner)
	}

	clusterNames := make(map[string]bool, len(clusters))
	for _, cluster := range clusters {
		clusterNames[cluster.Name] = true
		clusterServiceOwner, matchedEnv, isMatch := matchScope(cluster.Name)
		context := contextByName[cluster.Name]
		if isMatch {
			result.Runtimes = append(result.Runtimes, &DisContainerRuntime{
				ClusterName:  cluster.Name,
				Environment:  matchedEnv,
				ServiceOwner: clusterServiceOwner,
				Cluster:      &cluster,
				Context:      context,
			})
		}
	}

	for _, context := range contexts {
		_, _, matches := matchScope(context.Name)
		if matches &&
			strings.HasPrefix(context.User, "clusterUser_altinnapps") &&
			!clusterNames[context.Name] && !clusterNames[context.Cluster] {
			result.StaleContexts = append(result.StaleContexts, context)
		}
	}
	slices.SortFunc(result.Runtimes, func(a, b *DisContainerRuntime) int {
		return cmp.Compare(a.ClusterName, b.ClusterName)
	})
	return result, nil
}

func ListFromContext(environments []string, serviceowner string) ([]kubernetes.KubernetesRuntime, error) {
	contexts, err := kubernetes.ListContexts("")
	if err != nil {
		return nil, fmt.Errorf("list kube contexts: %w", err)
	}

	// Build concrete runtimes first
	userPrefix := "clusterUser_altinnapps"
	concreteRuntimes := make([]*DisContainerRuntime, 0, len(contexts))
	runtimeContexts := make([]kubernetes.ContextInfo, 0, len(contexts))

	for _, context := range contexts {
		contextServiceOwner, contextEnv, parsedOk := parseAndFilter(context.Name, environments, serviceowner)

		if parsedOk && strings.HasPrefix(context.User, userPrefix) {
			concreteRuntimes = append(concreteRuntimes, &DisContainerRuntime{
				ClusterName:  context.Name,
				Environment:  contextEnv,
				ServiceOwner: contextServiceOwner,
				Cluster:      nil,
				Context:      &context,
				Client:       nil, // Set below
			})
			runtimeContexts = append(runtimeContexts, context)
		}
	}

	clientsByName, err := kubernetes.BuildClients(runtimeContexts)
	if err != nil {
		return nil, fmt.Errorf("build kube clients: %w", err)
	}
	for _, runtime := range concreteRuntimes {
		client, clientOk := clientsByName[runtime.ClusterName]
		if !clientOk {
			return nil, fmt.Errorf("%w: %s", errMissingClusterClient, runtime.ClusterName)
		}
		runtime.Client = client
	}

	// Convert to interface slice
	runtimes := make([]kubernetes.KubernetesRuntime, len(concreteRuntimes))
	for i, r := range concreteRuntimes {
		runtimes[i] = r
	}

	return runtimes, nil
}

// parseAndFilter parses and states whether the passed in name matches based on the filter arguments (envs and serviceowner)
// arguments to a cluster/context name in the form of '<serviceowner>-<env>-aks' (e.g. ttd-tt02-aks).
func parseAndFilter(name string, environments []string, serviceowner string) (string, string, bool) {
	contextServiceOwner, withoutServiceOwner, found := strings.Cut(name, "-")
	if !found || contextServiceOwner == "" {
		return "", "", false
	}
	for _, ch := range contextServiceOwner {
		if ch < 'a' || ch > 'z' {
			return "", "", false
		}
	}

	if contextServiceOwner == "studio" {
		return "", "", false
	}

	if serviceowner != "" && contextServiceOwner != serviceowner {
		return "", "", false
	}

	contextEnvironment, withoutEnv, found := strings.Cut(withoutServiceOwner, "-")
	if !found {
		return "", "", false
	}
	if withoutEnv != "aks" {
		return "", "", false
	}
	matchedEnv := ""
	for _, candidateEnv := range environments {
		if contextEnvironment == candidateEnv {
			matchedEnv = candidateEnv
			break
		}
	}

	if matchedEnv == "" {
		return "", "", false
	}

	return contextServiceOwner, matchedEnv, true
}
