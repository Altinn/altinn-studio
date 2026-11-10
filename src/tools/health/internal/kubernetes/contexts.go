package kubernetes

import (
	"cmp"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"sync"

	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
	"k8s.io/client-go/util/homedir"
)

var errKubeconfigParentNotDirectory = errors.New("kubeconfig parent path is not a directory")

var errContextChanged = errors.New("context changed since discovery; run init again")

// ContextInfo represents a kubectl context with its associated user.
type ContextInfo struct {
	Name    string // Context name (e.g., "ttd-tt02-aks")
	User    string // User/authinfo name (e.g., "clusterUser_altinnapps-ttd-tt02-rg_ttd-tt02-aks")
	Cluster string // Cluster name (e.g., "ttd-tt02-aks")
	Current bool
}

// ResolveKubeconfigPath selects one file for discovery, credential fetching, and pruning.
func ResolveKubeconfigPath(path string) (string, error) {
	if path == "" {
		path = filepath.Join(homedir.HomeDir(), ".kube", "config")
	}
	absolute, err := filepath.Abs(path)
	if err != nil {
		return "", fmt.Errorf("resolve kubeconfig path: %w", err)
	}
	// Resolve existing symlinks so an atomic replacement updates their target.
	resolved, err := filepath.EvalSymlinks(absolute)
	if errors.Is(err, os.ErrNotExist) {
		return absolute, nil
	}
	if err != nil {
		return "", fmt.Errorf("resolve kubeconfig symlinks: %w", err)
	}
	return resolved, nil
}

// loadKubeConfig loads the selected kubeconfig. An empty path uses the default location.
//
//nolint:ireturn // client-go exposes the deferred config as an interface.
func loadKubeConfig(kubeconfigPath string) (*api.Config, clientcmd.ClientConfig, error) {
	kubeconfig := kubeconfigPath
	if kubeconfig == "" {
		kubeconfig = filepath.Join(homedir.HomeDir(), ".kube", "config")
	}

	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		if kubeconfigPath == "" || !errors.Is(err, os.ErrNotExist) {
			return nil, nil, fmt.Errorf("failed to load kubeconfig from %s: %w", kubeconfig, err)
		}

		parent := filepath.Dir(kubeconfig)
		info, parentErr := os.Stat(parent)
		if parentErr != nil {
			return nil, nil, fmt.Errorf(
				"cannot use kubeconfig path %s: parent directory %s: %w",
				kubeconfig,
				parent,
				parentErr,
			)
		}
		if !info.IsDir() {
			return nil, nil, fmt.Errorf(
				"cannot use kubeconfig path %s: %w: %s",
				kubeconfig,
				errKubeconfigParentNotDirectory,
				parent,
			)
		}

		config = api.NewConfig()
	}
	clientConfig := clientcmd.NewDefaultClientConfig(*config, nil)
	return config, clientConfig, nil
}

// ListContexts retrieves all kubectl contexts with their associated user/authinfo
// using the client-go library instead of executing kubectl commands.
func ListContexts(kubeconfigPath string) ([]ContextInfo, error) {
	config, _, err := loadKubeConfig(kubeconfigPath)
	if err != nil {
		return nil, err
	}

	contexts := make([]ContextInfo, 0, len(config.Contexts))
	for name, ctx := range config.Contexts {
		contexts = append(contexts, ContextInfo{
			Name:    name,
			User:    ctx.AuthInfo,
			Cluster: ctx.Cluster,
			Current: name == config.CurrentContext,
		})
	}
	slices.SortFunc(contexts, func(a, b ContextInfo) int { return cmp.Compare(a.Name, b.Name) })

	return contexts, nil
}

// PruneContexts reloads the file to preserve credentials fetched since discovery.
// It backs up the original bytes and replaces the config atomically.
func PruneContexts(path string, contexts []ContextInfo) (string, error) {
	if len(contexts) == 0 {
		return "", nil
	}
	//nolint:gosec // The user explicitly selects the local kubeconfig file.
	original, err := os.ReadFile(path)
	if err != nil {
		return "", fmt.Errorf("read kubeconfig before pruning: %w", err)
	}
	config, err := clientcmd.Load(original)
	if err != nil {
		return "", fmt.Errorf("parse kubeconfig before pruning: %w", err)
	}
	if removeErr := removeContexts(config, contexts); removeErr != nil {
		return "", removeErr
	}
	updated, err := clientcmd.Write(*config)
	if err != nil {
		return "", fmt.Errorf("serialize pruned kubeconfig: %w", err)
	}
	backup, err := writeConfigTemp(path+".backup-*", original)
	if err != nil {
		return "", err
	}
	temporary, err := writeConfigTemp(path+".tmp-*", updated)
	if err != nil {
		return backup, err
	}
	defer func() {
		// The file is already gone after a successful rename.
		if err := os.Remove(temporary); err != nil && !errors.Is(err, os.ErrNotExist) {
			fmt.Fprintf(os.Stderr, "Could not remove temporary kubeconfig %s: %v\n", temporary, err)
		}
	}()
	if err := os.Rename(temporary, path); err != nil {
		return backup, fmt.Errorf("replace kubeconfig: %w", err)
	}
	return backup, nil
}

func removeContexts(config *api.Config, contexts []ContextInfo) error {
	clusters, users := make(map[string]bool), make(map[string]bool)
	for _, candidate := range contexts {
		ctx, exists := config.Contexts[candidate.Name]
		if !exists || ctx.Cluster != candidate.Cluster || ctx.AuthInfo != candidate.User {
			return fmt.Errorf("%w: %s", errContextChanged, candidate.Name)
		}
		clusters[ctx.Cluster], users[ctx.AuthInfo] = true, true
		delete(config.Contexts, candidate.Name)
		if config.CurrentContext == candidate.Name {
			config.CurrentContext = ""
		}
	}
	for _, ctx := range config.Contexts {
		delete(clusters, ctx.Cluster)
		delete(users, ctx.AuthInfo)
	}
	for name := range clusters {
		delete(config.Clusters, name)
	}
	for name := range users {
		delete(config.AuthInfos, name)
	}
	return nil
}

// writeConfigTemp creates a unique file with mode 0600 beside the selected config.
func writeConfigTemp(pattern string, content []byte) (string, error) {
	file, err := os.CreateTemp(filepath.Dir(pattern), filepath.Base(pattern))
	if err != nil {
		return "", fmt.Errorf("create kubeconfig file: %w", err)
	}
	_, writeErr := file.Write(content)
	closeErr := file.Close()
	if err := errors.Join(writeErr, closeErr); err != nil {
		return "", fmt.Errorf("write kubeconfig file %s: %w", file.Name(), errors.Join(err, os.Remove(file.Name())))
	}
	return file.Name(), nil
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
