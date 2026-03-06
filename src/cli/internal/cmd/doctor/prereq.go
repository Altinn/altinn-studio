package doctor

import (
	"context"
	"fmt"
	"os"
	"runtime"
	"slices"
	"strconv"
	"strings"

	"altinn.studio/devenv/pkg/container"
)

func (s *Service) collectPrerequisites(ctx context.Context) *Prerequisites {
	var prerequisites Prerequisites

	dotnetValue, dotnetErr := s.probeDotnet(ctx)
	prerequisites.DotnetValue = dotnetValue
	prerequisites.Dotnet = Check{
		Error: errorString(dotnetErr),
		OK:    dotnetErr == nil,
	}

	containerValue, containerResolved, containerTools, containerErr := s.probeContainerRuntime(ctx)
	prerequisites.ContainerValue = containerValue
	prerequisites.ContainerResolved = containerResolved
	prerequisites.ContainerTools = containerTools
	prerequisites.ContainerHost = strings.TrimSpace(os.Getenv("DOCKER_HOST"))
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
	output, err := s.runCommandOutput(ctx, "dotnet", "--version")
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

func (s *Service) probeContainerRuntime(ctx context.Context) (string, string, []ContainerTool, error) {
	tools := s.collectContainerTools(ctx)

	detect := container.Detect
	if s != nil && s.containerDetect != nil {
		detect = s.containerDetect
	}

	cli, err := detect(ctx)
	if err != nil {
		return "", "", tools, fmt.Errorf("%w: %w", errNoContainerRuntime, err)
	}
	defer func() {
		if closeErr := cli.Close(); closeErr != nil {
			s.debugf("container client close failed: %v", closeErr)
		}
	}()

	installation := cli.Installation().String()
	version := containerToolVersion(tools, strings.ToLower(installation))
	if version == "" {
		version = unknownValue
	}

	return installation + " (" + version + ")", cli.Name() + " -> " + installation, tools, nil
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

func (s *Service) collectContainerTools(ctx context.Context) []ContainerTool {
	toolNames := []string{"colima", "docker", "podman"}
	tools := make([]ContainerTool, 0, len(toolNames))

	for _, name := range toolNames {
		if _, err := s.lookupPath(name); err != nil {
			continue
		}

		version := unknownValue
		output, err := s.runCommandOutput(ctx, name, "--version")
		if err != nil {
			s.debugf("%s --version failed: %v", name, err)
		} else if parsed := extractVersionFromOutput(strings.TrimSpace(string(output))); parsed != "" {
			version = parsed
		}

		tools = append(tools, ContainerTool{
			Name:    name,
			Version: version,
		})
	}

	slices.SortFunc(tools, func(a, b ContainerTool) int {
		return strings.Compare(a.Name, b.Name)
	})
	return tools
}

func containerToolVersion(tools []ContainerTool, name string) string {
	for _, tool := range tools {
		if tool.Name == name {
			return tool.Version
		}
	}
	return ""
}
