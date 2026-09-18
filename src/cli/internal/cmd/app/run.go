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
	"altinn.studio/studioctl/internal/appsecrets"
	"altinn.studio/studioctl/internal/cmd/env/localtest/components"
	repocontext "altinn.studio/studioctl/internal/context"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/osutil"
)

// ContainerKeysDir is where a containerized run persists its data-protection keys - the path the platform
// mounts a volume at for a deployed app.
const ContainerKeysDir = "/mnt/keys"

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
	SecretsDir     string
	AppArgs        []string
	BuildArgs      []string
	TargetPathArgs []string
	Env            []string
	Port           int
}

// DotnetRunOptions contains native run-specific app options.
type DotnetRunOptions struct {
	AppFrontendAssetBaseUrl string
	RandomHostPort          bool
}

// DockerRunSpec contains container execution details for `studioctl app run --mode container`.
type DockerRunSpec struct {
	SecretsDir string
	KeysDir    string
	Config     types.ContainerConfig
}

// DockerRunOptions contains docker run-specific app options.
type DockerRunOptions struct {
	ImageTag                string
	AppFrontendAssetBaseUrl string
	RandomHostPort          bool
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
	// Created here rather than at the point the app starts, so that `studioctl app env` - which builds this
	// spec and prints it for an app started from an IDE - leaves behind the same directory `app run` would.
	secretsDir, err := s.ensureAppSecretsDir(appPath)
	if err != nil {
		return DotnetRunSpec{}, err
	}

	return DotnetRunSpec{
		Dir:            filepath.Dir(projectPath),
		ProjectPath:    projectPath,
		BaseURL:        baseURL,
		SecretsDir:     secretsDir,
		Port:           nativeAppPort(port),
		AppArgs:        args,
		BuildArgs:      []string{"build", projectPath},
		TargetPathArgs: []string{"msbuild", projectPath, "-getProperty:TargetPath"},
		Env:            newAppRunEnv(env, baseURL, topology, opts.AppFrontendAssetBaseUrl, secretsDir, ""),
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
	secretsDir, err := s.ensureAppSecretsDir(appPath)
	if err != nil {
		return DockerRunSpec{}, err
	}
	keysDir := s.appKeysDirOrEmpty(appPath)
	keysDirEnv := ""
	if keysDir != "" {
		keysDirEnv = ContainerKeysDir
	}

	return DockerRunSpec{
		SecretsDir: secretsDir,
		KeysDir:    keysDir,
		Config: types.ContainerConfig{
			Labels:      appcontainers.Labels(appPath),
			HealthCheck: nil,
			Name:        localtestAppContainerNamePrefix + appName,
			Image:       imageTag,
			// User, UsernsMode and the mounts' SELinux labels depend on the runtime and are set by
			// PrepareDockerRun once it is known.
			User:           "",
			UsernsMode:     "",
			RestartPolicy:  "",
			ExtraHosts:     nil,
			NetworkAliases: nil,
			Volumes:        appMounts(secretsDir, keysDir),
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
			// The container is named the mount point its secrets directory is mounted at, and is told where
			// its keys go, exactly as a deployed app is told both.
			Env: newAppRunEnv(
				nil,
				"http://*:"+appcontainers.DefaultContainerPort,
				topology,
				opts.AppFrontendAssetBaseUrl,
				appsecrets.ContainerDir,
				keysDirEnv,
			),
			Command: args,
			CapAdd:  nil,
			Detach:  true,
		},
	}, nil
}

// PrepareDockerRun readies a spec for the runtime it is about to run on. The keys directory it mounts is
// created first (a missing one is otherwise created by the runtime, on Linux as root, where everything else
// under the studioctl home is the developer's; the secrets directory already exists, created when the spec
// was built), and the container runs as the developer with the userns and SELinux handling the localtest
// containers use: the mounted secrets are owner-only on the host, and a deployed app likewise runs as the
// one user that can read its secret. The image's own user (uid 1000) could not read them on a Linux host
// with another uid.
func (s *Service) PrepareDockerRun(spec *DockerRunSpec, toolchain types.ContainerToolchain) error {
	if spec.KeysDir != "" {
		if err := os.MkdirAll(spec.KeysDir, osutil.DirPermOwnerOnly); err != nil {
			return fmt.Errorf("create app directory %s: %w", filepath.Base(spec.KeysDir), err)
		}
	}
	user, usernsMode, relabel := components.RuntimeUser(toolchain)
	spec.Config.User = user
	spec.Config.UsernsMode = usernsMode
	spec.Config.Volumes = components.RelabelBindMounts(spec.Config.Volumes, relabel)
	return nil
}

// appMounts gives the container what the platform gives a deployed app: its secrets directory read-only at
// /mnt/app-secrets and a writable directory for data-protection keys at /mnt/keys. The secrets mount is
// always there - every run has a secrets directory - while the keys mount depends on studioctl having
// somewhere to persist them. The secrets directory is mounted rather than the file, so that a client stored
// while the container runs - an atomic replace on the host - is seen inside it.
func appMounts(secretsDir, keysDir string) []types.VolumeMount {
	mounts := []types.VolumeMount{
		{
			HostPath:       secretsDir,
			ContainerPath:  appsecrets.ContainerDir,
			Type:           types.VolumeMountTypeBind,
			SELinuxRelabel: types.SELinuxRelabelNone,
			ReadOnly:       true,
		},
	}
	if keysDir != "" {
		mounts = append(mounts, types.VolumeMount{
			HostPath:       keysDir,
			ContainerPath:  ContainerKeysDir,
			Type:           types.VolumeMountTypeBind,
			SELinuxRelabel: types.SELinuxRelabelNone,
			ReadOnly:       false,
		})
	}
	return mounts
}
