package dis

import (
	"fmt"
	"strings"

	"altinn.studio/runtime-health/internal/az"
	"altinn.studio/runtime-health/internal/kubernetes"
)

type DisContainerRuntime struct {
	ClusterName  string
	ServiceOwner string
	Environment  string
	Cluster      *az.Cluster
	Context      *kubernetes.ContextInfo
	Client       *kubernetes.ClusterClient
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

// Compile-time check to ensure DisContainerRuntime implements KubernetesRuntime
var _ kubernetes.KubernetesRuntime = (*DisContainerRuntime)(nil)

func ListFromAzure(environments []string, serviceowner string) ([]kubernetes.KubernetesRuntime, error) {
	var runtimes []kubernetes.KubernetesRuntime

	clusters, err := az.ListClusters()
	if err != nil {
		return nil, err
	}
	contexts, err := kubernetes.ListContexts()
	if err != nil {
		return nil, err
	}

	contextByName := make(map[string]*kubernetes.ContextInfo)
	for i := range contexts {
		contextByName[contexts[i].Name] = &contexts[i]
	}

	for _, cluster := range clusters {
		clusterServiceOwner, matchedEnv, isMatch := parseAndFilter(cluster.Name, environments, serviceowner)
		context := contextByName[cluster.Name]
		if isMatch {
			runtimes = append(runtimes, &DisContainerRuntime{
				ClusterName:  cluster.Name,
				Environment:  matchedEnv,
				ServiceOwner: clusterServiceOwner,
				Cluster:      &cluster,
				Context:      context,
			})
		}
	}

	return runtimes, nil
}

func ListFromContext(environments []string, serviceowner string) ([]kubernetes.KubernetesRuntime, error) {
	contexts, err := kubernetes.ListContexts()
	if err != nil {
		return nil, err
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
		return nil, err
	}
	for _, runtime := range concreteRuntimes {
		client, clientOk := clientsByName[runtime.ClusterName]
		if !clientOk {
			return nil, fmt.Errorf("couldnt retrieve client for: %s", runtime.ClusterName)
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

// parseAndFilter parses and states wether the passed in name matches based on the filter arguments (envs and serviceowner)
// arguments to a cluster/context name in the form of '<serviceowner>-<env>-aks' (e.g. ttd-tt02-aks)
func parseAndFilter(name string, environments []string, serviceowner string) (string, string, bool) {
	contextServiceOwner, withoutServiceOwner, found := strings.Cut(name, "-")
	if !found {
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
