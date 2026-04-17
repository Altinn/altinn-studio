package cmd

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"

	containerruntime "altinn.studio/devenv/pkg/container"
	"altinn.studio/studioctl/internal/appimage"
	repocontext "altinn.studio/studioctl/internal/context"
	"altinn.studio/studioctl/internal/osutil"
)

func (c *AppCommand) runBuild(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("app build", flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	var appPath string
	var mode string
	var imageTag string
	var push bool
	fs.StringVar(&appPath, "p", "", "App directory path")
	fs.StringVar(&appPath, "path", "", "App directory path")
	fs.StringVar(&mode, "m", runModeContainer, "Build mode")
	fs.StringVar(&mode, "mode", runModeContainer, "Build mode")
	fs.StringVar(&imageTag, "image-tag", "", "App container image tag")
	fs.BoolVar(&push, "push", false, "Push app container image after build")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			c.out.Print(c.appBuildUsage())
			return nil
		}
		return fmt.Errorf("parsing flags: %w", err)
	}
	if mode != runModeContainer {
		return fmt.Errorf("%w: %s", ErrUnsupportedRuntime, mode)
	}
	if push && imageTag == "" {
		return fmt.Errorf("%w: --push requires --image-tag", ErrInvalidFlagValue)
	}

	result, err := c.service.ResolveTarget(ctx, appPath)
	if err != nil {
		if errors.Is(err, repocontext.ErrAppNotFound) {
			return fmt.Errorf("%w: run from an app directory or use -p to specify path", ErrNoAppFound)
		}
		return fmt.Errorf("detect app: %w", err)
	}

	spec, err := appimage.BuildSpecForApp(result, imageTag)
	if err != nil {
		return fmt.Errorf("build docker image spec: %w", err)
	}
	cleanupDockerfile, err := appimage.MaterializeDockerfile(&spec)
	if err != nil {
		return fmt.Errorf("materialize dockerfile: %w", err)
	}
	defer cleanupGeneratedDockerfile(c.out, cleanupDockerfile)

	client, err := containerruntime.Detect(ctx)
	if err != nil {
		return fmt.Errorf("connect to container runtime: %w", err)
	}
	defer func() {
		if cerr := client.Close(); cerr != nil {
			c.out.Verbosef("failed to close container client: %v", cerr)
		}
	}()

	c.out.Verbosef("Building app image %s", spec.ImageTag)
	if err := client.Build(ctx, spec.ContextPath, spec.Dockerfile, spec.ImageTag, spec.Build); err != nil {
		return fmt.Errorf("build app image: %w", err)
	}
	c.out.Printlnf("Image: %s", spec.ImageTag)

	if push {
		c.out.Verbosef("Pushing app image %s", spec.ImageTag)
		if err := client.Push(ctx, spec.ImageTag); err != nil {
			return fmt.Errorf("push app image: %w", err)
		}
		c.out.Printlnf("Pushed: %s", spec.ImageTag)
	}

	return nil
}

func (c *AppCommand) appBuildUsage() string {
	return joinLines(
		fmt.Sprintf("Usage: %s app build [-p PATH] [--image-tag IMAGE] [--push]", osutil.CurrentBin()),
		"",
		"Builds an Altinn app container image.",
		"",
		"Options:",
		"  -p, --path PATH       Specify app directory (overrides auto-detect)",
		"  -m, --mode MODE       Build mode: container (default: container)",
		"  --image-tag IMAGE     App container image tag",
		"  --push                Push app container image after build",
		"  -h, --help            Show this help",
	)
}
