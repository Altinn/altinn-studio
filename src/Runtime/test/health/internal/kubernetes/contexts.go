package kubernetes

import (
	"fmt"
	"path/filepath"
	"sync"

	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
	"k8s.io/client-go/util/homedir"
)

// ContextInfo represents a kubectl context with its associated user
type ContextInfo struct {
	Name    string // Context name (e.g., "ttd-tt02-aks")
	User    string // User/authinfo name (e.g., "clusterUser_altinnapps-ttd-tt02-rg_ttd-tt02-aks")
	Cluster string // Cluster name (e.g., "ttd-tt02-aks")
}

// loadKubeConfig loads the kubeconfig from the default location
func loadKubeConfig() (*api.Config, clientcmd.ClientConfig, error) {
	kubeconfig := filepath.Join(homedir.HomeDir(), ".kube", "config")
	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to load kubeconfig from %s: %w", kubeconfig, err)
	}
	clientConfig := clientcmd.NewDefaultClientConfig(*config, nil)
	return config, clientConfig, nil
}

// ListContexts retrieves all kubectl contexts with their associated user/authinfo
// using the client-go library instead of executing kubectl commands.
func ListContexts() ([]ContextInfo, error) {
	config, _, err := loadKubeConfig()
	if err != nil {
		return nil, err
	}

	contexts := make([]ContextInfo, 0, len(config.Contexts))
	for name, ctx := range config.Contexts {
		contexts = append(contexts, ContextInfo{
			Name:    name,
			User:    ctx.AuthInfo,
			Cluster: ctx.Cluster,
		})
	}

	return contexts, nil
}

// BuildClients creates ClusterClients for multiple contexts in parallel.
// Returns a map of context name to ClusterClient.
func BuildClients(contexts []ContextInfo) (map[string]*ClusterClient, error) {
	clients := make(map[string]*ClusterClient, len(contexts))
	var mu sync.Mutex
	var wg sync.WaitGroup
	errChan := make(chan error, len(contexts))

	for _, context := range contexts {
		wg.Add(1)
		go func(context *ContextInfo) {
			defer wg.Done()
			client, err := newClusterClient(context.Name)
			if err != nil {
				errChan <- fmt.Errorf("failed to build client for context %s: %w", context.Name, err)
				return
			}
			mu.Lock()
			clients[context.Name] = client
			mu.Unlock()
		}(&context)
	}

	wg.Wait()
	close(errChan)

	// Check if any errors occurred
	if len(errChan) > 0 {
		return nil, <-errChan
	}

	return clients, nil
}
