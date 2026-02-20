package kubernetes

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	apiextensionsclientset "k8s.io/apiextensions-apiserver/pkg/client/clientset/clientset"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	utilyaml "k8s.io/apimachinery/pkg/util/yaml"
	"k8s.io/client-go/discovery"
	"k8s.io/client-go/discovery/cached/memory"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/restmapper"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"
	"sigs.k8s.io/kustomize/api/krusty"
	kustomizeTypes "sigs.k8s.io/kustomize/api/types"
	"sigs.k8s.io/kustomize/kyaml/filesys"
)

// Common GVRs for core Kubernetes resources
var (
	NamespaceGVR  = corev1.SchemeGroupVersion.WithResource("namespaces")
	DeploymentGVR = appsv1.SchemeGroupVersion.WithResource("deployments")
)

// KubernetesClient wraps client-go operations for a specific context
type KubernetesClient struct {
	clientset       *kubernetes.Clientset
	apiextClientset *apiextensionsclientset.Clientset
	dynamicClient   dynamic.Interface
	mapper          *restmapper.DeferredDiscoveryRESTMapper
	cachedDiscovery discovery.CachedDiscoveryInterface
}

// New creates a KubernetesClient for the specified kubectl context.
// The context name should be like "kind-runtime-fixture-kind-standard".
func New(contextName string) (*KubernetesClient, error) {
	kubeconfig := filepath.Join(homedir.HomeDir(), ".kube", "config")

	config, err := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(
		&clientcmd.ClientConfigLoadingRules{ExplicitPath: kubeconfig},
		&clientcmd.ConfigOverrides{CurrentContext: contextName},
	).ClientConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to load config for context %s: %w", contextName, err)
	}

	return newFromConfig(config)
}

func newFromConfig(config *rest.Config) (*KubernetesClient, error) {
	// Increase rate limits for faster reconciliation loops
	config.QPS = 50
	config.Burst = 100

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create clientset: %w", err)
	}

	apiextClientset, err := apiextensionsclientset.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create apiextensions clientset: %w", err)
	}

	dynamicClient, err := dynamic.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create dynamic client: %w", err)
	}

	discoveryClient, err := discovery.NewDiscoveryClientForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create discovery client: %w", err)
	}
	cachedDiscovery := memory.NewMemCacheClient(discoveryClient)
	mapper := restmapper.NewDeferredDiscoveryRESTMapper(cachedDiscovery)

	return &KubernetesClient{
		clientset:       clientset,
		apiextClientset: apiextClientset,
		dynamicClient:   dynamicClient,
		mapper:          mapper,
		cachedDiscovery: cachedDiscovery,
	}, nil
}

// applyUnstructured applies a single unstructured object using Server-Side Apply.
func (c *KubernetesClient) applyUnstructured(ctx context.Context, obj *unstructured.Unstructured) (string, error) {
	gvk := obj.GroupVersionKind()
	mapping, err := c.mapper.RESTMapping(gvk.GroupKind(), gvk.Version)
	if meta.IsNoMatchError(err) {
		// CRD may have just been installed - reset discovery cache and retry
		c.mapper.Reset()
		mapping, err = c.mapper.RESTMapping(gvk.GroupKind(), gvk.Version)
	}
	if err != nil {
		return "", fmt.Errorf("failed to get REST mapping for %v: %s: %w", gvk, obj.GetName(), err)
	}

	data, err := json.Marshal(obj.Object)
	if err != nil {
		return "", fmt.Errorf("failed to marshal object %s: %w", obj.GetName(), err)
	}

	var dr dynamic.ResourceInterface
	if mapping.Scope.Name() == meta.RESTScopeNameNamespace {
		ns := obj.GetNamespace()
		if ns == "" {
			ns = "default"
		}
		dr = c.dynamicClient.Resource(mapping.Resource).Namespace(ns)
	} else {
		dr = c.dynamicClient.Resource(mapping.Resource)
	}

	_, err = dr.Patch(ctx, obj.GetName(), types.ApplyPatchType, data,
		metav1.PatchOptions{FieldManager: "runtime-fixture"})
	if err != nil {
		return "", fmt.Errorf("failed to apply %s/%s: %w", gvk.Kind, obj.GetName(), err)
	}
	return fmt.Sprintf("%s/%s configured", strings.ToLower(gvk.Kind), obj.GetName()), nil
}

// ApplyManifest applies Kubernetes manifest YAML content using Server-Side Apply.
// This function is idempotent - it can be called multiple times safely.
func (c *KubernetesClient) ApplyManifest(yamlContent string) (string, error) {
	ctx := context.Background()
	decoder := utilyaml.NewYAMLOrJSONDecoder(strings.NewReader(yamlContent), 4096)
	var results []string

	for {
		var rawObj unstructured.Unstructured
		if err := decoder.Decode(&rawObj); err != nil {
			if err == io.EOF {
				break
			}
			return "", fmt.Errorf("failed to decode YAML: %w", err)
		}

		if len(rawObj.Object) == 0 {
			continue
		}

		result, err := c.applyUnstructured(ctx, &rawObj)
		if err != nil {
			return "", err
		}
		results = append(results, result)
	}
	return strings.Join(results, "\n"), nil
}

// ApplyObjects applies typed Kubernetes objects using Server-Side Apply.
// This function is idempotent - it can be called multiple times safely.
func (c *KubernetesClient) ApplyObjects(objs ...runtime.Object) (string, error) {
	ctx := context.Background()
	var results []string

	for _, obj := range objs {
		var u *unstructured.Unstructured

		if existing, ok := obj.(*unstructured.Unstructured); ok {
			u = existing
		} else {
			content, err := runtime.DefaultUnstructuredConverter.ToUnstructured(obj)
			if err != nil {
				return "", fmt.Errorf("failed to convert object to unstructured: %w", err)
			}
			u = &unstructured.Unstructured{Object: content}
		}

		result, err := c.applyUnstructured(ctx, u)
		if err != nil {
			return "", err
		}
		results = append(results, result)
	}
	return strings.Join(results, "\n"), nil
}

// Get checks if a Kubernetes resource exists.
// Returns nil if the resource exists, error otherwise.
func (c *KubernetesClient) Get(gvr schema.GroupVersionResource, name, namespace string) error {
	ctx := context.Background()

	var dr dynamic.ResourceInterface
	if namespace != "" {
		dr = c.dynamicClient.Resource(gvr).Namespace(namespace)
	} else {
		dr = c.dynamicClient.Resource(gvr)
	}

	_, err := dr.Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("failed to get %s/%s: %w", gvr.Resource, name, err)
	}
	return nil
}

// CRDExists checks if a CustomResourceDefinition exists in the cluster.
// Returns true if the CRD exists, false otherwise.
func (c *KubernetesClient) CRDExists(crdName string) (bool, error) {
	_, err := c.apiextClientset.ApiextensionsV1().CustomResourceDefinitions().Get(
		context.Background(), crdName, metav1.GetOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			return false, nil
		}
		return false, fmt.Errorf("failed to check CRD existence: %w", err)
	}
	return true, nil
}

// RolloutStatus waits for a deployment rollout to complete using a watch.
// Returns an error if the rollout fails or times out.
func (c *KubernetesClient) RolloutStatus(deployment, namespace string, timeout time.Duration) error {
	ctx := context.Background()
	if timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, timeout)
		defer cancel()
	}

	dep, err := c.clientset.AppsV1().Deployments(namespace).Get(ctx, deployment, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("failed to get deployment %s: %w", deployment, err)
	}

	if isRolloutComplete(dep) {
		return nil
	}

	watcher, err := c.clientset.AppsV1().Deployments(namespace).Watch(ctx, metav1.ListOptions{
		FieldSelector:   fmt.Sprintf("metadata.name=%s", deployment),
		ResourceVersion: dep.ResourceVersion,
	})
	if err != nil {
		return fmt.Errorf("failed to watch deployment %s: %w", deployment, err)
	}
	defer watcher.Stop()

	for {
		select {
		case <-ctx.Done():
			return fmt.Errorf("timeout waiting for deployment %s", deployment)
		case event, ok := <-watcher.ResultChan():
			if !ok {
				return fmt.Errorf("watch channel closed for deployment %s", deployment)
			}

			dep, ok := event.Object.(*appsv1.Deployment)
			if !ok {
				continue
			}

			if isRolloutComplete(dep) {
				return nil
			}
		}
	}
}

func isRolloutComplete(dep *appsv1.Deployment) bool {
	replicas := int32(1)
	if dep.Spec.Replicas != nil {
		replicas = *dep.Spec.Replicas
	}
	return dep.Status.ObservedGeneration >= dep.Generation &&
		dep.Status.UpdatedReplicas == replicas &&
		dep.Status.AvailableReplicas == replicas &&
		dep.Status.UnavailableReplicas == 0
}

// WatchCondition watches a resource until a condition reaches the target status.
func (c *KubernetesClient) WatchCondition(ctx context.Context, gvr schema.GroupVersionResource, name, namespace, conditionType, targetStatus string) error {
	var dr dynamic.ResourceInterface
	if namespace != "" {
		dr = c.dynamicClient.Resource(gvr).Namespace(namespace)
	} else {
		dr = c.dynamicClient.Resource(gvr)
	}

	obj, err := dr.Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("failed to get %s/%s: %w", gvr.Resource, name, err)
	}

	if hasCondition(obj, conditionType, targetStatus) {
		return nil
	}

	watcher, err := dr.Watch(ctx, metav1.ListOptions{
		FieldSelector:   fmt.Sprintf("metadata.name=%s", name),
		ResourceVersion: obj.GetResourceVersion(),
	})
	if err != nil {
		return fmt.Errorf("failed to watch %s/%s: %w", gvr.Resource, name, err)
	}
	defer watcher.Stop()

	for {
		select {
		case <-ctx.Done():
			return fmt.Errorf("timeout waiting for %s/%s condition %s=%s", gvr.Resource, name, conditionType, targetStatus)
		case event, ok := <-watcher.ResultChan():
			if !ok {
				return fmt.Errorf("watch channel closed for %s/%s", gvr.Resource, name)
			}

			obj, ok := event.Object.(*unstructured.Unstructured)
			if !ok {
				continue
			}

			if hasCondition(obj, conditionType, targetStatus) {
				return nil
			}
		}
	}
}

func hasCondition(obj *unstructured.Unstructured, conditionType, targetStatus string) bool {
	conditions, found, _ := unstructured.NestedSlice(obj.Object, "status", "conditions")
	if !found {
		return false
	}
	for _, cond := range conditions {
		condMap, ok := cond.(map[string]any)
		if !ok {
			continue
		}
		if condMap["type"] == conditionType {
			if status, ok := condMap["status"].(string); ok && strings.EqualFold(status, targetStatus) {
				return true
			}
		}
	}
	return false
}

func (c *KubernetesClient) KustomizeRender(path string) (string, error) {
	fSys := filesys.MakeFsOnDisk()
	opts := krusty.MakeDefaultOptions()
	opts.LoadRestrictions = kustomizeTypes.LoadRestrictionsNone

	k := krusty.MakeKustomizer(opts)
	resMap, err := k.Run(fSys, path)
	if err != nil {
		return "", fmt.Errorf("failed rendering kustomization at %s: %w", path, err)
	}

	yamlBytes, err := resMap.AsYaml()
	if err != nil {
		return "", fmt.Errorf("failed to convert to YAML: %w", err)
	}
	return string(yamlBytes), nil
}

// LogOptions configures how logs should be collected
type LogOptions struct {
	Namespace     string
	LabelSelector string
	ContainerName string
	OutputPath    string
	SinceSeconds  int
	Prefix        bool
	IgnoreErrors  bool
}

// CollectLogs collects logs from pods matching the specified criteria.
// If OutputPath is specified, writes logs to that file.
// Logs are sorted by timestamp across all containers.
func (c *KubernetesClient) CollectLogs(opts LogOptions) error {
	ctx := context.Background()

	listOpts := metav1.ListOptions{}
	if opts.LabelSelector != "" {
		listOpts.LabelSelector = opts.LabelSelector
	}

	pods, err := c.clientset.CoreV1().Pods(opts.Namespace).List(ctx, listOpts)
	if err != nil {
		return fmt.Errorf("failed to list pods: %w", err)
	}

	type logLine struct {
		timestamp time.Time
		line      string
	}

	type logResult struct {
		lines []logLine
		err   error
	}

	var targets []struct{ pod, container string }
	for _, pod := range pods.Items {
		containers := pod.Spec.Containers
		if opts.ContainerName != "" {
			for _, container := range pod.Spec.Containers {
				if container.Name == opts.ContainerName {
					targets = append(targets, struct{ pod, container string }{pod.Name, container.Name})
					break
				}
			}
		} else {
			for _, container := range containers {
				targets = append(targets, struct{ pod, container string }{pod.Name, container.Name})
			}
		}
	}

	if len(targets) == 0 {
		return nil
	}

	resultCh := make(chan logResult, len(targets))

	for _, t := range targets {
		go func(podName, containerName string) {
			logOpts := &corev1.PodLogOptions{
				Container:  containerName,
				Timestamps: true,
			}
			if opts.SinceSeconds > 0 {
				sec := int64(opts.SinceSeconds)
				logOpts.SinceSeconds = &sec
			}

			req := c.clientset.CoreV1().Pods(opts.Namespace).GetLogs(podName, logOpts)
			stream, err := req.Stream(ctx)
			if err != nil {
				resultCh <- logResult{err: fmt.Errorf("failed to get logs for %s/%s: %w", podName, containerName, err)}
				return
			}
			defer func() { _ = stream.Close() }()

			data, _ := io.ReadAll(stream)
			rawLines := strings.Split(string(data), "\n")

			var lines []logLine
			prefix := ""
			if opts.Prefix {
				prefix = fmt.Sprintf("[%s/%s] ", podName, containerName)
			}

			for _, raw := range rawLines {
				if raw == "" {
					continue
				}
				// Parse timestamp prefix (RFC3339Nano format): 2024-01-02T15:04:05.999999999Z
				ts := time.Time{}
				content := raw
				if idx := strings.Index(raw, " "); idx > 0 && idx < 35 {
					if parsed, err := time.Parse(time.RFC3339Nano, raw[:idx]); err == nil {
						ts = parsed
						content = raw[idx+1:]
					}
				}
				lines = append(lines, logLine{
					timestamp: ts,
					line:      prefix + content,
				})
			}

			resultCh <- logResult{lines: lines}
		}(t.pod, t.container)
	}

	var allLines []logLine
	for range targets {
		r := <-resultCh
		if r.err != nil && !opts.IgnoreErrors {
			return r.err
		}
		allLines = append(allLines, r.lines...)
	}

	sort.Slice(allLines, func(i, j int) bool {
		return allLines[i].timestamp.Before(allLines[j].timestamp)
	})

	var allLogs strings.Builder
	for _, l := range allLines {
		allLogs.WriteString(l.line)
		allLogs.WriteByte('\n')
	}

	if opts.OutputPath != "" {
		if err := os.WriteFile(opts.OutputPath, []byte(allLogs.String()), 0644); err != nil {
			return fmt.Errorf("failed to write logs to file: %w", err)
		}
	}

	return nil
}

// Annotate sets or updates an annotation on a Kubernetes resource
func (c *KubernetesClient) Annotate(gvr schema.GroupVersionResource, name, namespace, key, value string) error {
	ctx := context.Background()

	patch := map[string]any{
		"metadata": map[string]any{
			"annotations": map[string]string{
				key: value,
			},
		},
	}

	patchData, err := json.Marshal(patch)
	if err != nil {
		return fmt.Errorf("failed to marshal patch: %w", err)
	}

	var dr dynamic.ResourceInterface
	if namespace != "" {
		dr = c.dynamicClient.Resource(gvr).Namespace(namespace)
	} else {
		dr = c.dynamicClient.Resource(gvr)
	}

	_, err = dr.Patch(ctx, name, types.MergePatchType, patchData, metav1.PatchOptions{})
	if err != nil {
		return fmt.Errorf("failed to annotate %s/%s: %w", gvr.Resource, name, err)
	}
	return nil
}

// GetConditionStatus returns the status value of a condition on a resource.
// Returns empty string if condition not found.
func (c *KubernetesClient) GetConditionStatus(gvr schema.GroupVersionResource, name, namespace, conditionType string) (string, error) {
	ctx := context.Background()

	var dr dynamic.ResourceInterface
	if namespace != "" {
		dr = c.dynamicClient.Resource(gvr).Namespace(namespace)
	} else {
		dr = c.dynamicClient.Resource(gvr)
	}

	obj, err := dr.Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to get resource: %w", err)
	}

	conditions, found, err := unstructured.NestedSlice(obj.Object, "status", "conditions")
	if err != nil || !found {
		return "", nil
	}

	for _, cond := range conditions {
		condMap, ok := cond.(map[string]any)
		if !ok {
			continue
		}
		if condMap["type"] == conditionType {
			if status, ok := condMap["status"].(string); ok {
				return status, nil
			}
		}
	}

	return "", nil
}

// GetFieldString returns a string field value from a resource at the given path.
func (c *KubernetesClient) GetFieldString(gvr schema.GroupVersionResource, name, namespace string, fields ...string) (string, error) {
	ctx := context.Background()

	var dr dynamic.ResourceInterface
	if namespace != "" {
		dr = c.dynamicClient.Resource(gvr).Namespace(namespace)
	} else {
		dr = c.dynamicClient.Resource(gvr)
	}

	obj, err := dr.Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to get resource: %w", err)
	}

	val, found, err := unstructured.NestedString(obj.Object, fields...)
	if err != nil || !found {
		return "", err
	}

	return val, nil
}

// SourceRef holds reference to a Flux source
type SourceRef struct {
	Kind      string
	Name      string
	Namespace string
}

// GetSourceRef returns the sourceRef from a HelmRelease or Kustomization resource
func (c *KubernetesClient) GetSourceRef(gvr schema.GroupVersionResource, name, namespace string) (*SourceRef, error) {
	ctx := context.Background()

	var dr dynamic.ResourceInterface
	if namespace != "" {
		dr = c.dynamicClient.Resource(gvr).Namespace(namespace)
	} else {
		dr = c.dynamicClient.Resource(gvr)
	}

	obj, err := dr.Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get resource: %w", err)
	}

	// HelmRelease uses .spec.chart.spec.sourceRef
	// Kustomization uses .spec.sourceRef
	var sourceRef map[string]any
	if strings.Contains(gvr.Resource, "helmrelease") {
		chart, found, _ := unstructured.NestedMap(obj.Object, "spec", "chart", "spec")
		if found {
			sourceRef, _, _ = unstructured.NestedMap(chart, "sourceRef")
		}
	} else {
		sourceRef, _, _ = unstructured.NestedMap(obj.Object, "spec", "sourceRef")
	}

	if sourceRef == nil {
		return nil, fmt.Errorf("sourceRef not found in %s/%s", gvr.Resource, name)
	}

	ref := &SourceRef{
		Kind:      getString(sourceRef, "kind"),
		Name:      getString(sourceRef, "name"),
		Namespace: getString(sourceRef, "namespace"),
	}

	if ref.Namespace == "" {
		ref.Namespace = namespace
	}

	return ref, nil
}

func getString(m map[string]any, key string) string {
	if v, ok := m[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

// StreamLogOptions configures streaming logs
type StreamLogOptions struct {
	Namespace     string
	LabelSelector string
	ContainerName string
}

// StreamLogs streams logs from pods matching the specified criteria.
// Returns a reader that combines output from all matching containers.
// The caller must close the returned reader when done.
func (c *KubernetesClient) StreamLogs(ctx context.Context, opts StreamLogOptions) (io.ReadCloser, error) {
	listOpts := metav1.ListOptions{}
	if opts.LabelSelector != "" {
		listOpts.LabelSelector = opts.LabelSelector
	}

	pods, err := c.clientset.CoreV1().Pods(opts.Namespace).List(ctx, listOpts)
	if err != nil {
		return nil, fmt.Errorf("failed to list pods: %w", err)
	}

	var targets []struct{ pod, container string }
	for _, pod := range pods.Items {
		if opts.ContainerName != "" {
			for _, container := range pod.Spec.Containers {
				if container.Name == opts.ContainerName {
					targets = append(targets, struct{ pod, container string }{pod.Name, container.Name})
					break
				}
			}
		} else {
			for _, container := range pod.Spec.Containers {
				targets = append(targets, struct{ pod, container string }{pod.Name, container.Name})
			}
		}
	}

	if len(targets) == 0 {
		return io.NopCloser(strings.NewReader("")), nil
	}

	pr, pw := io.Pipe()
	var wg sync.WaitGroup

	for _, t := range targets {
		wg.Add(1)
		go func(podName, containerName string) {
			defer wg.Done()

			logOpts := &corev1.PodLogOptions{
				Container: containerName,
				Follow:    true,
			}

			req := c.clientset.CoreV1().Pods(opts.Namespace).GetLogs(podName, logOpts)
			stream, err := req.Stream(ctx)
			if err != nil {
				return
			}
			defer func() { _ = stream.Close() }()

			prefix := fmt.Sprintf("[%s/%s] ", podName, containerName)
			scanner := bufio.NewScanner(stream)
			for scanner.Scan() {
				line := prefix + scanner.Text() + "\n"
				if _, err := pw.Write([]byte(line)); err != nil {
					return
				}
			}
		}(t.pod, t.container)
	}

	go func() {
		wg.Wait()
		_ = pw.Close()
	}()

	return pr, nil
}
