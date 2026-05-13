package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"altinn.studio/releaser/internal"
	"altinn.studio/releaser/internal/version"
)

type studioctlBuilder struct {
	log internal.Logger
}

const distManifestFile = ".dist-manifest.json"

var errDistManifestArtifactPathMissing = errors.New("dist manifest contains artifact without path")

type studioctlDistManifest struct {
	Artifacts []string `json:"artifacts"`
}

func newStudioctlBuilder() *studioctlBuilder {
	return &studioctlBuilder{
		log: internal.NopLogger{},
	}
}

func (b *studioctlBuilder) Build(
	ctx context.Context,
	ver *version.Version,
	outputDir string,
) ([]string, error) {
	if b.log == nil {
		b.log = internal.NopLogger{}
	}

	git := internal.NewGitCLI()
	root, err := git.RepoRoot(ctx)
	if err != nil {
		return nil, fmt.Errorf("get repo root: %w", err)
	}

	buildDir := filepath.Join(root, "src/cli")

	if err := internal.EnsureDir(outputDir); err != nil {
		return nil, fmt.Errorf("create output directory: %w", err)
	}

	b.log.Info("Building studioctl distribution...")
	manifestPath := filepath.Join(outputDir, distManifestFile)
	if err := b.buildDistribution(ctx, ver.String(), buildDir, outputDir, manifestPath); err != nil {
		return nil, fmt.Errorf("build studioctl distribution: %w", err)
	}

	return readStudioctlDistManifest(manifestPath)
}

func (b *studioctlBuilder) buildDistribution(ctx context.Context, ver, buildDir, outputDir, manifestPath string) error {
	absOutputDir, err := filepath.Abs(outputDir)
	if err != nil {
		return fmt.Errorf("resolve output directory: %w", err)
	}
	absManifestPath, err := filepath.Abs(manifestPath)
	if err != nil {
		return fmt.Errorf("resolve manifest path: %w", err)
	}

	args := []string{
		"run",
		"./cmd/dev",
		"dist",
		"-version", ver,
		"-output", absOutputDir,
		"-platform", "all",
		"-release",
		"-manifest", absManifestPath,
	}
	//nolint:gosec // G204: command and arguments are fixed local tooling paths and release version.
	cmd := exec.CommandContext(ctx, "go", args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Dir = buildDir

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("run studioctl dist command: %w", err)
	}
	return nil
}

func readStudioctlDistManifest(path string) ([]string, error) {
	content, err := os.ReadFile(path) //nolint:gosec // G304: path is created by local dist command.
	if err != nil {
		return nil, fmt.Errorf("read dist manifest: %w", err)
	}

	var manifest studioctlDistManifest
	if err := json.Unmarshal(content, &manifest); err != nil {
		return nil, fmt.Errorf("parse dist manifest: %w", err)
	}

	var artifacts []string
	for _, artifact := range manifest.Artifacts {
		if artifact == "" {
			return nil, errDistManifestArtifactPathMissing
		}
		artifacts = append(artifacts, artifact)
	}

	return artifacts, nil
}
