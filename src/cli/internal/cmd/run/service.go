// Package run contains command-specific run application logic.
package run

import (
	"context"
	"fmt"
	"path/filepath"

	repocontext "altinn.studio/studioctl/internal/context"
)

// TODO: this should come from the "current env".
const localtestLoopbackHost = "127.0.0.1"

func localtestEnvDefaults() map[string]string {
	return map[string]string{
		"AppSettings__OpenIdWellKnownEndpoint":          "http://" + localtestLoopbackHost + ":5101/authentication/api/v1/openid/",
		"OTEL_EXPORTER_OTLP_ENDPOINT":                   "http://" + localtestLoopbackHost + ":4317",
		"PlatformSettings__ApiStorageEndpoint":          "http://" + localtestLoopbackHost + ":5101/storage/api/v1/",
		"PlatformSettings__ApiRegisterEndpoint":         "http://" + localtestLoopbackHost + ":5101/register/api/v1/",
		"PlatformSettings__ApiProfileEndpoint":          "http://" + localtestLoopbackHost + ":5101/profile/api/v1/",
		"PlatformSettings__ApiAuthenticationEndpoint":   "http://" + localtestLoopbackHost + ":5101/authentication/api/v1/",
		"PlatformSettings__ApiAuthorizationEndpoint":    "http://" + localtestLoopbackHost + ":5101/authorization/api/v1/",
		"PlatformSettings__ApiEventsEndpoint":           "http://" + localtestLoopbackHost + ":5101/events/api/v1/",
		"PlatformSettings__ApiPdf2Endpoint":             "http://" + localtestLoopbackHost + ":5300/pdf",
		"PlatformSettings__ApiNotificationEndpoint":     "http://" + localtestLoopbackHost + ":5101/notifications/api/v1/",
		"PlatformSettings__ApiCorrespondenceEndpoint":   "http://" + localtestLoopbackHost + ":5101/correspondence/api/v1/",
		"PlatformSettings__ApiAccessManagementEndpoint": "http://" + localtestLoopbackHost + ":5101/accessmanagement/api/v1/",
	}
}

// Service contains run command logic.
type Service struct{}

// NewService creates a new run command service.
func NewService() *Service {
	return &Service{}
}

// DotnetRunSpec contains subprocess execution details for `dotnet run`.
type DotnetRunSpec struct {
	Args []string
	Dir  string
	Env  []string
}

// ResolveApp detects the target app directory.
func (s *Service) ResolveApp(ctx context.Context, appPath string) (repocontext.Detection, error) {
	result, err := repocontext.DetectFromCwd(ctx, appPath)
	if err != nil {
		return repocontext.Detection{}, fmt.Errorf("detect app: %w", err)
	}
	if !result.InAppRepo {
		return repocontext.Detection{}, repocontext.ErrAppNotFound
	}
	return result, nil
}

// BuildDotnetRunSpec builds arguments/environment for `dotnet run`.
func (s *Service) BuildDotnetRunSpec(_ context.Context, appPath string, args, env []string) DotnetRunSpec {
	dotnetArgs := make([]string, 0, 3+len(args))
	dotnetArgs = append(dotnetArgs, "run", "--project", filepath.Join(appPath, "App"))
	dotnetArgs = append(dotnetArgs, args...)

	resolvedEnv := appendEnvIfUnset(env, "ASPNETCORE_ENVIRONMENT", "Development")
	resolvedEnv = appendLocaltestEnvIfUnset(resolvedEnv)

	return DotnetRunSpec{
		Args: dotnetArgs,
		Dir:  appPath,
		Env:  resolvedEnv,
	}
}

func appendLocaltestEnvIfUnset(env []string) []string {
	resolved := env
	for key, value := range localtestEnvDefaults() {
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
