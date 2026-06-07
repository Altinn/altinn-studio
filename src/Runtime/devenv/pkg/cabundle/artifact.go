package cabundle

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"altinn.studio/devenv/pkg/kubernetes"
	"altinn.studio/devenv/pkg/resource"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	k8sruntime "k8s.io/apimachinery/pkg/runtime"
	utilyaml "k8s.io/apimachinery/pkg/util/yaml"
	"sigs.k8s.io/yaml"
)

const (
	artifactFilePerm         = 0o600
	caBundleDigestAnnotation = "altinn.studio/devenv-ca-bundle-digest"
	defaultNamespace         = "default"
	yamlDecoderBufferSize    = 4096
)

// KubernetesWorkload identifies a Kubernetes Deployment/container that should receive the CA bundle.
type KubernetesWorkload struct {
	Deployment string
	Namespace  string
	Container  string
}

// PreparedArtifact is an artifact path prepared for resource graph publication.
type PreparedArtifact struct {
	cleanup func() error
	Path    string
}

// PrepareKubernetesArtifact copies and patches a Kubernetes artifact directory with CA bundle mounts/env.
func PrepareKubernetesArtifact(
	artifactPath string,
	bundle *Bundle,
	workloads []KubernetesWorkload,
) (*PreparedArtifact, error) {
	if bundle == nil || len(workloads) == 0 {
		return &PreparedArtifact{Path: artifactPath}, nil
	}

	info, err := os.Stat(artifactPath)
	if err != nil {
		return nil, fmt.Errorf("stat artifact path: %w", err)
	}
	if !info.IsDir() {
		return &PreparedArtifact{Path: artifactPath}, nil
	}

	tmpDir, err := os.MkdirTemp("", "devenv-ca-artifact-*")
	if err != nil {
		return nil, fmt.Errorf("create temporary CA artifact directory: %w", err)
	}
	cleanup := func() error {
		if removeErr := os.RemoveAll(tmpDir); removeErr != nil {
			return fmt.Errorf("remove temporary CA artifact directory %s: %w", tmpDir, removeErr)
		}
		return nil
	}

	patchedPath := filepath.Join(tmpDir, filepath.Base(artifactPath))
	if copyErr := copyDirectory(artifactPath, patchedPath); copyErr != nil {
		cleanupPreparedArtifact(cleanup)
		return nil, copyErr
	}
	patched, err := patchCABundleArtifactFiles(patchedPath, bundle, workloads)
	if err != nil {
		cleanupPreparedArtifact(cleanup)
		return nil, err
	}
	if !patched {
		cleanupPreparedArtifact(cleanup)
		return &PreparedArtifact{Path: artifactPath}, nil
	}

	return &PreparedArtifact{Path: patchedPath, cleanup: cleanup}, nil
}

// Cleanup removes temporary files created for the prepared artifact.
func (p *PreparedArtifact) Cleanup() error {
	if p == nil || p.cleanup == nil {
		return nil
	}
	return p.cleanup()
}

// KubernetesConfigMapObjectSet returns a ConfigMap object set for CA-aware workloads.
func KubernetesConfigMapObjectSet(
	bundle *Bundle,
	cluster resource.ResourceRef,
	name string,
	workloads []KubernetesWorkload,
	deps []resource.ResourceRef,
) (*resource.KubernetesObjectSet, bool, error) {
	if bundle == nil || len(workloads) == 0 {
		return nil, false, nil
	}
	manifest, err := kubernetesConfigMaps(bundle, workloads)
	if err != nil {
		return nil, false, err
	}
	if manifest == "" {
		return nil, false, nil
	}
	return &resource.KubernetesObjectSet{
		Name:      name,
		Cluster:   cluster,
		Manifest:  manifest,
		DependsOn: deps,
	}, true, nil
}

func copyDirectory(src, dst string) error {
	err := filepath.WalkDir(src, func(path string, entry os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return fmt.Errorf("resolve relative artifact path: %w", err)
		}
		target := filepath.Join(dst, rel)
		if entry.IsDir() {
			info, err := entry.Info()
			if err != nil {
				return fmt.Errorf("stat artifact directory %s: %w", path, err)
			}
			if err := os.MkdirAll(target, info.Mode().Perm()); err != nil {
				return fmt.Errorf("create artifact directory %s: %w", target, err)
			}
			return nil
		}
		if entry.Type()&os.ModeType != 0 {
			return nil
		}
		return copyFile(path, target)
	})
	if err != nil {
		return fmt.Errorf("copy artifact directory %s: %w", src, err)
	}
	return nil
}

func copyFile(src, dst string) error {
	//nolint:gosec // Artifact paths are resolved from configured fixture inputs.
	source, err := os.Open(src)
	if err != nil {
		return fmt.Errorf("open artifact file %s: %w", src, err)
	}
	defer closeFileBestEffort(source)

	info, err := source.Stat()
	if err != nil {
		return fmt.Errorf("stat artifact file %s: %w", src, err)
	}
	//nolint:gosec // Artifact paths are resolved from configured fixture inputs.
	target, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, info.Mode().Perm())
	if err != nil {
		return fmt.Errorf("create artifact file %s: %w", dst, err)
	}
	defer closeFileBestEffort(target)

	if _, err := io.Copy(target, source); err != nil {
		return fmt.Errorf("copy artifact file %s: %w", src, err)
	}
	return nil
}

func cleanupPreparedArtifact(cleanup func() error) {
	if err := cleanup(); err != nil {
		return
	}
}

func closeFileBestEffort(file *os.File) {
	if err := file.Close(); err != nil {
		return
	}
}

func patchCABundleArtifactFiles(
	root string,
	bundle *Bundle,
	workloads []KubernetesWorkload,
) (bool, error) {
	patchedAny := false
	err := filepath.WalkDir(root, func(path string, entry os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if entry.IsDir() || !isPatchableYAMLPath(path) {
			return nil
		}
		patched, err := patchCABundleArtifactFile(path, bundle, workloads)
		if err != nil {
			return err
		}
		patchedAny = patchedAny || patched
		return nil
	})
	if err != nil {
		return false, fmt.Errorf("patch CA bundle artifact files in %s: %w", root, err)
	}
	return patchedAny, nil
}

func isYAMLPath(path string) bool {
	ext := strings.ToLower(filepath.Ext(path))
	return ext == ".yaml" || ext == ".yml"
}

func isPatchableYAMLPath(path string) bool {
	if !isYAMLPath(path) {
		return false
	}
	name := strings.ToLower(filepath.Base(path))
	return name != "kustomization.yaml" && name != "kustomization.yml"
}

func patchCABundleArtifactFile(
	path string,
	bundle *Bundle,
	workloads []KubernetesWorkload,
) (bool, error) {
	//nolint:gosec // Artifact manifest paths are resolved from configured fixture inputs.
	data, err := os.ReadFile(path)
	if err != nil {
		return false, fmt.Errorf("read artifact manifest %s: %w", path, err)
	}
	decoder := utilyaml.NewYAMLOrJSONDecoder(bytes.NewReader(data), yamlDecoderBufferSize)
	var objects []*unstructured.Unstructured
	patched := false

	for {
		var document map[string]any
		if err := decoder.Decode(&document); err != nil {
			if errors.Is(err, io.EOF) {
				break
			}
			return false, fmt.Errorf("decode artifact manifest %s: %w", path, err)
		}
		if len(document) == 0 {
			continue
		}
		obj := unstructured.Unstructured{Object: document}
		objectPatched, err := patchDeploymentObjectCABundle(&obj, bundle, workloads)
		if err != nil {
			return false, fmt.Errorf("patch artifact deployment %s: %w", path, err)
		}
		if objectPatched {
			patched = true
		}
		objects = append(objects, &obj)
	}
	if !patched {
		return false, nil
	}

	var output strings.Builder
	for i, obj := range objects {
		if i > 0 {
			output.WriteString("---\n")
		}
		doc, err := yaml.Marshal(obj.Object)
		if err != nil {
			return false, fmt.Errorf("marshal patched artifact manifest %s: %w", path, err)
		}
		output.Write(doc)
	}
	if err := os.WriteFile(path, []byte(output.String()), artifactFilePerm); err != nil {
		return false, fmt.Errorf("write patched artifact manifest %s: %w", path, err)
	}
	return true, nil
}

func patchDeploymentObjectCABundle(
	obj *unstructured.Unstructured,
	bundle *Bundle,
	workloads []KubernetesWorkload,
) (bool, error) {
	if obj.GetKind() != "Deployment" {
		return false, nil
	}

	containers, found, err := unstructured.NestedSlice(obj.Object, "spec", "template", "spec", "containers")
	if err != nil {
		return false, fmt.Errorf("read deployment containers: %w", err)
	}
	if !found {
		return false, nil
	}

	patched := false
	for i, containerValue := range containers {
		container, ok := containerValue.(map[string]any)
		if !ok {
			continue
		}
		name, ok := container["name"].(string)
		if !ok || !shouldPatchContainer(obj.GetName(), name, workloads) {
			continue
		}
		env, found, err := unstructured.NestedSlice(container, "env")
		if err != nil || !found {
			env = []any{}
		}
		container["env"] = ApplyKubernetesEnv(env)

		mounts, found, err := unstructured.NestedSlice(container, "volumeMounts")
		if err != nil || !found {
			mounts = []any{}
		}
		container["volumeMounts"] = ApplyKubernetesVolumeMount(
			mounts,
			KubernetesVolumeName,
			KubernetesConfigMapKey,
		)
		containers[i] = container
		patched = true
	}

	if !patched {
		return false, nil
	}

	if err := unstructured.SetNestedSlice(
		obj.Object,
		containers,
		"spec",
		"template",
		"spec",
		"containers",
	); err != nil {
		return false, fmt.Errorf("set deployment containers: %w", err)
	}
	if err := patchCABundleObjectVolume(obj); err != nil {
		return false, err
	}
	if err := patchCABundleObjectAnnotation(obj, bundle.Digest); err != nil {
		return false, err
	}
	return true, nil
}

func shouldPatchContainer(deployment, container string, workloads []KubernetesWorkload) bool {
	for _, workload := range workloads {
		if workload.Deployment != "" && workload.Deployment != deployment {
			continue
		}
		targetContainer := workload.Container
		if targetContainer == "" {
			targetContainer = workload.Deployment
		}
		if targetContainer == container {
			return true
		}
	}
	return false
}

func patchCABundleObjectVolume(obj *unstructured.Unstructured) error {
	volumes, found, err := unstructured.NestedSlice(obj.Object, "spec", "template", "spec", "volumes")
	if err != nil || !found {
		volumes = []any{}
	}

	out := make([]any, 0, len(volumes)+1)
	for _, volume := range volumes {
		volumeMap, ok := volume.(map[string]any)
		if !ok || volumeMap["name"] != KubernetesVolumeName {
			out = append(out, volume)
		}
	}
	out = append(out, KubernetesConfigMapVolume(
		KubernetesVolumeName,
		KubernetesConfigMapName,
		KubernetesConfigMapKey,
	))

	if err := unstructured.SetNestedSlice(obj.Object, out, "spec", "template", "spec", "volumes"); err != nil {
		return fmt.Errorf("set deployment CA volume: %w", err)
	}
	return nil
}

func patchCABundleObjectAnnotation(obj *unstructured.Unstructured, digest string) error {
	annotations, found, err := unstructured.NestedStringMap(obj.Object, "spec", "template", "metadata", "annotations")
	if err != nil || !found {
		annotations = map[string]string{}
	}
	annotations[caBundleDigestAnnotation] = digest
	if err := unstructured.SetNestedStringMap(
		obj.Object,
		annotations,
		"spec",
		"template",
		"metadata",
		"annotations",
	); err != nil {
		return fmt.Errorf("set deployment CA annotation: %w", err)
	}
	return nil
}

func kubernetesConfigMaps(bundle *Bundle, workloads []KubernetesWorkload) (string, error) {
	seen := map[string]bool{}
	objects := make([]k8sruntime.Object, 0)
	for _, workload := range workloads {
		namespace := namespaceOrDefault(workload.Namespace)
		if seen[namespace] {
			continue
		}
		seen[namespace] = true
		objects = append(objects, &corev1.Namespace{
			TypeMeta: metav1.TypeMeta{
				APIVersion: "v1",
				Kind:       "Namespace",
			},
			ObjectMeta: metav1.ObjectMeta{
				Name: namespace,
			},
		})
		objects = append(objects, &corev1.ConfigMap{
			TypeMeta: metav1.TypeMeta{
				APIVersion: "v1",
				Kind:       "ConfigMap",
			},
			ObjectMeta: metav1.ObjectMeta{
				Name:      KubernetesConfigMapName,
				Namespace: namespace,
				Annotations: map[string]string{
					caBundleDigestAnnotation: bundle.Digest,
				},
			},
			Data: map[string]string{
				KubernetesConfigMapKey: string(bundle.Data),
			},
		})
	}
	manifest, err := kubernetes.ObjectsManifest(objects)
	if err != nil {
		return "", fmt.Errorf("render CA bundle ConfigMaps: %w", err)
	}
	return manifest, nil
}

func namespaceOrDefault(namespace string) string {
	if namespace == "" {
		return defaultNamespace
	}
	return namespace
}
