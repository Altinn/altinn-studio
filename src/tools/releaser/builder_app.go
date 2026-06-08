package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"

	"altinn.studio/releaser/internal"
	"altinn.studio/releaser/internal/version"
)

var (
	errAppPackageArtifactsMissing         = errors.New("no app package artifacts produced")
	errAppInformationalVersionCommitEmpty = errors.New("app package informational version commit is empty")
)

type appBuilder struct {
	log internal.Logger
}

func newAppBuilder() *appBuilder {
	return &appBuilder{
		log: internal.NopLogger{},
	}
}

func (b *appBuilder) Build(ctx context.Context, ver *version.Version, outputDir string) ([]string, error) {
	if b.log == nil {
		b.log = internal.NopLogger{}
	}

	git := internal.NewGitCLI()
	root, err := git.RepoRoot(ctx)
	if err != nil {
		return nil, fmt.Errorf("get repo root: %w", err)
	}

	frontendDir := filepath.Join(root, "src", "App", "frontend")
	backendDir := filepath.Join(root, "src", "App", "backend")

	if ensureErr := internal.EnsureDir(outputDir); ensureErr != nil {
		return nil, fmt.Errorf("create output directory: %w", ensureErr)
	}

	b.log.Info("Building app frontend...")
	if installErr := b.runYarnInstall(ctx, frontendDir); installErr != nil {
		return nil, fmt.Errorf("install app frontend dependencies: %w", installErr)
	}
	if buildErr := b.runYarnBuild(ctx, frontendDir); buildErr != nil {
		return nil, fmt.Errorf("build app frontend: %w", buildErr)
	}

	informationalVersion, err := appInformationalVersion(ctx, git, ver)
	if err != nil {
		return nil, err
	}

	b.log.Info("Packing app backend packages...")
	if packErr := b.runDotnetPack(ctx, backendDir, outputDir, ver, informationalVersion); packErr != nil {
		return nil, fmt.Errorf("pack app backend: %w", packErr)
	}

	artifacts, err := appPackageArtifacts(outputDir)
	if err != nil {
		return nil, err
	}
	if len(artifacts) == 0 {
		return nil, fmt.Errorf("%w in %s", errAppPackageArtifactsMissing, outputDir)
	}
	return artifacts, nil
}

func appInformationalVersion(ctx context.Context, git *internal.GitCLI, ver *version.Version) (string, error) {
	sha, err := git.Run(ctx, "rev-parse", "--short=12", "HEAD")
	if err != nil {
		return "", fmt.Errorf("get app package informational version commit: %w", err)
	}
	sha = strings.TrimSpace(sha)
	if sha == "" {
		return "", errAppInformationalVersionCommitEmpty
	}
	return ver.Num + "+" + sha, nil
}

func (b *appBuilder) runYarnInstall(ctx context.Context, dir string) error {
	cmd := exec.CommandContext(ctx, "yarn", "install", "--immutable", "--inline-builds")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Dir = dir
	cmd.Env = append(os.Environ(), appFrontendInstallEnv()...)

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("run yarn install --immutable --inline-builds: %w", err)
	}
	return nil
}

func (b *appBuilder) runYarnBuild(ctx context.Context, dir string) error {
	cmd := exec.CommandContext(ctx, "yarn", "build")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Dir = dir

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("run yarn build: %w", err)
	}
	return nil
}

func (b *appBuilder) runDotnetPack(
	ctx context.Context,
	dir string,
	outputDir string,
	ver *version.Version,
	informationalVersion string,
) error {
	cmd := exec.CommandContext(ctx, "dotnet", "pack", "solutions/Src.slnx", "-c", "Release", "--output")
	cmd.Args = append(
		cmd.Args,
		outputDir,
		"-p:AppPackageVersion="+ver.Num,
		fmt.Sprintf("-p:AppAssemblyVersion=%d.%d.%d.0", ver.Major, ver.Minor, ver.Patch),
		"-p:AppInformationalVersion="+informationalVersion,
		"-p:UseExperimentalPackageId=false",
	)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Dir = dir

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("run dotnet pack: %w", err)
	}
	return nil
}

func appFrontendInstallEnv() []string {
	return []string{
		"HUSKY=0",
		"PUPPETEER_SKIP_DOWNLOAD=true",
		"YARN_ENABLE_GLOBAL_CACHE=false",
		"YARN_NM_MODE=hardlinks-local",
	}
}

func appPackageArtifacts(outputDir string) ([]string, error) {
	patterns := []string{"*.nupkg", "*.snupkg"}
	var artifacts []string
	for _, pattern := range patterns {
		matches, err := filepath.Glob(filepath.Join(outputDir, pattern))
		if err != nil {
			return nil, fmt.Errorf("glob app package artifacts: %w", err)
		}
		artifacts = append(artifacts, matches...)
	}
	sort.Strings(artifacts)
	return artifacts, nil
}
