package tools

import (
	"os"
	"path/filepath"
	"testing"

	"altinn.studio/runtime-fixture/pkg/cache"
)

// TestInstallAllTools tests installing all tools defined in .tool-versions
// to a temporary directory and verifies they can be installed successfully
func TestInstallAllTools(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	tmpDir, err := os.MkdirTemp("", "test-install-all-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer func() { _ = os.RemoveAll(tmpDir) }()

	installer, err := NewInstaller(tmpDir, testing.Verbose(), false)
	if err != nil {
		t.Fatalf("NewInstaller() failed: %v", err)
	}

	// Install all tools
	installedCount, err := installer.Install(t.Context(), "")
	if err != nil {
		t.Fatalf("Install() failed: %v", err)
	}

	if installedCount == 0 {
		t.Error("expected at least one tool to be installed")
	}

	t.Logf("Successfully installed %d tools", installedCount)

	// Verify all binaries exist and are executable
	for toolName := range installer.tools {
		binPath := filepath.Join(tmpDir, cache.BinSubdir, toolName)
		info, err := os.Stat(binPath)
		if err != nil {
			t.Errorf("tool %s not found: %v", toolName, err)
			continue
		}
		if info.Mode().Perm()&0111 == 0 {
			t.Errorf("tool %s is not executable", toolName)
		}
	}

	// Test re-installation doesn't fail and reports 0 installed
	installedCount, err = installer.Install(t.Context(), "")
	if err != nil {
		t.Fatalf("Re-install failed: %v", err)
	}
	if installedCount != 0 {
		t.Errorf("expected 0 tools on re-install, got %d", installedCount)
	}
}

// TestInstallSpecificTool tests installing a single specific tool
func TestInstallSpecificTool(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	tmpDir, err := os.MkdirTemp("", "test-install-kind-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer func() { _ = os.RemoveAll(tmpDir) }()

	installer, err := NewInstaller(tmpDir, testing.Verbose(), false)
	if err != nil {
		t.Fatalf("NewInstaller() failed: %v", err)
	}

	// Install just kind
	installedCount, err := installer.Install(t.Context(), "kind")
	if err != nil {
		t.Fatalf("Install(kind) failed: %v", err)
	}

	if installedCount != 1 {
		t.Errorf("expected 1 tool installed, got %d", installedCount)
	}

	// Verify kind binary exists
	kindPath := filepath.Join(tmpDir, cache.BinSubdir, "kind")
	if _, err := os.Stat(kindPath); err != nil {
		t.Errorf("kind binary not found: %v", err)
	}

	tool, err := installer.GetToolInfo("kind")
	if err != nil {
		t.Errorf("Couldnt get kind tool, should be installed: %v", err)
	}
	if _, err := os.Stat(tool.Path); err != nil {
		t.Errorf("kind binary not found: %v", err)
	}

	tool, err = installer.GetToolInfo("kubectl")
	if err != nil {
		t.Errorf("Should be able to get tool info: %v", err)
	}
	if _, err := os.Stat(tool.Path); err == nil {
		t.Errorf("kubectl binary found even though it shouldn't be installed")
	}
	_, err = installer.GetKubernetesClient()
	if err == nil {
		t.Errorf("Should not be able to get the actual k8s client")
	}
}

// TestInstallMultipleSpecificTools tests installing multiple specific tools
func TestInstallMultipleSpecificTools(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	tmpDir, err := os.MkdirTemp("", "test-install-multiple-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer func() { _ = os.RemoveAll(tmpDir) }()

	installer, err := NewInstaller(tmpDir, testing.Verbose(), false)
	if err != nil {
		t.Fatalf("NewInstaller() failed: %v", err)
	}

	// Install kind and kubectl
	installedCount, err := installer.Install(t.Context(), "kind,kubectl")
	if err != nil {
		t.Fatalf("Install(kind,kubectl) failed: %v", err)
	}

	if installedCount != 2 {
		t.Errorf("expected 2 tools installed, got %d", installedCount)
	}

	// Verify both binaries exist
	for _, tool := range []string{"kind", "kubectl"} {
		binPath := filepath.Join(tmpDir, cache.BinSubdir, tool)
		if _, err := os.Stat(binPath); err != nil {
			t.Errorf("%s binary not found: %v", tool, err)
		}
	}
}

// TestInstallInvalidTool tests that installing an unknown tool fails gracefully
func TestInstallInvalidTool(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "test-install-invalid-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer func() { _ = os.RemoveAll(tmpDir) }()

	installer, err := NewInstaller(tmpDir, false, false)
	if err != nil {
		t.Fatalf("NewInstaller() failed: %v", err)
	}

	_, err = installer.Install(t.Context(), "nonexistent-tool")
	if err == nil {
		t.Error("expected error for unknown tool, got nil")
	}
}
