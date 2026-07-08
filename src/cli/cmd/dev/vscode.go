//nolint:forbidigo // This dev tool uses fmt.Print for simple CLI output.
package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"altinn.studio/devenv/pkg/processutil"
	"altinn.studio/studioctl/internal/config"
)

const vscodeExtensionSrcDir = "studioctl-lsp/vscode"

var (
	errVSCodeExtensionSourceMissing = errors.New("VS Code extension source not found")
	errNpmRequired                  = errors.New(
		"npm is required to package the bundled VS Code extension; install Node.js/npm and retry",
	)
)

func packageVSCodeExtension() (string, error) {
	if !fileExists(filepath.Join(vscodeExtensionSrcDir, "package.json")) {
		return "", fmt.Errorf("%w at %s", errVSCodeExtensionSourceMissing, vscodeExtensionSrcDir)
	}
	if !commandAvailable("npm") {
		return "", errNpmRequired
	}

	vsixPath := filepath.Join(vscodeExtensionSrcDir, config.VSCodeExtensionVsixName)

	fmt.Println("Packaging VS Code extension...")
	steps := [][]string{
		{"npm", "install", "--no-audit", "--no-fund"},
		{"npm", "run", "compile"},
		{
			"npx", "--yes", "@vscode/vsce", "package",
			"-o", config.VSCodeExtensionVsixName,
			"--allow-missing-repository", "--skip-license",
		},
	}
	for _, step := range steps {
		cmd := processutil.CommandContext(context.Background(), step[0], step[1:]...)
		cmd.Dir = vscodeExtensionSrcDir
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		if err := cmd.Run(); err != nil {
			return "", fmt.Errorf("package VS Code extension (%s): %w", step[0], err)
		}
	}
	return vsixPath, nil
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func commandAvailable(name string) bool {
	_, err := exec.LookPath(name)
	return err == nil
}
