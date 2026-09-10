package az_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"altinn.studio/runtime-health/internal/az"
)

func TestEnsureCredentialsUsesDefaultDestination(t *testing.T) {
	argumentsFile := installFakeAzureCLI(t)
	cluster := testCluster()

	if err := az.EnsureCredentials(&cluster, ""); err != nil {
		t.Fatalf("EnsureCredentials() error = %v", err)
	}

	want := strings.Join([]string{
		"aks", "get-credentials",
		"--resource-group", "test-resource-group",
		"--name", "test-cluster",
		"--overwrite-existing",
		"--subscription", "test-subscription",
	}, "\n") + "\n"
	assertArguments(t, argumentsFile, want)
}

func TestEnsureCredentialsUsesCustomKubeconfig(t *testing.T) {
	argumentsFile := installFakeAzureCLI(t)
	cluster := testCluster()
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
	assertArguments(t, argumentsFile, want)
}

func installFakeAzureCLI(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	argumentsFile := filepath.Join(dir, "arguments")
	script := "#!/bin/sh\nprintf '%s\\n' \"$@\" > \"$AZ_ARGUMENTS_FILE\"\n"
	azPath := filepath.Join(dir, "az")
	if err := os.WriteFile(azPath, []byte(script), 0o700); err != nil {
		t.Fatalf("write fake az: %v", err)
	}
	t.Setenv("AZ_ARGUMENTS_FILE", argumentsFile)
	t.Setenv("PATH", dir+string(os.PathListSeparator)+os.Getenv("PATH"))
	return argumentsFile
}

func testCluster() az.Cluster {
	return az.Cluster{
		Name:           "test-cluster",
		ResourceGroup:  "test-resource-group",
		SubscriptionID: "test-subscription",
	}
}

func assertArguments(t *testing.T, path string, want string) {
	t.Helper()
	got, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read captured arguments: %v", err)
	}
	if string(got) != want {
		t.Fatalf("az arguments = %q, want %q", string(got), want)
	}
}
