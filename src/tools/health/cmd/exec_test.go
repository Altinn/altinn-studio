package main

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestExecPrintsCommandOutput(t *testing.T) {
	for _, tc := range []struct {
		name      string
		exitCode  string
		wantError bool
	}{
		{name: "success", exitCode: "0"},
		{name: "failure", exitCode: "1", wantError: true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			dir := t.TempDir()
			if err := os.Mkdir(filepath.Join(dir, ".kube"), 0o700); err != nil {
				t.Fatal(err)
			}
			writeFile(t, filepath.Join(dir, ".kube", "config"), staleConfig, 0o600)
			writeFile(t, filepath.Join(dir, "kubectl"), `#!/bin/sh
if [ "$1" = version ]; then exit 0; fi
printf '%s\n' "$@" > "$EXEC_ARGUMENTS"
printf '2026-10-08T10:00:00Z\r\nkeep\n'
printf 'example\nwarning\n' >&2
exit "$EXEC_EXIT_CODE"
`, 0o700)
			argumentsPath := filepath.Join(dir, "arguments")
			t.Setenv("HOME", dir)
			t.Setenv("PATH", dir+string(os.PathListSeparator)+os.Getenv("PATH"))
			t.Setenv("EXEC_ARGUMENTS", argumentsPath)
			t.Setenv("EXEC_EXIT_CODE", tc.exitCode)
			jsonpath := `jsonpath={.metadata.creationTimestamp} {.metadata.annotations.helm\.sh/resource-policy}{"\n"}`
			output, err := invokeCommand(
				t,
				"y\n",
				"exec",
				"tt02",
				"kubectl",
				"get",
				"svc",
				"-n",
				"pdf",
				"pdf-generator",
				"-o",
				jsonpath,
			)
			if errors.Is(err, errCommandFailed) != tc.wantError || (err != nil) != tc.wantError {
				t.Fatalf("error = %v, wantError = %v; output:\n%s", err, tc.wantError, output)
			}
			var row string
			for line := range strings.SplitSeq(output, "\n") {
				if strings.HasPrefix(line, "brg-tt02-aks ") {
					row = line
				}
			}
			for _, want := range []string{`2026-10-08T10:00:00Z\r\nkeep`, `example\nwarning`} {
				if !strings.Contains(row, want) {
					t.Errorf("table row missing %q: %q", want, row)
				}
			}
			if strings.Contains(output, "Command output by cluster") || strings.Contains(output, "Stdout:\n") {
				t.Error("output still contains separate detail blocks")
			}
			wantArgs := strings.Join(
				[]string{"get", "svc", "-n", "pdf", "pdf-generator", "-o", jsonpath, "--context", "brg-tt02-aks"},
				"\n",
			) + "\n"
			if got := readFile(t, argumentsPath); got != wantArgs {
				t.Fatalf("kubectl args = %q, want %q", got, wantArgs)
			}
		})
	}
}
