package internal

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"altinn.studio/releaser/internal/perm"
	"altinn.studio/releaser/internal/version"
)

// ErrTarballMissingPath indicates a required path is missing from the tarball.
var ErrTarballMissingPath = errors.New("required path not found in tarball")

var errUnsupportedAppManagerRuntime = errors.New("unsupported app-manager runtime")

const (
	appManagerExeName = "app-manager"
	exeSuffix         = ".exe"
	archAMD64         = "amd64"
	archARM64         = "arm64"
)

// StudioctlBuilder builds studioctl release artifacts.
// It implements ComponentBuilder and wraps the detailed build steps.
type StudioctlBuilder struct {
	Pkg            string
	LdflagsPattern string
	LocaltestDir   string
	AppManagerProj string
	log            Logger
	InstallScripts []string
}

const installScriptDefaultVersionPlaceholder = "__STUDIOCTL_DEFAULT_VERSION__"

// NewStudioctlBuilder creates a builder configured for studioctl.
func NewStudioctlBuilder() *StudioctlBuilder {
	return &StudioctlBuilder{
		log:            NopLogger{},
		Pkg:            "./cmd/studioctl",
		LdflagsPattern: "-X altinn.studio/studioctl/internal/cmd.version=%s",
		InstallScripts: []string{
			"src/cli/cmd/studioctl/install.sh",
			"src/cli/cmd/studioctl/install.ps1",
		},
		AppManagerProj: "src/cli/app-manager/app-manager.csproj",
		LocaltestDir:   "src/Runtime/localtest",
	}
}

// Build produces all release artifacts for studioctl.
// Returns the list of artifact paths relative to outputDir.
func (b *StudioctlBuilder) Build(ctx context.Context, ver *version.Version, outputDir string) ([]string, error) {
	if b.log == nil {
		b.log = NopLogger{}
	}

	git := NewGitCLI()
	root, err := git.RepoRoot(ctx)
	if err != nil {
		return nil, err
	}

	buildDir := filepath.Join(root, "src/cli")
	resourcesTarball := filepath.Join(root, "build", "localtest-resources.tar.gz")
	localtestDir := filepath.Join(root, b.LocaltestDir)
	appManagerProj := filepath.Join(root, b.AppManagerProj)
	installScripts := make([]string, len(b.InstallScripts))
	for i, script := range b.InstallScripts {
		installScripts[i] = filepath.Join(root, script)
	}

	if err := EnsureDir(outputDir); err != nil {
		return nil, fmt.Errorf("create output directory: %w", err)
	}

	b.log.Info("Building localtest resources...")
	if err := b.buildResources(ctx, resourcesTarball, localtestDir); err != nil {
		return nil, fmt.Errorf("build resources: %w", err)
	}

	b.log.Info("Validating tarball contents...")
	if err := b.validateTarball(ctx, resourcesTarball); err != nil {
		return nil, fmt.Errorf("validate tarball: %w", err)
	}

	b.log.Info("Building release binaries for all platforms...")
	if err := b.buildBinaries(ctx, ver.String(), outputDir, buildDir, b.Pkg); err != nil {
		return nil, fmt.Errorf("build binaries: %w", err)
	}
	if err := b.publishAppManagerBinaries(ctx, outputDir, buildDir, appManagerProj); err != nil {
		return nil, fmt.Errorf("publish app-manager binaries: %w", err)
	}

	b.log.Info("Copying additional assets...")
	releaseTag := "studioctl/" + ver.String()
	if err := b.copyAssets(ctx, outputDir, resourcesTarball, installScripts, releaseTag); err != nil {
		return nil, fmt.Errorf("copy assets: %w", err)
	}

	b.log.Info("Generating checksums...")
	if err := b.generateChecksums(ctx, outputDir); err != nil {
		return nil, fmt.Errorf("generate checksums: %w", err)
	}

	return b.collectArtifacts(outputDir)
}

// SetLogger sets the logger for build output.
func (b *StudioctlBuilder) SetLogger(log Logger) {
	b.log = log
}

func (b *StudioctlBuilder) buildResources(_ context.Context, destPath, localtestDir string) error {
	if err := EnsureDir(filepath.Dir(destPath)); err != nil {
		return err
	}
	return CreateTarGz(destPath, localtestDir, "testdata", "infra")
}

func (b *StudioctlBuilder) validateTarball(_ context.Context, tarballPath string) error {
	requiredPaths := []string{"testdata/", "infra/"}

	foundPaths, err := scanTarballPaths(tarballPath, requiredPaths)
	if err != nil {
		return err
	}

	for _, required := range requiredPaths {
		if !foundPaths[required] {
			return fmt.Errorf("%w: %s", ErrTarballMissingPath, required)
		}
	}

	b.log.Info("Tarball validation passed")
	return nil
}

func (b *StudioctlBuilder) buildBinaries(ctx context.Context, ver, outputDir, buildDir, pkgPath string) error {
	ldflags := fmt.Sprintf(b.LdflagsPattern, ver)

	for _, p := range getReleasePlatforms() {
		binaryName := fmt.Sprintf("studioctl-%s-%s", p.OS, p.Arch)
		if p.OS == osWindows {
			binaryName += exeSuffix
		}
		outputPath := filepath.Join(outputDir, binaryName)

		b.log.Info("Building %s...", binaryName)
		err := GoBuildWithOptions(ctx, BuildOptions{
			Output:  outputPath,
			Ldflags: ldflags,
			Pkg:     pkgPath,
			Dir:     buildDir,
			GOOS:    p.OS,
			GOARCH:  p.Arch,
			CGO:     false, // Static binaries
		})
		if err != nil {
			return fmt.Errorf("build %s: %w", binaryName, err)
		}
	}

	return nil
}

func (b *StudioctlBuilder) publishAppManagerBinaries(
	ctx context.Context,
	outputDir, buildDir, appManagerProj string,
) error {
	for _, p := range getReleasePlatforms() {
		rid, err := dotnetRuntimeIdentifier(p.OS, p.Arch)
		if err != nil {
			return err
		}

		assetName := "app-manager-" + p.OS + "-" + p.Arch + ".tar.gz"

		publishDir := filepath.Join(outputDir, ".app-manager-"+p.OS+"-"+p.Arch)
		err = EnsureCleanDir(publishDir)
		if err != nil {
			return fmt.Errorf("prepare publish dir for %s: %w", assetName, err)
		}

		b.log.Info("Publishing %s...", assetName)
		args := []string{
			"publish",
			appManagerProj,
			"-c", "Release",
			"-o", publishDir,
			"-r", rid,
			"--self-contained", "true",
			"-p:DebugType=None",
			"-p:DebugSymbols=false",
		}
		//nolint:gosec // G204: command and arguments are fixed local tooling with validated project path and RID.
		cmd := exec.CommandContext(ctx, "dotnet", args...)
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		cmd.Dir = buildDir

		err = cmd.Run()
		if err != nil {
			return fmt.Errorf("publish %s: %w", assetName, err)
		}

		entries, err := os.ReadDir(publishDir)
		if err != nil {
			return fmt.Errorf("read publish dir for %s: %w", assetName, err)
		}
		paths := make([]string, 0, len(entries))
		for _, entry := range entries {
			paths = append(paths, entry.Name())
		}
		if err := CreateTarGz(filepath.Join(outputDir, assetName), publishDir, paths...); err != nil {
			return fmt.Errorf("archive %s: %w", assetName, err)
		}
	}

	return nil
}

func dotnetRuntimeIdentifier(goos, goarch string) (string, error) {
	switch goos {
	case "linux":
		switch goarch {
		case archAMD64:
			return "linux-x64", nil
		case archARM64:
			return "linux-arm64", nil
		}
	case "darwin":
		switch goarch {
		case archAMD64:
			return "osx-x64", nil
		case archARM64:
			return "osx-arm64", nil
		}
	case osWindows:
		switch goarch {
		case archAMD64:
			return "win-x64", nil
		case archARM64:
			return "win-arm64", nil
		}
	}

	return "", fmt.Errorf("%w: %s/%s", errUnsupportedAppManagerRuntime, goos, goarch)
}

func (b *StudioctlBuilder) copyAssets(
	_ context.Context,
	outputDir, resourcesTarball string,
	installScripts []string,
	releaseTag string,
) error {
	resourcesDest := filepath.Join(outputDir, "localtest-resources.tar.gz")
	if err := CopyFile(resourcesTarball, resourcesDest); err != nil {
		return fmt.Errorf("copy %s: %w", resourcesTarball, err)
	}
	b.log.Info("Copied %s", filepath.Base(resourcesDest))

	for _, script := range installScripts {
		dest, err := copyInstallScript(script, outputDir, releaseTag)
		if err != nil {
			return fmt.Errorf("copy install script %s: %w", script, err)
		}
		b.log.Info("Copied %s", filepath.Base(dest))
	}

	return nil
}

func copyInstallScript(src, outputDir, releaseTag string) (string, error) {
	dst := filepath.Join(outputDir, filepath.Base(src))
	content, err := os.ReadFile(src) //nolint:gosec // G304: src path is from trusted dev tooling input
	if err != nil {
		return "", fmt.Errorf("read source file: %w", err)
	}
	info, err := os.Stat(src)
	if err != nil {
		return "", fmt.Errorf("stat source file: %w", err)
	}
	if err := EnsureDir(filepath.Dir(dst)); err != nil {
		return "", fmt.Errorf("create destination directory: %w", err)
	}

	// Replace only the assignment placeholder and keep the fallback marker literal.
	stamped := strings.Replace(string(content), installScriptDefaultVersionPlaceholder, releaseTag, 1)
	//nolint:gosec // G703: dst is anchored to outputDir and uses filepath.Base(src), so it cannot escape the release output directory.
	if err := os.WriteFile(dst, []byte(stamped), info.Mode().Perm()); err != nil {
		return "", fmt.Errorf("write destination file: %w", err)
	}
	return dst, nil
}

func (b *StudioctlBuilder) generateChecksums(ctx context.Context, outputDir string) error {
	entries, err := os.ReadDir(outputDir)
	if err != nil {
		return fmt.Errorf("read output dir: %w", err)
	}

	var lines []string
	for _, entry := range entries {
		if ctx.Err() != nil {
			return fmt.Errorf("context canceled: %w", ctx.Err())
		}

		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if name == "SHA256SUMS" || name == "release-notes.md" {
			continue
		}

		path := filepath.Join(outputDir, name)
		sum, err := fileChecksum(path)
		if err != nil {
			return fmt.Errorf("checksum %s: %w", name, err)
		}
		// Format: checksum  filename (two spaces, matching sha256sum output)
		lines = append(lines, fmt.Sprintf("%s  %s", sum, name))
	}

	sumPath := filepath.Join(outputDir, "SHA256SUMS")
	content := strings.Join(lines, "\n") + "\n"
	if err := os.WriteFile(sumPath, []byte(content), perm.FilePermDefault); err != nil {
		return fmt.Errorf("write SHA256SUMS: %w", err)
	}

	b.log.Info("Generated SHA256SUMS with %d entries", len(lines))
	return nil
}

func (b *StudioctlBuilder) collectArtifacts(outputDir string) ([]string, error) {
	entries, err := filepath.Glob(filepath.Join(outputDir, "*"))
	if err != nil {
		return nil, fmt.Errorf("glob artifacts: %w", err)
	}

	var artifacts []string
	for _, entry := range entries {
		if filepath.Base(entry) == releaseNotesFile {
			continue
		}
		artifacts = append(artifacts, entry)
	}

	return artifacts, nil
}

// scanTarballPaths scans a tarball and returns which of the required paths were found.
func scanTarballPaths(tarballPath string, requiredPaths []string) (map[string]bool, error) {
	//nolint:gosec // G304: tarballPath is from trusted dev tooling input
	f, err := os.Open(tarballPath)
	if err != nil {
		return nil, fmt.Errorf("open tarball: %w", err)
	}
	defer f.Close() //nolint:errcheck // best-effort close on read-only file

	gzr, err := gzip.NewReader(f)
	if err != nil {
		return nil, fmt.Errorf("create gzip reader: %w", err)
	}
	defer gzr.Close() //nolint:errcheck // best-effort close on read-only stream

	foundPaths := make(map[string]bool)
	tr := tar.NewReader(gzr)

	for {
		header, readErr := tr.Next()
		if errors.Is(readErr, io.EOF) {
			break
		}
		if readErr != nil {
			return nil, fmt.Errorf("read tarball: %w", readErr)
		}

		for _, required := range requiredPaths {
			if strings.HasPrefix(header.Name, required) {
				foundPaths[required] = true
			}
		}
	}

	return foundPaths, nil
}

// fileChecksum calculates SHA256 checksum of a file.
func fileChecksum(path string) (sum string, err error) {
	//nolint:gosec // G304: path is from trusted dev tooling input
	f, err := os.Open(path)
	if err != nil {
		return "", fmt.Errorf("open file: %w", err)
	}
	defer func() {
		if closeErr := f.Close(); closeErr != nil && err == nil {
			err = fmt.Errorf("close file: %w", closeErr)
		}
	}()

	h := sha256.New()
	if _, copyErr := io.Copy(h, f); copyErr != nil {
		return "", fmt.Errorf("read file: %w", copyErr)
	}

	return hex.EncodeToString(h.Sum(nil)), nil
}

// releasePlatform defines an OS/arch combination for release builds.
type releasePlatform struct {
	OS   string
	Arch string
}

// getReleasePlatforms returns all supported OS/arch combinations for release builds.
func getReleasePlatforms() []releasePlatform {
	return []releasePlatform{
		{"linux", archAMD64},
		{"linux", archARM64},
		{"darwin", archAMD64},
		{"darwin", archARM64},
		{osWindows, archAMD64},
		{osWindows, archARM64},
	}
}

// init registers the StudioctlBuilder with the studioctl component.
//
//nolint:gochecknoinits // registration pattern for component builders
func init() {
	if c, err := GetComponent("studioctl"); err == nil {
		c.Builder = NewStudioctlBuilder()
	}
}
