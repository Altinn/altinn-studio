//nolint:forbidigo // This dev tool uses fmt.Print for simple CLI output.
package main

import (
	"context"
	"errors"
	"fmt"
	"os"

	"altinn.studio/devenv/pkg/processutil"
	"altinn.studio/studioctl/internal/osutil"
)

const (
	goArchAMD64 = "amd64"
	goArchARM64 = "arm64"
)

var errUnsupportedAppManagerRID = errors.New("unsupported app-manager runtime")

func publishAppManagerToDir(goos, goarch, publishDir string) (string, error) {
	fmt.Println("Publishing app-manager...")

	rid, err := dotnetRuntimeIdentifier(goos, goarch)
	if err != nil {
		return "", err
	}

	if err := os.RemoveAll(publishDir); err != nil {
		return "", fmt.Errorf("clean app-manager publish dir: %w", err)
	}
	if err := os.MkdirAll(publishDir, dirPermDefault); err != nil {
		return "", fmt.Errorf("create app-manager publish dir: %w", err)
	}

	args := []string{
		"publish",
		"./app-manager/app-manager.csproj",
		"-c", "Release",
		"-o", publishDir,
		"-r", rid,
		"--self-contained", "true",
		"-p:DebugType=None",
		"-p:DebugSymbols=false",
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

	return "", fmt.Errorf("%w: %s/%s", errUnsupportedAppManagerRID, goos, goarch)
}
