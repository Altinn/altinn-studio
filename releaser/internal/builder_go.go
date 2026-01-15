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
	"path/filepath"
	"strings"

	"altinn.studio/releaser/internal/perm"
	"altinn.studio/releaser/internal/version"
)

// ErrTarballMissingPath indicates a required path is missing from the tarball.
var ErrTarballMissingPath = errors.New("required path not found in tarball")

// StudioctlBuilder builds studioctl release artifacts.
// It implements ComponentBuilder and wraps the detailed build steps.
type StudioctlBuilder struct {
	log            Logger
	Pkg            string
	LdflagsPattern string
	LocaltestDir   string
	InstallScripts []string
}

// NewStudioctlBuilder creates a builder configured for studioctl.
func NewStudioctlBuilder() *StudioctlBuilder {
	return &StudioctlBuilder{
		log:            NopLogger{},
		Pkg:            "src/cli/cmd/studioctl",
		LdflagsPattern: "-X altinn.studio/studioctl/internal/cmd.version=%s",
		InstallScripts: []string{
			"src/cli/cmd/studioctl/install.sh",
			"src/cli/cmd/studioctl/install.ps1",
		},
		LocaltestDir: "src/Runtime/localtest",
	}
}

// Build produces all release artifacts for studioctl.
// Returns the list of artifact paths relative to outputDir.
func (b *StudioctlBuilder) Build(ctx context.Context, ver *version.Version, outputDir string) ([]string, error) {
	if b.log == nil {
		b.log = NopLogger{}
	}

	// Get repo root for path resolution
	git := NewGitCLI()
	root, err := git.RepoRoot(ctx)
	if err != nil {
		return nil, err
	}

	// Resolve all paths relative to repo root
	pkgPath := filepath.Join(root, b.Pkg)
	resourcesTarball := filepath.Join(root, "build", "localtest-resources.tar.gz")
	localtestDir := filepath.Join(root, b.LocaltestDir)
	installScripts := make([]string, len(b.InstallScripts))
	for i, script := range b.InstallScripts {
		installScripts[i] = filepath.Join(root, script)
	}

	if err := EnsureDir(outputDir); err != nil {
		return nil, fmt.Errorf("create output directory: %w", err)
	}

	// Step 1: Build localtest resources tarball
	b.log.Info("Building localtest resources...")
	if err := b.buildResources(ctx, resourcesTarball, localtestDir); err != nil {
		return nil, fmt.Errorf("build resources: %w", err)
	}

	// Step 2: Validate tarball contents
	b.log.Info("Validating tarball contents...")
	if err := b.validateTarball(ctx, resourcesTarball); err != nil {
		return nil, fmt.Errorf("validate tarball: %w", err)
	}

	// Step 3: Build release binaries for all platforms
	b.log.Info("Building release binaries for all platforms...")
	if err := b.buildBinaries(ctx, ver.String(), outputDir, pkgPath); err != nil {
		return nil, fmt.Errorf("build binaries: %w", err)
	}

	// Step 4: Copy install scripts and resources
	b.log.Info("Copying additional assets...")
	if err := b.copyAssets(ctx, outputDir, resourcesTarball, installScripts); err != nil {
		return nil, fmt.Errorf("copy assets: %w", err)
	}

	// Step 5: Generate checksums
	b.log.Info("Generating checksums...")
	if err := b.generateChecksums(ctx, outputDir); err != nil {
		return nil, fmt.Errorf("generate checksums: %w", err)
	}

	// Collect all artifact paths
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

func (b *StudioctlBuilder) buildBinaries(ctx context.Context, ver, outputDir, pkgPath string) error {
	ldflags := fmt.Sprintf(b.LdflagsPattern, ver)

	for _, p := range getReleasePlatforms() {
		binaryName := fmt.Sprintf("studioctl-%s-%s", p.OS, p.Arch)
		if p.OS == osWindows {
			binaryName += ".exe"
		}
		outputPath := filepath.Join(outputDir, binaryName)

		b.log.Info("Building %s...", binaryName)
		err := GoBuildWithOptions(ctx, BuildOptions{
			Output:  outputPath,
			Ldflags: ldflags,
			Pkg:     pkgPath,
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

func (b *StudioctlBuilder) copyAssets(
	_ context.Context,
	outputDir, resourcesTarball string,
	installScripts []string,
) error {
	// Preallocate: 1 for tarball + install scripts
	assets := make([]struct{ src, dst string }, 0, 1+len(installScripts))
	assets = append(assets, struct{ src, dst string }{
		resourcesTarball, filepath.Join(outputDir, "localtest-resources.tar.gz"),
	})

	// Add install scripts
	for _, script := range installScripts {
		assets = append(assets, struct{ src, dst string }{
			script,
			filepath.Join(outputDir, filepath.Base(script)),
		})
	}

	for _, a := range assets {
		if err := CopyFile(a.src, a.dst); err != nil {
			return fmt.Errorf("copy %s: %w", a.src, err)
		}
		b.log.Info("Copied %s", filepath.Base(a.dst))
	}

	return nil
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
		// Skip existing checksum file and release notes
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
		// Skip release notes (not an artifact)
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
		{"linux", "amd64"},
		{"linux", "arm64"},
		{"darwin", "amd64"},
		{"darwin", "arm64"},
		{osWindows, "amd64"},
		{osWindows, "arm64"},
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
