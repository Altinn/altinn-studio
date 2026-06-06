package harness

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"altinn.studio/devenv/pkg/cabundle"
	"altinn.studio/devenv/pkg/runtimes/kind"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	utilyaml "k8s.io/apimachinery/pkg/util/yaml"
	"sigs.k8s.io/yaml"
)

const (
	artifactFilePerm         = 0o600
	caBundleDigestAnnotation = "altinn.studio/devenv-ca-bundle-digest"
	defaultNamespace         = "default"
	yamlDecoderBufferSize    = 4096
)

func configureCABundleForRollouts(runtime *kind.KindContainerRuntime, rollouts []Rollout) error {
	bundle, configured, err := cabundle.FromEnv()
	if err != nil {
		return fmt.Errorf("resolve CA bundle: %w", err)
	}
	if !configured {
		return nil
	}

	for _, rollout := range rollouts {
		if !rollout.MountCABundle {
			continue
		}
		namespace := rollout.Namespace
		if namespace == "" {
			namespace = defaultNamespace
		}
		if err := applyCABundleConfigMap(runtime, bundle, namespace); err != nil {
			return err
		}
		if err := patchDeploymentCABundle(runtime, bundle, rollout); err != nil {
			return err
		}
	}
	return nil
}

func applyCABundleConfigMapsForRollouts(runtime *kind.KindContainerRuntime, rollouts []Rollout) error {
	bundle, configured, err := cabundle.FromEnv()
	if err != nil {
		return fmt.Errorf("resolve CA bundle: %w", err)
	}
	if !configured {
		return nil
	}

	seen := map[string]bool{}
	for _, rollout := range rollouts {
		if !rollout.MountCABundle {
			continue
		}
		namespace := rollout.Namespace
		if namespace == "" {
			namespace = defaultNamespace
		}
		if seen[namespace] {
			continue
		}
		if err := applyCABundleConfigMap(runtime, bundle, namespace); err != nil {
			return err
		}
		seen[namespace] = true
	}
	return nil
}

func applyCABundleConfigMap(runtime *kind.KindContainerRuntime, bundle *cabundle.Bundle, namespace string) error {
	configMap := &corev1.ConfigMap{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "v1",
			Kind:       "ConfigMap",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      cabundle.KubernetesConfigMapName,
			Namespace: namespace,
			Annotations: map[string]string{
				caBundleDigestAnnotation: bundle.Digest,
			},
		},
		Data: map[string]string{
			cabundle.KubernetesConfigMapKey: string(bundle.Data),
		},
	}

	if _, err := runtime.KubernetesClient.ApplyObjects(context.Background(), configMap); err != nil {
		return fmt.Errorf("apply CA bundle ConfigMap in namespace %s: %w", namespace, err)
	}
	return nil
}

func patchDeploymentCABundle(runtime *kind.KindContainerRuntime, bundle *cabundle.Bundle, rollout Rollout) error {
	patch, err := deploymentCABundlePatch(bundle, rollout)
	if err != nil {
		return err
	}
	namespace := rollout.Namespace
	if namespace == "" {
		namespace = defaultNamespace
	}
	if err := runtime.KubernetesClient.PatchDeployment(
		context.Background(),
		rollout.Deployment,
		namespace,
		patch,
	); err != nil {
		return fmt.Errorf("patch CA bundle into rollout deployment %s/%s: %w", namespace, rollout.Deployment, err)
	}
	return nil
}

func deploymentCABundlePatch(bundle *cabundle.Bundle, rollout Rollout) ([]byte, error) {
	containerName := rollout.Container
	if containerName == "" {
		containerName = rollout.Deployment
	}

	patch := map[string]any{
		"spec": map[string]any{
			"template": map[string]any{
				"metadata": map[string]any{
					"annotations": map[string]any{
						caBundleDigestAnnotation: bundle.Digest,
					},
				},
				"spec": map[string]any{
					"volumes": []any{
						cabundle.KubernetesConfigMapVolume(
							cabundle.KubernetesVolumeName,
							cabundle.KubernetesConfigMapName,
							cabundle.KubernetesConfigMapKey,
						),
					},
					"containers": []any{
						map[string]any{
							"name": containerName,
							"env":  cabundle.ApplyKubernetesEnv(nil),
							"volumeMounts": cabundle.ApplyKubernetesVolumeMount(
								nil,
								cabundle.KubernetesVolumeName,
								cabundle.KubernetesConfigMapKey,
							),
						},
					},
				},
			},
		},
	}

	data, err := json.Marshal(patch)
	if err != nil {
		return nil, fmt.Errorf("marshal CA bundle deployment patch: %w", err)
	}
	return data, nil
}

func prepareCABundleArtifact(cfg Config, artPath string) (string, func(), error) {
	bundle, configured, err := cabundle.FromEnv()
	if err != nil {
		return "", nil, fmt.Errorf("resolve CA bundle: %w", err)
	}
	if !configured {
		return artPath, func() {}, nil
	}

	rollouts := caBundleRollouts(cfg.Deployments)
	if len(rollouts) == 0 {
		return artPath, func() {}, nil
	}

	info, err := os.Stat(artPath)
	if err != nil {
		return "", nil, fmt.Errorf("stat artifact path: %w", err)
	}
	if !info.IsDir() {
		return artPath, func() {}, nil
	}

	tmpDir, err := os.MkdirTemp("", "devenv-ca-artifact-*")
	if err != nil {
		return "", nil, fmt.Errorf("create temporary CA artifact directory: %w", err)
	}
	cleanup := func() {
		if removeErr := os.RemoveAll(tmpDir); removeErr != nil {
			writeStderrf("warning: failed to remove temporary CA artifact directory %s: %v\n", tmpDir, removeErr)
		}
	}

	patchedPath := filepath.Join(tmpDir, filepath.Base(artPath))
	if copyErr := copyDirectory(artPath, patchedPath); copyErr != nil {
		cleanup()
		return "", nil, copyErr
	}
	patched, err := patchCABundleArtifactFiles(patchedPath, bundle, rollouts)
	if err != nil {
		cleanup()
		return "", nil, err
	}
	if !patched {
		cleanup()
		return artPath, func() {}, nil
	}

	return patchedPath, cleanup, nil
}

func caBundleRollouts(deployments []Deployment) []Rollout {
	var rollouts []Rollout
	for _, deployment := range deployments {
		if deployment.Kustomize != nil {
			rollouts = appendCABundleRollouts(rollouts, deployment.Kustomize.Rollouts)
		}
		if deployment.Helm != nil {
			rollouts = appendCABundleRollouts(rollouts, deployment.Helm.Rollouts)
		}
	}
	return rollouts
}

func appendCABundleRollouts(dst []Rollout, rollouts []Rollout) []Rollout {
	for _, rollout := range rollouts {
		if rollout.MountCABundle {
			dst = append(dst, rollout)
		}
	}
	return dst
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
	defer func() {
		if closeErr := source.Close(); closeErr != nil {
			writeStderrf("warning: failed to close artifact file %s: %v\n", src, closeErr)
		}
	}()

	info, err := source.Stat()
	if err != nil {
		return fmt.Errorf("stat artifact file %s: %w", src, err)
	}
	//nolint:gosec // Artifact paths are resolved from configured fixture inputs.
	target, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, info.Mode().Perm())
	if err != nil {
		return fmt.Errorf("create artifact file %s: %w", dst, err)
	}
	defer func() {
		if closeErr := target.Close(); closeErr != nil {
			writeStderrf("warning: failed to close artifact file %s: %v\n", dst, closeErr)
		}
	}()

	if _, err := io.Copy(target, source); err != nil {
		return fmt.Errorf("copy artifact file %s: %w", src, err)
	}
	return nil
}

func patchCABundleArtifactFiles(root string, bundle *cabundle.Bundle, rollouts []Rollout) (bool, error) {
	patchedAny := false
	err := filepath.WalkDir(root, func(path string, entry os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if entry.IsDir() || !isPatchableYAMLPath(path) {
			return nil
		}
		patched, err := patchCABundleArtifactFile(path, bundle, rollouts)
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

func patchCABundleArtifactFile(path string, bundle *cabundle.Bundle, rollouts []Rollout) (bool, error) {
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
		objectPatched, err := patchDeploymentObjectCABundle(&obj, bundle, rollouts)
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
	bundle *cabundle.Bundle,
	rollouts []Rollout,
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
		if !ok || !shouldPatchContainer(name, rollouts) {
			continue
		}
		env, found, err := unstructured.NestedSlice(container, "env")
		if err != nil || !found {
			env = []any{}
		}
		container["env"] = cabundle.ApplyKubernetesEnv(env)

		mounts, found, err := unstructured.NestedSlice(container, "volumeMounts")
		if err != nil || !found {
			mounts = []any{}
		}
		container["volumeMounts"] = cabundle.ApplyKubernetesVolumeMount(
			mounts,
			cabundle.KubernetesVolumeName,
			cabundle.KubernetesConfigMapKey,
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

func shouldPatchContainer(name string, rollouts []Rollout) bool {
	for _, rollout := range rollouts {
		container := rollout.Container
		if container == "" {
			container = rollout.Deployment
		}
		if container == name {
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
		if !ok || volumeMap["name"] != cabundle.KubernetesVolumeName {
			out = append(out, volume)
		}
	}
	out = append(out, cabundle.KubernetesConfigMapVolume(
		cabundle.KubernetesVolumeName,
		cabundle.KubernetesConfigMapName,
		cabundle.KubernetesConfigMapKey,
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
