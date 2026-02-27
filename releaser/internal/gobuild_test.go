package internal_test

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"altinn.studio/releaser/internal"
)

func TestGoBuildWithOptions_UsesBuildDir(t *testing.T) {
	t.Parallel()

	rootDir := t.TempDir()
	moduleDir := filepath.Join(rootDir, "src", "cli")
	pkgDir := filepath.Join(moduleDir, "cmd", "studioctl")

	if err := os.MkdirAll(pkgDir, 0o755); err != nil {
		t.Fatalf("mkdir package dir: %v", err)
	}
	goMod := "module example.com/studioctl\n\ngo 1.22\n"
	if err := os.WriteFile(filepath.Join(moduleDir, "go.mod"), []byte(goMod), 0o644); err != nil {
		t.Fatalf("write go.mod: %v", err)
	}
	mainGo := "package main\n\nfunc main() {}\n"
	if err := os.WriteFile(filepath.Join(pkgDir, "main.go"), []byte(mainGo), 0o644); err != nil {
		t.Fatalf("write main.go: %v", err)
	}

	output := filepath.Join(rootDir, "studioctl")
	err := internal.GoBuildWithOptions(t.Context(), internal.BuildOptions{
		Output: output,
		Pkg:    "./cmd/studioctl",
		Dir:    moduleDir,
		CGO:    false,
	})
	if err != nil {
		t.Fatalf("GoBuildWithOptions() error = %v", err)
	}

	if _, err := os.Stat(output); err == nil {
		return
	}
	if _, err := os.Stat(output + ".exe"); err != nil {
		t.Fatalf("expected output binary at %q (or .exe): %v", output, err)
	}
}

func TestGoBuildWithOptions_PreservesParentGOOSEnvWhenOptionEmpty(t *testing.T) {
	moduleDir, output := createTinyMainModule(t)
	t.Setenv("GOOS", "definitely-invalid-os")

	err := internal.GoBuildWithOptions(t.Context(), internal.BuildOptions{
		Output: output,
		Pkg:    "./cmd/studioctl",
		Dir:    moduleDir,
		CGO:    false,
	})
	if err == nil {
		t.Fatal("expected build error when parent GOOS is invalid and opts.GOOS is empty")
	}
}

func TestGoBuildWithOptions_OverridesParentGOOSEnvWhenOptionProvided(t *testing.T) {
	moduleDir, output := createTinyMainModule(t)
	t.Setenv("GOOS", "definitely-invalid-os")

	err := internal.GoBuildWithOptions(t.Context(), internal.BuildOptions{
		Output: output,
		Pkg:    "./cmd/studioctl",
		Dir:    moduleDir,
		GOOS:   runtime.GOOS,
		CGO:    false,
	})
	if err != nil {
		t.Fatalf("GoBuildWithOptions() error = %v", err)
	}
}

func createTinyMainModule(t *testing.T) (moduleDir, output string) {
	t.Helper()

	rootDir := t.TempDir()
	moduleDir = filepath.Join(rootDir, "src", "cli")
	pkgDir := filepath.Join(moduleDir, "cmd", "studioctl")

	if err := os.MkdirAll(pkgDir, 0o755); err != nil {
		t.Fatalf("mkdir package dir: %v", err)
	}
	goMod := "module example.com/studioctl\n\ngo 1.25\n"
	if err := os.WriteFile(filepath.Join(moduleDir, "go.mod"), []byte(goMod), 0o644); err != nil {
		t.Fatalf("write go.mod: %v", err)
	}
	mainGo := "package main\n\nfunc main() {}\n"
	if err := os.WriteFile(filepath.Join(pkgDir, "main.go"), []byte(mainGo), 0o644); err != nil {
		t.Fatalf("write main.go: %v", err)
	}

	return moduleDir, filepath.Join(rootDir, "studioctl")
}
