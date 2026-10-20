package az_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"altinn.studio/runtime-health/internal/az"
)

func TestEnsureCredentialsUsesCustomKubeconfig(t *testing.T) {
	argumentsFile := installFakeAzureCLI(t)
	cluster := az.Cluster{
		Name:           "test-cluster",
		ResourceGroup:  "test-resource-group",
		SubscriptionID: "test-subscription",
	}
	kubeconfigPath := filepath.Join(t.TempDir(), "selected kubeconfig")

	if err := az.EnsureCredentials(&cluster, kubeconfigPath); err != nil {
		t.Fatalf("EnsureCredentials() error = %v", err)
	}

	want := strings.Join([]string{
		"aks", "get-credentials",
		"--resource-group", "test-resource-group",
		"--name", "test-cluster",
		"--overwrite-existing",
		"--file", kubeconfigPath,
		"--subscription", "test-subscription",
	}, "\n") + "\n"
	got, err := os.ReadFile(argumentsFile)
	if err != nil {
		t.Fatalf("read captured arguments: %v", err)
	}
	if string(got) != want {
		t.Fatalf("az arguments = %q, want %q", string(got), want)
	}
}

func TestListClustersRejectsInvalidDiscovery(t *testing.T) {
	for _, tc := range []struct {
		name     string
		response string
		exitCode string
	}{
		{name: "command failure", exitCode: "1"},
		{name: "malformed JSON", response: "not json"},
		{name: "missing data", response: "{}"},
		{name: "missing total count", response: `{"data":[],"count":0}`},
		{name: "inconsistent count", response: `{"data":[],"count":1,"total_records":1}`},
		{name: "truncated discovery", response: `{"data":[],"count":0,"total_records":1}`},
		{name: "missing cluster identity", response: `{"data":[{}],"count":1,"total_records":1}`},
		{name: "repeated token", response: `{"data":[],"count":0,"total_records":1,"skip_token":"same"}`},
	} {
		t.Run(tc.name, func(t *testing.T) {
			installFakeAzureCLI(t)
			t.Setenv("AZ_RESPONSE", tc.response)
			t.Setenv("AZ_EXIT", tc.exitCode)
			if clusters, err := az.ListClusters(); err == nil || clusters != nil {
				t.Fatalf("ListClusters() = %v, %v; expected an error and no partial inventory", clusters, err)
			}
		})
	}
}

func installFakeAzureCLI(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	argumentsFile := filepath.Join(dir, "arguments")
	script := `#!/bin/sh
printf '%s\n' "$@" > "$AZ_ARGUMENTS_FILE"
printf '%s\n' "$AZ_RESPONSE"
exit "${AZ_EXIT:-0}"
`
	azPath := filepath.Join(dir, "az")
	if err := os.WriteFile(azPath, []byte(script), 0o700); err != nil {
		t.Fatalf("write fake az: %v", err)
	}
	t.Setenv("AZ_ARGUMENTS_FILE", argumentsFile)
	t.Setenv("AZ_RESPONSE", "")
	t.Setenv("AZ_EXIT", "0")
	t.Setenv("PATH", dir+string(os.PathListSeparator)+os.Getenv("PATH"))
	return argumentsFile
}
