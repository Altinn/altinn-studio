// Package run contains command-specific run application logic.
package run

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/studioctl/internal/appcontainers"
	"altinn.studio/studioctl/internal/appimage"
	"altinn.studio/studioctl/internal/appnaming"
	envlocaltest "altinn.studio/studioctl/internal/cmd/env/localtest"
	repocontext "altinn.studio/studioctl/internal/context"
	"altinn.studio/studioctl/internal/networking"
)

var errInvalidAppMetadataID = errors.New("application metadata id must be on the form org/app")

// TODO: this should come from the "current env".
const (
	localtestLoopbackHost           = "127.0.0.1"
	localtestAppContainerNamePrefix = "localtest-app-"
	appMetadataFile                 = "App/config/applicationmetadata.json"
)

func localtestEnvDefaults(host, otelEndpoint, pdfEndpoint, workflowEngineEndpoint string) map[string]string {
	return map[string]string{
		"AppSettings__OpenIdWellKnownEndpoint":          "http://" + host + ":5101/authentication/api/v1/openid/",
		"GeneralSettings__ExternalAppBaseUrl":           localtestExternalAppBaseURL(),
		"OTEL_EXPORTER_OTLP_ENDPOINT":                   otelEndpoint,
		"PlatformSettings__ApiStorageEndpoint":          "http://" + host + ":5101/storage/api/v1/",
		"PlatformSettings__ApiRegisterEndpoint":         "http://" + host + ":5101/register/api/v1/",
		"PlatformSettings__ApiProfileEndpoint":          "http://" + host + ":5101/profile/api/v1/",
		"PlatformSettings__ApiAuthenticationEndpoint":   "http://" + host + ":5101/authentication/api/v1/",
		"PlatformSettings__ApiAuthorizationEndpoint":    "http://" + host + ":5101/authorization/api/v1/",
		"PlatformSettings__ApiEventsEndpoint":           "http://" + host + ":5101/events/api/v1/",
		"PlatformSettings__ApiPdf2Endpoint":             pdfEndpoint,
		"PlatformSettings__ApiNotificationEndpoint":     "http://" + host + ":5101/notifications/api/v1/",
		"PlatformSettings__ApiCorrespondenceEndpoint":   "http://" + host + ":5101/correspondence/api/v1/",
		"PlatformSettings__ApiAccessManagementEndpoint": "http://" + host + ":5101/accessmanagement/api/v1/",
		"PlatformSettings__ApiWorkflowEngineEndpoint":   workflowEngineEndpoint,
	}
}

func localtestExternalAppBaseURL() string {
	return "http://" + networking.LocalDomain + ":" + envlocaltest.DefaultLoadBalancerPortString() + "/{org}/{app}/"
}

func nativeLocaltestEnvDefaults() map[string]string {
	return localtestEnvDefaults(
		localtestLoopbackHost,
		"http://"+localtestLoopbackHost+":4317",
		"http://"+localtestLoopbackHost+":5300/pdf",
		"http://"+localtestLoopbackHost+":8080/api/v1/",
	)
}

func dockerLocaltestEnvDefaults() map[string]string {
	return localtestEnvDefaults(
		envlocaltest.ContainerLocaltest,
		"http://"+envlocaltest.ContainerMonitoringOtelCollector+":4317",
		"http://"+envlocaltest.ContainerPDF3+":5031/pdf",
		"http://"+envlocaltest.ContainerWorkflowEngine+":8080/api/v1/",
	)
}

// Service contains run command logic.
type Service struct{}

// NewService creates a new run command service.
func NewService() *Service {
	return &Service{}
}

// DotnetRunSpec contains subprocess execution details for `dotnet run`.
type DotnetRunSpec struct {
	Dir     string
	BaseURL string
	Args    []string
	Env     []string
}

// DockerRunSpec contains container execution details for `studioctl run --mode container`.
type DockerRunSpec struct {
	Config types.ContainerConfig
}

// DockerRunOptions contains docker run-specific app options.
type DockerRunOptions struct {
	ImageTag       string
	RandomHostPort bool
}

// Target describes the app resolved for a run command.
type Target struct {
	AppID     string
	Detection repocontext.Detection
}

type appMetadata struct {
	ID string `json:"id"`
}

// ResolveApp detects the target app directory.
func (s *Service) ResolveApp(ctx context.Context, appPath string) (Target, error) {
	result, err := repocontext.DetectFromCwd(ctx, appPath)
	if err != nil {
		return Target{}, fmt.Errorf("detect app: %w", err)
	}
	if !result.InAppRepo {
		return Target{}, repocontext.ErrAppNotFound
	}

	appID, err := readAppID(result.AppRoot)
	if err != nil {
		return Target{}, fmt.Errorf("read app id: %w", err)
	}

	return Target{
		AppID:     appID,
		Detection: result,
	}, nil
}

// BuildDotnetRunSpec builds arguments/environment for `dotnet run`.
func (s *Service) BuildDotnetRunSpec(_ context.Context, appPath string, args, env []string) DotnetRunSpec {
	dotnetArgs := make([]string, 0, 3+len(args))
	dotnetArgs = append(dotnetArgs, "run", "--project", filepath.Join(appPath, "App"))
	dotnetArgs = append(dotnetArgs, args...)

	resolvedEnv := appendEnvIfUnset(env, "ASPNETCORE_ENVIRONMENT", "Development")
	resolvedEnv = appendEnvIfUnset(
		resolvedEnv,
		"Kestrel__EndPoints__Http__Url",
		"http://"+localtestLoopbackHost+":"+appcontainers.DefaultContainerPort,
	)
	resolvedEnv = appendLocaltestEnvIfUnset(resolvedEnv)

	return DotnetRunSpec{
		Dir:     appPath,
		BaseURL: nativeAppBaseURL(),
		Args:    dotnetArgs,
		Env:     resolvedEnv,
	}
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

func nativeAppBaseURL() string {
	return "http://" + localtestLoopbackHost + ":" + appcontainers.DefaultContainerPort
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
