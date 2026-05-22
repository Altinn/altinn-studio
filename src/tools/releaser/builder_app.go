package main

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"

	"altinn.studio/releaser/internal"
	"altinn.studio/releaser/internal/version"
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

	if err := internal.EnsureDir(outputDir); err != nil {
		return nil, fmt.Errorf("create output directory: %w", err)
	}

	b.log.Info("Building app frontend...")
	if err := b.run(
		ctx,
		frontendDir,
		appFrontendInstallEnv(),
		"yarn",
		"install",
		"--immutable",
		"--inline-builds",
	); err != nil {
		return nil, fmt.Errorf("install app frontend dependencies: %w", err)
	}
	if err := b.run(ctx, frontendDir, nil, "yarn", "build"); err != nil {
		return nil, fmt.Errorf("build app frontend: %w", err)
	}

	informationalVersion, err := appInformationalVersion(ctx, git, ver)
	if err != nil {
		return nil, err
	}

	b.log.Info("Packing app backend packages...")
	if err := b.run(
		ctx,
		backendDir,
		nil,
		"dotnet",
		"pack",
		"solutions/Src.slnx",
		"-c",
		"Release",
		"--output",
		outputDir,
		"-p:AppPackageVersion="+ver.Num,
		fmt.Sprintf("-p:AppCompatVersion=%d.%d.%d.0", ver.Major, ver.Minor, ver.Patch),
		"-p:AppInformationalVersion="+informationalVersion,
		"-p:UseExperimentalPackageId=false",
	); err != nil {
		return nil, fmt.Errorf("pack app backend: %w", err)
	}

	artifacts, err := appPackageArtifacts(outputDir)
	if err != nil {
		return nil, err
	}
	if len(artifacts) == 0 {
		return nil, fmt.Errorf("no app package artifacts produced in %s", outputDir)
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
		return "", fmt.Errorf("get app package informational version commit: empty SHA")
	}
	return ver.Num + "+" + sha, nil
}

func (b *appBuilder) run(ctx context.Context, dir string, env []string, name string, args ...string) error {
	//nolint:gosec // G204: commands are fixed release build tools with fixed local arguments.
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Dir = dir
	if len(env) > 0 {
		cmd.Env = append(os.Environ(), env...)
	}

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("run %s %s: %w", name, strings.Join(args, " "), err)
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
