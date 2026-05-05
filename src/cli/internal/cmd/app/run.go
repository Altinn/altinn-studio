package app

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/studioctl/internal/appcontainers"
	"altinn.studio/studioctl/internal/appimage"
	"altinn.studio/studioctl/internal/appnaming"
	"altinn.studio/studioctl/internal/cmd/env/localtest/components"
	repocontext "altinn.studio/studioctl/internal/context"
	"altinn.studio/studioctl/internal/envtopology"
)

var (
	errAppProjectNotFound   = errors.New("app project not found")
	errInvalidAppMetadataID = errors.New("application metadata id must be on the form org/app")
	errMultipleAppProjects  = errors.New("multiple app projects found")
)

// TODO: this should come from the "current env".
const (
	localtestLoopbackHost           = "127.0.0.1"
	localtestAppContainerNamePrefix = "localtest-app-"
	appMetadataFile                 = "App/config/applicationmetadata.json"
)

// DotnetRunSpec contains build and subprocess execution details for native app run.
type DotnetRunSpec struct {
	Dir            string
	ProjectPath    string
	BaseURL        string
	AppArgs        []string
	BuildArgs      []string
	TargetPathArgs []string
	Env            []string
	Port           int
}

// DotnetRunOptions contains native run-specific app options.
type DotnetRunOptions struct {
	RandomHostPort bool
}

// DockerRunSpec contains container execution details for `studioctl app run --mode container`.
type DockerRunSpec struct {
	Config types.ContainerConfig
}

// DockerRunOptions contains docker run-specific app options.
type DockerRunOptions struct {
	ImageTag       string
	RandomHostPort bool
}

// RunTarget describes the app resolved for the app run command.
type RunTarget struct {
	AppID     string
	Detection repocontext.Detection
}

type appMetadata struct {
	ID string `json:"id"`
}

// ResolveRunTarget detects the target app directory.
func (s *Service) ResolveRunTarget(ctx context.Context, appPath string) (RunTarget, error) {
	result, err := repocontext.DetectFromCwd(ctx, appPath)
	if err != nil {
		return RunTarget{}, fmt.Errorf("detect app: %w", err)
	}
	if !result.InAppRepo {
		return RunTarget{}, repocontext.ErrAppNotFound
	}

	appID, err := readAppID(result.AppRoot)
	if err != nil {
		return RunTarget{}, fmt.Errorf("read app id: %w", err)
	}

	return RunTarget{
		AppID:     appID,
		Detection: result,
	}, nil
}

// BuildDotnetRunSpec builds arguments/environment for native app run.
func (s *Service) BuildDotnetRunSpec(
	_ context.Context,
	appPath string,
	args, env []string,
	topology envtopology.Local,
	opts DotnetRunOptions,
) (DotnetRunSpec, error) {
	projectPath, err := appProjectPath(appPath)
	if err != nil {
		return DotnetRunSpec{}, err
	}
	port := appcontainers.DefaultContainerPort
	if opts.RandomHostPort {
		port = "0"
	}
	baseURL := nativeAppBaseURL(port)

	return DotnetRunSpec{
		Dir:            filepath.Dir(projectPath),
		ProjectPath:    projectPath,
		BaseURL:        baseURL,
		Port:           nativeAppPort(port),
		AppArgs:        args,
		BuildArgs:      []string{"build", projectPath},
		TargetPathArgs: []string{"msbuild", projectPath, "-getProperty:TargetPath"},
		Env:            newAppRunEnv(env, baseURL, topology),
	}, nil
}

func readAppID(appPath string) (string, error) {
	metadataPath := filepath.Join(appPath, appMetadataFile)
	content, err := os.ReadFile(metadataPath) //nolint:gosec // App path is the detected local app root.
	if err != nil {
		return "", fmt.Errorf("read application metadata: %w", err)
	}

	var metadata appMetadata
	if err := json.Unmarshal(content, &metadata); err != nil {
		return "", fmt.Errorf("parse application metadata: %w", err)
	}

	appID := strings.TrimSpace(metadata.ID)
	if !validAppID(appID) {
		return "", errInvalidAppMetadataID
	}
	return appID, nil
}

func nativeAppBaseURL(port string) string {
	return "http://" + localtestLoopbackHost + ":" + port
}

func nativeAppPort(port string) int {
	value, err := strconv.Atoi(port)
	if err != nil {
		return 0
	}
	return value
}

// DotnetAppRunCommand returns the executable and args for a built .NET app target.
func DotnetAppRunCommand(targetPath string, args []string) (string, []string) {
	if strings.EqualFold(filepath.Ext(targetPath), ".dll") {
		dotnetArgs := make([]string, 0, 1+len(args))
		dotnetArgs = append(dotnetArgs, targetPath)
		dotnetArgs = append(dotnetArgs, args...)
		return "dotnet", dotnetArgs
	}

	runArgs := make([]string, 0, len(args))
	runArgs = append(runArgs, args...)
	return targetPath, runArgs
}

func appProjectPath(appPath string) (string, error) {
	projectPaths, err := filepath.Glob(filepath.Join(appPath, "App", "*.csproj"))
	if err != nil {
		return "", fmt.Errorf("find app project: %w", err)
	}
	if len(projectPaths) == 0 {
		return "", fmt.Errorf("%w: %s", errAppProjectNotFound, filepath.Join(appPath, "App"))
	}
	if len(projectPaths) > 1 {
		return "", fmt.Errorf("%w: %s", errMultipleAppProjects, filepath.Join(appPath, "App"))
	}
	return projectPaths[0], nil
}

func validAppID(appID string) bool {
	org, app, ok := strings.Cut(appID, "/")
	return ok && org != "" && app != "" && !strings.Contains(app, "/")
}

// BuildDockerRunSpec builds image/container configuration for an app container.
func (s *Service) BuildDockerRunSpec(
	result repocontext.Detection,
	args []string,
	topology envtopology.Local,
	opts DockerRunOptions,
) (DockerRunSpec, error) {
	appPath := result.AppRoot
	appName := appnaming.AppNameFromPath(appPath)
	hostPort := appcontainers.DefaultContainerPort
	if opts.RandomHostPort {
		hostPort = ""
	}

	imageTag := opts.ImageTag
	if imageTag == "" {
		imageTag = appimage.DefaultLocalTag(appPath)
	}

	return DockerRunSpec{
		Config: types.ContainerConfig{
			Labels:         appcontainers.Labels(appPath),
			HealthCheck:    nil,
			Name:           localtestAppContainerNamePrefix + appName,
			Image:          imageTag,
			User:           "",
			RestartPolicy:  "",
			ExtraHosts:     nil,
			NetworkAliases: nil,
			Volumes:        nil,
			Networks: []string{
				components.NetworkName,
			},
			Ports: []types.PortMapping{
				{
					HostIP:        localtestLoopbackHost,
					HostPort:      hostPort,
					ContainerPort: appcontainers.DefaultContainerPort,
					Protocol:      "tcp",
				},
			},
			Env:     newAppRunEnv(nil, "http://*:"+appcontainers.DefaultContainerPort, topology),
			Command: args,
			CapAdd:  nil,
			Detach:  true,
		},
	}, nil
}
