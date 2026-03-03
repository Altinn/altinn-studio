package doctor

import (
	"context"
	"fmt"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
)

func (s *Service) collectPrerequisites(ctx context.Context) *Prerequisites {
	var prerequisites Prerequisites

	dotnetValue, dotnetErr := s.probeDotnet(ctx)
	prerequisites.DotnetValue = dotnetValue
	prerequisites.Dotnet = Check{
		Error: errorString(dotnetErr),
		OK:    dotnetErr == nil,
	}

	containerValue, containerErr := s.probeContainerRuntime(ctx)
	prerequisites.ContainerValue = containerValue
	prerequisites.Container = Check{
		Error: errorString(containerErr),
		OK:    containerErr == nil,
	}

	if runtime.GOOS == osWindows {
		windowsValue, windowsErr := s.probeWindowsVersion(ctx)
		prerequisites.WindowsValue = windowsValue
		prerequisites.Windows = &Check{
			OK:    windowsErr == nil,
			Error: errorString(windowsErr),
		}
	}

	return &prerequisites
}

func (s *Service) probeDotnet(ctx context.Context) (string, error) {
	output, err := exec.CommandContext(ctx, "dotnet", "--version").Output()
	if err != nil {
		return "", fmt.Errorf("checking dotnet version: %w", err)
	}

	version := strings.TrimSpace(string(output))
	major := extractMajorVersion(version)
	if major < minDotnetMajorVersion {
		return version, errDotnetVersionTooOld
	}

	return version, nil
}

func (s *Service) probeContainerRuntime(ctx context.Context) (string, error) {
	if err := exec.CommandContext(ctx, "docker", "info").Run(); err == nil {
		version := unknownValue
		if output, err := exec.CommandContext(ctx, "docker", "--version").Output(); err == nil {
			version = extractVersionFromOutput(strings.TrimSpace(string(output)))
		} else {
			s.debugf("docker --version failed: %v", err)
		}
		return "Docker (" + version + ")", nil
	}

	if err := exec.CommandContext(ctx, "podman", "info").Run(); err == nil {
		version := unknownValue
		if output, err := exec.CommandContext(ctx, "podman", "--version").Output(); err == nil {
			version = extractVersionFromOutput(strings.TrimSpace(string(output)))
		} else {
			s.debugf("podman --version failed: %v", err)
		}
		return "Podman (" + version + ")", nil
	}

	return "", errNoContainerRuntime
}

func (s *Service) probeWindowsVersion(ctx context.Context) (string, error) {
	_, osVersion := getWindowsVersion(ctx)
	if osVersion == "" {
		return "", errWindowsVersionUnk
	}

	build := extractWindowsBuild(osVersion)
	if build < minWindowsBuild {
		return osVersion, errWindowsVersionOld
	}

	return osVersion, nil
}

// extractWindowsBuild extracts the build number from a Windows version string.
// Input format: "10.0.17134.xxx" or "10.0.22631.4890".
// Returns 0 if parsing fails.
func extractWindowsBuild(version string) int {
	parts := strings.Split(version, ".")
	if len(parts) < minWindowsVersionParts {
		return 0
	}
	build, err := strconv.Atoi(parts[2])
	if err != nil {
		return 0
	}
	return build
}

func extractMajorVersion(version string) int {
	parts := strings.Split(version, ".")
	if len(parts) == 0 {
		return 0
	}
	major, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0
	}
	return major
}

func extractVersionFromOutput(output string) string {
	// Handle "Docker version 24.0.7, build afdd53b" or "podman version 4.9.0"
	parts := strings.Fields(output)
	for i, part := range parts {
		if part == "version" && i+1 < len(parts) {
			return strings.TrimSuffix(parts[i+1], ",")
		}
	}
	return output
}
