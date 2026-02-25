// Package run contains command-specific run application logic.
package run

import (
	"context"
	"fmt"
	"path/filepath"

	repocontext "altinn.studio/studioctl/internal/context"
)

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
func (s *Service) BuildDotnetRunSpec(appPath string, args, env []string) DotnetRunSpec {
	dotnetArgs := make([]string, 0, 3+len(args))
	dotnetArgs = append(dotnetArgs, "run", "--project", filepath.Join(appPath, "App"))
	dotnetArgs = append(dotnetArgs, args...)

	resolvedEnv := appendEnvIfUnset(env, "ASPNETCORE_ENVIRONMENT", "Development")

	return DotnetRunSpec{
		Args: dotnetArgs,
		Dir:  appPath,
		Env:  resolvedEnv,
	}
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
