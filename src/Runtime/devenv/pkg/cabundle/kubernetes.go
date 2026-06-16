package cabundle

import "slices"

// ApplyKubernetesEnv returns env entries with CA variables pointing at ContainerPath.
func ApplyKubernetesEnv(env []any) []any {
	out := make([]any, 0, len(env)+len(envVars)+2)
	seen := map[string]bool{}
	for _, value := range env {
		envMap, ok := value.(map[string]any)
		name, nameOK := envMap["name"].(string)
		envValue, valueOK := envMap["value"].(string)
		if !ok || !nameOK || !isRuntimeCAEnvVar(name) {
			out = append(out, value)
			continue
		}
		if name != EnvVarsKey && valueOK && envValue == ContainerPath {
			if !seen[name] {
				out = append(out, value)
				seen[name] = true
			}
		}
	}
	for _, name := range runtimeEnvVars() {
		if seen[name] {
			continue
		}
		out = append(out, map[string]any{
			"name":  name,
			"value": ContainerPath,
		})
	}
	out = append(out, map[string]any{
		"name":  EnvVarsKey,
		"value": EnvVarCSV(),
	})
	return out
}

// ApplyKubernetesVolumeMount returns volume mounts with the CA mounted at ContainerPath.
func ApplyKubernetesVolumeMount(mounts []any, volumeName, subPath string) []any {
	out := make([]any, 0, len(mounts)+1)
	for _, mount := range mounts {
		mountMap, ok := mount.(map[string]any)
		if !ok || (mountMap["name"] != volumeName && mountMap["mountPath"] != ContainerPath) {
			out = append(out, mount)
		}
	}
	out = append(out, map[string]any{
		"name":      volumeName,
		"mountPath": ContainerPath,
		"subPath":   subPath,
		"readOnly":  true,
	})
	return out
}

// KubernetesConfigMapVolume returns a ConfigMap volume that exposes the CA bundle key.
func KubernetesConfigMapVolume(volumeName, configMapName, key string) map[string]any {
	return map[string]any{
		"name": volumeName,
		"configMap": map[string]any{
			"name": configMapName,
			"items": []any{
				map[string]any{
					"key":  key,
					"path": key,
				},
			},
		},
	}
}

func isManagedEnvVar(key string) bool {
	if key == EnvVarsKey {
		return true
	}
	return slices.Contains(envVars, key)
}

func isRuntimeCAEnvVar(key string) bool {
	return key == EnvStudioCABundle || isManagedEnvVar(key)
}
