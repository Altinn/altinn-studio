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
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

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
	return !bundleBuiltAt(studioRoot).IsZero()
}

// bundleBuiltAt returns the oldest mtime across the bundle files, or the zero time when the
// bundle is missing. The oldest is the conservative choice: a bundle is only as fresh as its
// stalest file.
func bundleBuiltAt(studioRoot string) time.Time {
	if studioRoot == "" {
		return time.Time{}
	}
	dist := DistPath(studioRoot)
	var oldest time.Time
	for _, name := range bundleFiles() {
		info, err := os.Stat(filepath.Join(dist, name))
		if err != nil || info.IsDir() {
			return time.Time{}
		}
		if oldest.IsZero() || info.ModTime().Before(oldest) {
			oldest = info.ModTime()
		}
	}
	return oldest
}

// NeedsBuild reports whether the bundle is missing, or older than an input the build reads.
//
// Freshness is compared by modification time, which errs towards rebuilding: a branch switch
// restamps files without changing their content, and the cost of that is one rebuild rather
// than an app serving a frontend that no longer matches the source.
func NeedsBuild(studioRoot string) bool {
	builtAt := bundleBuiltAt(studioRoot)
	if builtAt.IsZero() {
		return true
	}
	return newestInputTime(studioRoot).After(builtAt)
}

// inputTrees are the directories the frontend build reads, relative to the Studio repository
// root. Together with inputFiles they mirror the cache key of
// .github/actions/app-build-frontend, which is the authoritative list of what the build
// consumes - keep the two in sync.
func inputTrees(studioRoot string) []string {
	project := ProjectPath(studioRoot)
	trees := []string{
		filepath.Join(project, "src"),
		filepath.Join(project, "public"),
		filepath.Join(project, "schemas"),
		filepath.Join(project, "scripts"),
	}
	// src/common/ts/*/src - the workspace libraries the frontend imports.
	commonTS := filepath.Join(studioRoot, "src", "common", "ts")
	if matches, err := filepath.Glob(filepath.Join(commonTS, "*", "src")); err == nil {
		trees = append(trees, matches...)
	}
	return trees
}

// inputFiles are the individual files the frontend build reads. Globs that match nothing are
// skipped, so a checkout missing any of them simply contributes no timestamp.
func inputFiles(studioRoot string) []string {
	project := ProjectPath(studioRoot)
	commonTS := filepath.Join(studioRoot, "src", "common", "ts")
	files := []string{
		filepath.Join(studioRoot, "package.json"),
		filepath.Join(studioRoot, "yarn.lock"),
		filepath.Join(studioRoot, ".yarnrc.yml"),
		filepath.Join(project, "package.json"),
		filepath.Join(project, "vite.config.ts"),
		filepath.Join(commonTS, "package.json"),
	}
	globs := []string{
		filepath.Join(project, "tsconfig*.json"),
		filepath.Join(commonTS, "tsconfig*.json"),
		filepath.Join(commonTS, "*", "package.json"),
		filepath.Join(commonTS, "*", "tsconfig*.json"),
	}
	for _, glob := range globs {
		if matches, err := filepath.Glob(glob); err == nil {
			files = append(files, matches...)
		}
	}
	return files
}

// newestInputTime returns the most recent mtime across everything the frontend build reads.
func newestInputTime(studioRoot string) time.Time {
	newest := newestFileTime(inputFiles(studioRoot))
	for _, tree := range inputTrees(studioRoot) {
		if treeTime := newestTreeTime(tree); treeTime.After(newest) {
			newest = treeTime
		}
	}
	return newest
}

// newestFileTime returns the most recent mtime across the named files. A file that cannot be
// read contributes nothing: an input we cannot see cannot prove the bundle stale.
func newestFileTime(paths []string) time.Time {
	var newest time.Time
	for _, path := range paths {
		info, err := os.Stat(path)
		if err != nil || info.IsDir() {
			continue
		}
		if info.ModTime().After(newest) {
			newest = info.ModTime()
		}
	}
	return newest
}

// newestTreeTime returns the most recent mtime beneath root, ignoring installed dependencies
// and build output - neither is a source, and walking node_modules would dominate the cost of
// this check.
func newestTreeTime(root string) time.Time {
	var newest time.Time
	visit := func(_ string, entry fs.DirEntry, err error) error {
		if err != nil {
			return nil //nolint:nilerr // an unreadable entry is skipped, not fatal
		}
		if entry.IsDir() {
			if entry.Name() == "node_modules" || entry.Name() == "dist" {
				return fs.SkipDir
			}
			return nil
		}
		// An entry whose metadata disappeared between listing and reading contributes nothing.
		if info, statErr := entry.Info(); statErr == nil && info.ModTime().After(newest) {
			newest = info.ModTime()
		}
		return nil
	}

	if err := filepath.WalkDir(root, visit); err != nil {
		// visit never fails the walk, so this only fires when root itself is unreadable or
		// absent, and then the tree has told us nothing about freshness.
		return time.Time{}
	}
	return newest
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
