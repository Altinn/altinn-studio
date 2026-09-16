// Package appfrontend builds the app frontend bundle that apps inside the Studio monorepo
// serve as their own static assets.
//
// An app outside the monorepo gets the bundle from the Altinn.App.Api NuGet package. Apps in
// src/test/apps reference that project instead, so the bundle has to come from this checkout.
package appfrontend

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"altinn.studio/devenv/pkg/processutil"
)

const (
	// projectDir holds the app frontend project, relative to the Studio repository root.
	projectDir = "src/App/frontend"
	// distDir is where the frontend build writes its output, relative to the Studio repository root.
	distDir = "src/App/frontend/dist"
)

// bundleFiles are the files an app's generated index page asks for. A dist directory missing
// either of them is treated as unbuilt rather than half-built.
func bundleFiles() []string {
	return []string{"altinn-app-frontend.js", "altinn-app-frontend.css"}
}

// ErrYarnUnavailable reports that the frontend cannot be built because yarn is not installed.
var ErrYarnUnavailable = errors.New("yarn is required to build the app frontend")

// ErrBundleMissing reports that the frontend build produced no usable bundle.
var ErrBundleMissing = errors.New("app frontend bundle missing after build")

// DistPath returns the bundle directory for a Studio repository checkout.
func DistPath(studioRoot string) string {
	return filepath.Join(studioRoot, filepath.FromSlash(distDir))
}

// ProjectPath returns the app frontend project directory for a Studio repository checkout.
func ProjectPath(studioRoot string) string {
	return filepath.Join(studioRoot, filepath.FromSlash(projectDir))
}

// IsBuilt reports whether studioRoot holds a bundle an app can serve.
func IsBuilt(studioRoot string) bool {
	if studioRoot == "" {
		return false
	}
	dist := DistPath(studioRoot)
	for _, name := range bundleFiles() {
		info, err := os.Stat(filepath.Join(dist, name))
		if err != nil || info.IsDir() {
			return false
		}
	}
	return true
}

// Build installs the workspace dependencies and builds the app frontend bundle into DistPath.
// Dependencies install from the repository root because the frontend is a yarn workspace.
func Build(ctx context.Context, studioRoot string, stdout, stderr io.Writer) error {
	if _, err := exec.LookPath("yarn"); err != nil {
		return fmt.Errorf("%w: install it with 'corepack enable' or 'npm install -g yarn'", ErrYarnUnavailable)
	}

	steps := []struct {
		dir  string
		args []string
	}{
		{dir: studioRoot, args: []string{"install", "--immutable", "--inline-builds"}},
		{dir: ProjectPath(studioRoot), args: []string{"run", "build"}},
	}
	for _, step := range steps {
		cmd := processutil.CommandContext(ctx, "yarn", step.args...)
		cmd.Dir = step.dir
		cmd.Stdout = stdout
		cmd.Stderr = stderr
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("yarn %s: %w", strings.Join(step.args, " "), err)
		}
	}

	if !IsBuilt(studioRoot) {
		return fmt.Errorf(
			"%w: expected %s in %s",
			ErrBundleMissing,
			strings.Join(bundleFiles(), " and "),
			DistPath(studioRoot),
		)
	}
	return nil
}
