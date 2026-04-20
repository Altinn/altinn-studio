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
	envlocaltest "altinn.studio/studioctl/internal/cmd/env/localtest"
	repocontext "altinn.studio/studioctl/internal/context"
	"altinn.studio/studioctl/internal/networking"
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

func localtestEnvDefaults(
	platformEndpoint, otelEndpoint, pdfEndpoint, workflowEngineEndpoint string,
) map[string]string {
	return map[string]string{
		"AppSettings__OpenIdWellKnownEndpoint":          platformEndpoint + "/authentication/api/v1/openid/",
		"GeneralSettings__ExternalAppBaseUrl":           localtestExternalAppBaseURL(),
		"OTEL_EXPORTER_OTLP_ENDPOINT":                   otelEndpoint,
		"PlatformSettings__ApiStorageEndpoint":          platformEndpoint + "/storage/api/v1/",
		"PlatformSettings__ApiRegisterEndpoint":         platformEndpoint + "/register/api/v1/",
		"PlatformSettings__ApiProfileEndpoint":          platformEndpoint + "/profile/api/v1/",
		"PlatformSettings__ApiAuthenticationEndpoint":   platformEndpoint + "/authentication/api/v1/",
		"PlatformSettings__ApiAuthorizationEndpoint":    platformEndpoint + "/authorization/api/v1/",
		"PlatformSettings__ApiEventsEndpoint":           platformEndpoint + "/events/api/v1/",
		"PlatformSettings__ApiPdf2Endpoint":             pdfEndpoint,
		"PlatformSettings__ApiNotificationEndpoint":     platformEndpoint + "/notifications/api/v1/",
		"PlatformSettings__ApiCorrespondenceEndpoint":   platformEndpoint + "/correspondence/api/v1/",
		"PlatformSettings__ApiAccessManagementEndpoint": platformEndpoint + "/accessmanagement/api/v1/",
		"PlatformSettings__ApiWorkflowEngineEndpoint":   workflowEngineEndpoint,
	}
}

func localtestExternalAppBaseURL() string {
	return "http://" + networking.LocalDomain + ":" + envlocaltest.DefaultLoadBalancerPortString() + "/{org}/{app}/"
}

func nativeLocaltestEnvDefaults() map[string]string {
	return localtestEnvDefaults(
		"http://"+localtestLoopbackHost+":5101",
		"http://"+localtestLoopbackHost+":4317",
		"http://"+localtestLoopbackHost+":5300/pdf",
		"http://workflow-engine."+networking.LocalDomain+":"+envlocaltest.DefaultLoadBalancerPortString()+"/api/v1/",
	)
}

func dockerLocaltestEnvDefaults() map[string]string {
	return localtestEnvDefaults(
		"http://"+envlocaltest.ContainerLocaltest+":5101",
		"http://"+envlocaltest.ContainerMonitoringOtelCollector+":4317",
		"http://"+envlocaltest.ContainerPDF3+":5031/pdf",
		"http://"+envlocaltest.ContainerWorkflowEngine+":8080/api/v1/",
	)
}

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

	resolvedEnv := appendEnvIfUnset(env, "ASPNETCORE_ENVIRONMENT", "Development")
	resolvedEnv = appendEnvIfUnset(
		resolvedEnv,
		"Kestrel__EndPoints__Http__Url",
		baseURL,
	)
	resolvedEnv = appendLocaltestEnvIfUnset(resolvedEnv)

	return DotnetRunSpec{
		Dir:            filepath.Dir(projectPath),
		ProjectPath:    projectPath,
		BaseURL:        baseURL,
		Port:           nativeAppPort(port),
		AppArgs:        args,
		BuildArgs:      []string{"build", projectPath},
		TargetPathArgs: []string{"msbuild", projectPath, "-getProperty:TargetPath"},
		Env:            resolvedEnv,
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
	opts DockerRunOptions,
) (DockerRunSpec, error) {
	appPath := result.AppRoot
	appName := appnaming.AppNameFromPath(appPath)
	hostPort := appcontainers.DefaultContainerPort
	if opts.RandomHostPort {
		hostPort = ""
	}

	env := appendEnvIfUnset(nil, "ASPNETCORE_ENVIRONMENT", "Development")
	env = appendEnvIfUnset(env, "Kestrel__EndPoints__Http__Url", "http://*:"+appcontainers.DefaultContainerPort)
	env = appendDockerLocaltestEnvIfUnset(env)

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
				envlocaltest.NetworkName,
			},
			Ports: []types.PortMapping{
				{
					HostIP:        localtestLoopbackHost,
					HostPort:      hostPort,
					ContainerPort: appcontainers.DefaultContainerPort,
					Protocol:      "tcp",
				},
			},
			Env:     env,
			Command: args,
			CapAdd:  nil,
			Detach:  true,
		},
	}, nil
}

func appendLocaltestEnvIfUnset(env []string) []string {
	resolved := env
	for key, value := range nativeLocaltestEnvDefaults() {
		resolved = appendEnvIfUnset(resolved, key, value)
	}
	return resolved
}

func appendDockerLocaltestEnvIfUnset(env []string) []string {
	resolved := env
	for key, value := range dockerLocaltestEnvDefaults() {
		resolved = appendEnvIfUnset(resolved, key, value)
	}
	return resolved
}

func appendEnvIfUnset(env []string, key, value string) []string {
	prefix := key + "="
	for _, e := range env {
		if len(e) >= len(prefix) && e[:len(prefix)] == prefix {
			return env
		}
	}
	return append(env, key+"="+value)
}
