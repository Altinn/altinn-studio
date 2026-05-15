//nolint:forbidigo // This dev tool uses fmt.Print for simple CLI output.
package main

import (
	"context"
	"errors"
	"fmt"
	"os"

	"altinn.studio/devenv/pkg/processutil"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/osutil"
)

const (
	goArchAMD64 = "amd64"
	goArchARM64 = "arm64"
)

var errUnsupportedStudioctlServerRID = errors.New("unsupported " + config.StudioctlServerName + " runtime")

func publishStudioctlServerToDir(goos, goarch, publishDir, buildVersion string) (string, error) {
	fmt.Printf("Publishing %s...\n", config.StudioctlServerName)

	rid, err := dotnetRuntimeIdentifier(goos, goarch)
	if err != nil {
		return "", err
	}

	if err := os.RemoveAll(publishDir); err != nil {
		return "", fmt.Errorf("clean %s publish dir: %w", config.StudioctlServerName, err)
	}
	if err := os.MkdirAll(publishDir, dirPermDefault); err != nil {
		return "", fmt.Errorf("create %s publish dir: %w", config.StudioctlServerName, err)
	}

	args := []string{
		"publish",
		"./studioctl-server/studioctl-server.csproj",
		"-c", "Release",
		"-o", publishDir,
		"-r", rid,
		"--self-contained", "true",
		"-p:DebugType=None",
		"-p:DebugSymbols=false",
		"-p:InformationalVersion=" + buildVersion,
	}

	cmd := processutil.CommandContext(context.Background(), "dotnet", args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Dir = "."

	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("dotnet publish failed: %w", err)
	}

	return publishDir, nil
}

func dotnetRuntimeIdentifier(goos, goarch string) (string, error) {
	switch goos {
	case osutil.OSLinux:
		switch goarch {
		case goArchAMD64:
			return "linux-x64", nil
		case goArchARM64:
			return "linux-arm64", nil
		}
	case osutil.OSDarwin:
		switch goarch {
		case goArchAMD64:
			return "osx-x64", nil
		case goArchARM64:
			return "osx-arm64", nil
		}
	case osutil.OSWindows:
		switch goarch {
		case goArchAMD64:
			return "win-x64", nil
		case goArchARM64:
			return "win-arm64", nil
		}
	}

	return "", fmt.Errorf("%w: %s/%s", errUnsupportedStudioctlServerRID, goos, goarch)
}
