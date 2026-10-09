package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"k8s.io/client-go/tools/clientcmd"
)

const staleConfig = `apiVersion: v1
kind: Config
clusters:
- name: brg-tt02-aks
  cluster:
    server: https://example.test
users:
- name: clusterUser_altinnapps-brg-tt02-rg_brg-tt02-aks
  user:
    token: test
contexts:
- name: brg-tt02-aks
  context:
    cluster: brg-tt02-aks
    user: clusterUser_altinnapps-brg-tt02-rg_brg-tt02-aks
current-context: brg-tt02-aks
`

func TestInitReportsStaleContexts(t *testing.T) {
	path, calls := setupInit(t, staleConfig)
	output, err := invokeCommand(t, "", "init", "--kubeconfig", path, "tt02")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(output, "brg-tt02-aks") || !strings.Contains(output, "not found in Azure discovery") {
		t.Fatalf("missing stale context report:\n%s", output)
	}
	assertStaleConfig(t, path)
	if strings.Contains(readFile(t, calls), "get-credentials") {
		t.Fatal("unexpected credential fetch")
	}
}

func TestInitUpdateCredentials(t *testing.T) {
	for _, tc := range []struct {
		name      string
		input     string
		flags     []string
		wantFetch int
	}{
		{name: "default keeps existing credentials"},
		{name: "update refreshes selected owner", flags: []string{"--update", "-s", "brg"}, input: "y\n", wantFetch: 1},
		{name: "dry run", flags: []string{"--update", "--dry-run"}},
		{name: "declined", flags: []string{"--update"}, input: "n\n"},
		{name: "excluded owner", flags: []string{"--update", "--exclude-service-owner", "brg"}},
		{name: "other owner", flags: []string{"--update", "-s", "ttd"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			path, calls := setupInit(t, staleConfig)
			t.Setenv(
				"AZ_RESPONSE",
				`{"data":[{"name":"brg-tt02-aks","resourceGroup":"rg","subscriptionId":"sub"}],"count":1,"total_records":1}`,
			)
			args := append([]string{"--kubeconfig", path}, tc.flags...)
			output, err := invokeCommand(t, tc.input, "init", append(args, "tt02")...)
			if err != nil {
				t.Fatalf("init error: %v; output:\n%s", err, output)
			}
			commands := readFile(t, calls)
			if got := strings.Count(commands, "aks get-credentials"); got != tc.wantFetch {
				t.Fatalf("credential fetch count = %d, want %d; calls:\n%s", got, tc.wantFetch, commands)
			}
		})
	}
}

func TestInitRefreshesExistingCredentials(t *testing.T) {
	path, calls := setupInit(t, staleConfig)
	t.Setenv(
		"AZ_RESPONSE",
		`{"data":[{"name":"brg-tt02-aks","resourceGroup":"rg","subscriptionId":"sub"}],"count":1,"total_records":1}`,
	)
	output, err := invokeCommand(t, "y\n", "init", "--kubeconfig", path, "--update", "-s", "brg", "tt02")
	if err != nil {
		t.Fatalf("init error: %v; output:\n%s", err, output)
	}
	commands := readFile(t, calls)
	for _, want := range []string{"--name brg-tt02-aks", "--overwrite-existing", "--subscription sub", "--file " + path} {
		if !strings.Contains(commands, want) {
			t.Errorf("credential command missing %q", want)
		}
	}
	if !strings.Contains(output, "will refresh credentials and connection details") {
		t.Error("refresh not identified in preview")
	}
}

func TestInitPrunesConfirmedContexts(t *testing.T) {
	path, _ := setupInit(t, staleConfig)
	output, err := invokeCommand(t, "yes\n", "init", "--kubeconfig", path, "--prune", "tt02")
	if err != nil {
		t.Fatalf("init error: %v; output:\n%s", err, output)
	}
	config, err := clientcmd.LoadFromFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if len(config.Contexts)+len(config.Clusters)+len(config.AuthInfos) != 0 || config.CurrentContext != "" {
		t.Fatalf("stale entries remain: %#v", config)
	}
	backups, err := filepath.Glob(path + ".backup-*")
	if err != nil {
		t.Fatal(err)
	}
	if len(backups) != 1 {
		t.Fatalf("expected one backup, got %v", backups)
	}
	assertStaleConfig(t, backups[0])
	if !strings.Contains(output, "current-context will be cleared") {
		t.Fatalf("missing current-context notice:\n%s", output)
	}
}

func TestInitPreservesConfigWithoutPruning(t *testing.T) {
	for _, tc := range []struct {
		name      string
		input     string
		graphExit string
		flags     []string
		wantError bool
	}{
		{name: "declined", input: "n\n"},
		{name: "defaults to no", input: "\n"},
		{name: "dry run", flags: []string{"--dry-run"}},
		{name: "excluded", flags: []string{"--exclude-service-owner", "ttd, brg"}},
		{name: "other owner", flags: []string{"-s", "ttd"}},
		{name: "discovery failure", graphExit: "1", wantError: true},
		{name: "owner conflict", flags: []string{"-s", "brg", "--exclude-service-owner", "brg"}, wantError: true},
		{name: "invalid exclusion", flags: []string{"--exclude-service-owner", "ttd,,brg"}, wantError: true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			path, _ := setupInit(t, staleConfig)
			t.Setenv("AZ_GRAPH_EXIT", tc.graphExit)
			args := append([]string{"--kubeconfig", path, "--prune"}, tc.flags...)
			output, err := invokeCommand(t, tc.input, "init", append(args, "tt02")...)
			if (err != nil) != tc.wantError {
				t.Fatalf("error = %v, wantError = %v; output:\n%s", err, tc.wantError, output)
			}
			assertStaleConfig(t, path)
			backups, err := filepath.Glob(path + ".backup-*")
			if err != nil {
				t.Fatal(err)
			}
			if len(backups) != 0 {
				t.Fatal("unexpected backup without pruning")
			}
		})
	}
}

func TestInitDryRunAndExclusionsApplyToCredentialFetching(t *testing.T) {
	for _, flags := range [][]string{{"--dry-run"}, {"--exclude-service-owner", "ttd"}} {
		path, calls := setupInit(t, staleConfig)
		t.Setenv(
			"AZ_RESPONSE",
			`{"data":[{"name":"ttd-tt02-aks","resourceGroup":"rg","subscriptionId":"sub"}],"count":1,"total_records":1}`,
		)
		args := append([]string{"--kubeconfig", path}, flags...)
		output, err := invokeCommand(t, "", "init", append(args, "tt02")...)
		if err != nil {
			t.Fatalf("init error: %v; output:\n%s", err, output)
		}
		assertStaleConfig(t, path)
		if strings.Contains(readFile(t, calls), "get-credentials") {
			t.Fatal("unexpected credential fetch")
		}
	}
}

func TestInitFetchThenPrune(t *testing.T) {
	path, calls := setupInit(t, staleConfig)
	t.Setenv(
		"AZ_RESPONSE",
		`{"data":[{"name":"ttd-tt02-aks","resourceGroup":"rg","subscriptionId":"sub"}],"count":1,"total_records":1}`,
	)
	output, err := invokeCommand(t, "y\ny\n", "init", "--kubeconfig", path, "--prune", "tt02")
	if err != nil {
		t.Fatalf("init error: %v; output:\n%s", err, output)
	}
	if !strings.Contains(output, "Removed 1 context(s)") {
		t.Fatalf("pruning did not follow credential fetching:\n%s", output)
	}
	if !strings.Contains(readFile(t, calls), "--file "+path) {
		t.Fatal("credential fetching did not use selected kubeconfig")
	}
}

func TestInitPruneAccountScopes(t *testing.T) {
	for _, tc := range []struct {
		name    string
		removed string
		flags   []string
	}{
		{name: "dev", flags: []string{"-s", "ttd"}, removed: "ttd-tt02-aks"},
		{name: "prod", flags: []string{"--exclude-service-owner", "ttd"}, removed: "skd-tt02-aks"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			config, err := clientcmd.Load([]byte(staleConfig))
			if err != nil {
				t.Fatal(err)
			}
			for _, name := range []string{"ttd-tt02-aks", "skd-tt02-aks", "skd-prod-aks", "studio-tt02-aks", "local", "nav-tt02-aks"} {
				ctx := config.Contexts["brg-tt02-aks"].DeepCopy()
				ctx.Cluster = name
				ctx.AuthInfo = "clusterUser_altinnapps_" + name
				if name == "nav-tt02-aks" {
					ctx.AuthInfo = "unmanaged-user"
				}
				config.Contexts[name] = ctx
				config.Clusters[name] = config.Clusters["brg-tt02-aks"].DeepCopy()
				config.AuthInfos[ctx.AuthInfo] = config.AuthInfos[config.Contexts["brg-tt02-aks"].AuthInfo].DeepCopy()
			}
			data, err := clientcmd.Write(*config)
			if err != nil {
				t.Fatal(err)
			}
			path, _ := setupInit(t, string(data))
			t.Setenv(
				"AZ_RESPONSE",
				`{"data":[{"name":"brg-tt02-aks","resourceGroup":"rg","subscriptionId":"sub"}],"count":1,"total_records":1}`,
			)
			args := append([]string{"--prune", "--kubeconfig", path}, tc.flags...)
			output, err := invokeCommand(t, "yes\n", "init", append(args, "tt02")...)
			if err != nil {
				t.Fatalf("init error: %v; output:\n%s", err, output)
			}
			got, err := clientcmd.LoadFromFile(path)
			if err != nil {
				t.Fatal(err)
			}
			if len(got.Contexts) != len(config.Contexts)-1 || got.Contexts[tc.removed] != nil {
				t.Fatalf("expected only %s removed; contexts = %v", tc.removed, got.Contexts)
			}
		})
	}
}

func TestInitCompletesDiscoveryBeforePruning(t *testing.T) {
	for _, failSecondPage := range []bool{false, true} {
		path, _ := setupInit(t, staleConfig)
		t.Setenv("AZ_RESPONSE", `{"data":[],"count":0,"total_records":1,"skip_token":"next"}`)
		t.Setenv(
			"AZ_NEXT_RESPONSE",
			`{"data":[{"name":"brg-tt02-aks","resourceGroup":"rg","subscriptionId":"sub"}],"count":1,"total_records":1}`,
		)
		if failSecondPage {
			t.Setenv("AZ_NEXT_EXIT", "1")
		}
		output, err := invokeCommand(t, "", "init", "--prune", "--kubeconfig", path, "tt02")
		if (err != nil) != failSecondPage {
			t.Fatalf("error = %v, wantError = %v; output:\n%s", err, failSecondPage, output)
		}
		assertStaleConfig(t, path)
	}
}

func setupInit(t *testing.T, config string) (string, string) {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, "config")
	calls := filepath.Join(dir, "calls")
	writeFile(t, path, config, 0o600)
	writeFile(t, filepath.Join(dir, "az"), `#!/bin/sh
printf '%s\n' "$*" >> "$AZ_CALLS"
case "$1 $2" in
  '--version ') exit 0 ;;
  'account show') printf '%s\n' '{"user":{"name":"ext-test@ai-dev.no"}}' ;;
  'graph query')
    case "$*" in
      *--skip-token*) printf '%s\n' "$AZ_NEXT_RESPONSE"; exit "${AZ_NEXT_EXIT:-0}" ;;
      *) printf '%s\n' "$AZ_RESPONSE"; exit "${AZ_GRAPH_EXIT:-0}" ;;
    esac ;;
  'aks get-credentials') exit 0 ;;
  *) exit 1 ;;
esac
`, 0o700)
	writeFile(t, filepath.Join(dir, "kubectl"), "#!/bin/sh\nexit 0\n", 0o700)
	t.Setenv("PATH", dir+string(os.PathListSeparator)+os.Getenv("PATH"))
	t.Setenv("AZ_CALLS", calls)
	t.Setenv("AZ_RESPONSE", `{"data":[],"count":0,"total_records":0}`)
	return path, calls
}

func invokeCommand(t *testing.T, input, command string, args ...string) (string, error) {
	t.Helper()
	dir := t.TempDir()
	inputPath := filepath.Join(dir, "stdin")
	writeFile(t, inputPath, input, 0o600)
	stdin, err := os.Open(inputPath)
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		if closeErr := stdin.Close(); closeErr != nil {
			t.Error(closeErr)
		}
	}()
	stdout, err := os.Create(filepath.Join(dir, "stdout"))
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		if closeErr := stdout.Close(); closeErr != nil {
			t.Error(closeErr)
		}
	}()
	originalArgs, originalStdin, originalStdout := os.Args, os.Stdin, os.Stdout
	os.Args, os.Stdin, os.Stdout = append([]string{"health", command}, args...), stdin, stdout
	defer func() { os.Args, os.Stdin, os.Stdout = originalArgs, originalStdin, originalStdout }()
	err = run()
	return readFile(t, stdout.Name()), err
}

func writeFile(t *testing.T, path, content string, mode os.FileMode) {
	t.Helper()
	if err := os.WriteFile(path, []byte(content), mode); err != nil {
		t.Fatal(err)
	}
}

func readFile(t *testing.T, path string) string {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	return string(data)
}

func assertStaleConfig(t *testing.T, path string) {
	t.Helper()
	if got := readFile(t, path); got != staleConfig {
		t.Fatalf("%s contents = %q, want %q", path, got, staleConfig)
	}
}
