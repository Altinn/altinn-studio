package app

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strconv"
	"strings"

	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/studioctl/internal/appcontainers"
	"altinn.studio/studioctl/internal/appimage"
	"altinn.studio/studioctl/internal/appnaming"
	"altinn.studio/studioctl/internal/appsecrets"
	"altinn.studio/studioctl/internal/cmd/env/localtest/components"
	"altinn.studio/studioctl/internal/cmd/env/stack"
	repocontext "altinn.studio/studioctl/internal/context"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/localtestv2"
	"altinn.studio/studioctl/internal/localtestv2/manifest"
	"altinn.studio/studioctl/internal/osutil"
)

// ContainerKeysDir is where a containerized run persists its data-protection keys - the path the platform
// mounts a volume at for a deployed app.
const ContainerKeysDir = "/mnt/keys"

var (
	// ErrContainerModeCustomOrigin is returned for a container run while localtest-v2 runs at another origin than the
	// default one (env up --host, --port): container mode supports the standard domains only.
	ErrContainerModeCustomOrigin = errors.New("run --mode container supports the default origin only")
	errAppProjectNotFound        = errors.New("app project not found")
	errInvalidAppMetadataID      = errors.New("application metadata id must be on the form org/app")
	errMultipleAppProjects       = errors.New("multiple app projects found")
)

// TODO: this should come from the "current env".
const (
	localtestLoopbackHost = "127.0.0.1"
	// allInterfacesHost is where an app listens while the localtest-v2 runtime is up: its front door, in a container,
	// reaches the app through the runtime's host gateway (host.docker.internal), which loopback does not answer.
	allInterfacesHost = "0.0.0.0"
	// hostGateway is the container runtime's name for the host in --add-host, where the public port is published.
	hostGateway                     = "host-gateway"
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

	appID, err := ReadAppID(result.AppRoot)
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
	ctx context.Context,
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
	// Created and filled here rather than at the point the app starts, because `studioctl app env` only
	// prints an environment - and that environment is how an app started from an IDE is configured, so the
	// directory and the codes the app reads from it have to be in place by the time the spec is printed,
	// not by the time `app run` would have launched something.
	secretsDir, err := s.ensureAppSecretsDir(appPath)
	if err != nil {
		return DotnetRunSpec{}, err
	}
	if err := s.provisionAppSecrets(secretsDir); err != nil {
		return DotnetRunSpec{}, err
	}
	signing, signingErr := s.nativeAccessTokenSigning(ctx, appPath)
	if signingErr != nil {
		return DotnetRunSpec{}, signingErr
	}
	kestrelURL := baseURL
	if signing != nil {
		// localtest-v2 is up: its front door needs the app on every interface.
		kestrelURL = "http://" + allInterfacesHost + ":" + port
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
		Env:            newAppRunEnv(env, kestrelURL, topology, opts.AppFrontendAssetBaseUrl, secretsDir, "", signing),
	}, nil
}

// nativeAccessTokenSigning points a process run at the localtest-v2 certificate, or returns nil when that
// runtime does not run. KeysFolder is a traversal from the app root (the parent of the App/ working
// directory) to the certificate directory, which is what the 1.x client resolves.
func (s *Service) nativeAccessTokenSigning(ctx context.Context, appPath string) (*accessTokenSigning, error) {
	v2, err := localtestv2.Current(ctx, s.cfg, s.containers)
	if err != nil {
		return nil, fmt.Errorf("find localtest-v2: %w", err)
	}
	if !v2.Running {
		return nil, nil //nolint:nilnil // nil is "no localtest-v2", not a failure.
	}
	state := v2.State
	appRoot, err := filepath.Abs(appPath)
	if err != nil {
		return nil, fmt.Errorf("resolve app path: %w", err)
	}
	rel, err := filepath.Rel(appRoot, state.CertificateDir)
	if err != nil {
		return nil, fmt.Errorf("relate certificate directory to app: %w", err)
	}
	return &accessTokenSigning{
		FullPath:     state.CertificatePath(),
		KeysFolder:   "/" + filepath.ToSlash(rel) + "/",
		FileName:     localtestv2.CertificateFileName,
		arbeidsflate: arbeidsflateUp(state),
	}, nil
}

// arbeidsflateUp reports whether the environment runs the arbeidsflate group. The group's name is the component's: the
// manifest's arbeidsflate group runs the arbeidsflate container.
func arbeidsflateUp(state localtestv2.State) bool {
	return slices.Contains(state.Groups, string(envtopology.ComponentArbeidsflate))
}

// ReadAppID returns the app id declared in an app directory's application metadata. Exported because
// the app's secrets directory is named after it, and doctor reports on that directory too.
func ReadAppID(appPath string) (string, error) {
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

// BuildDockerRunSpec builds image/container configuration for an app container: on the localtest runtime's network,
// or, while localtest-v2 runs, on its network (onStackNetwork).
func (s *Service) BuildDockerRunSpec(
	ctx context.Context,
	result repocontext.Detection,
	args []string,
	topology envtopology.Local,
	opts DockerRunOptions,
) (DockerRunSpec, error) {
	v2, err := localtestv2.Current(ctx, s.cfg, s.containers)
	if err != nil {
		return DockerRunSpec{}, fmt.Errorf("find localtest-v2: %w", err)
	}
	if v2.Running {
		if originErr := checkContainerOrigin(v2.State); originErr != nil {
			return DockerRunSpec{}, originErr
		}
	}
	appPath := result.AppRoot
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
	if err := s.provisionAppSecrets(secretsDir); err != nil {
		return DockerRunSpec{}, err
	}
	keysDir := s.appKeysDirOrEmpty(appPath)
	keysDirEnv := ""
	if keysDir != "" {
		keysDirEnv = ContainerKeysDir
	}

	spec := DockerRunSpec{
		SecretsDir: secretsDir,
		KeysDir:    keysDir,
		Config:     appContainerConfig(appPath, imageTag, hostPort, secretsDir, keysDir, args),
	}
	kestrelURL := "http://*:" + appcontainers.DefaultContainerPort
	var signing *accessTokenSigning
	if v2.Running {
		appID, idErr := ReadAppID(appPath)
		if idErr != nil {
			return DockerRunSpec{}, fmt.Errorf("read app id: %w", idErr)
		}
		signing = onStackNetwork(&spec.Config, v2.State, appID)
		kestrelURL = "http://" + allInterfacesHost + ":" + appcontainers.DefaultContainerPort
	}
	// The container is named the mount point its secrets directory is mounted at, and is told where its keys go,
	// exactly as a deployed app is told both.
	spec.Config.Env = newAppRunEnv(
		nil,
		kestrelURL,
		topology,
		opts.AppFrontendAssetBaseUrl,
		appsecrets.ContainerDir,
		keysDirEnv,
		signing,
	)
	return spec, nil
}

// appContainerConfig is an app container on the localtest runtime's network, without its environment.
func appContainerConfig(appPath, imageTag, hostPort, secretsDir, keysDir string, args []string) types.ContainerConfig {
	return types.ContainerConfig{
		Labels:      appcontainers.Labels(appPath),
		HealthCheck: nil,
		Name:        localtestAppContainerNamePrefix + appnaming.AppNameFromPath(appPath),
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
		// On loopback, for studioctl itself: studioctl-server discovers the app on this port and reads its
		// metadata there. Under localtest-v2 the front door reaches the app by its alias instead.
		Ports: []types.PortMapping{
			{
				HostIP:        localtestLoopbackHost,
				HostPort:      hostPort,
				ContainerPort: appcontainers.DefaultContainerPort,
				Protocol:      "tcp",
			},
		},
		Env:     nil,
		Command: args,
		CapAdd:  nil,
		Detach:  true,
	}
}

// containerCertificateDir is where an app container finds the localtest-v2 certificate, as the components do.
const containerCertificateDir = "/certs"

// checkContainerOrigin refuses a container run while localtest-v2 runs at another origin than the default one: container
// mode supports the standard domains only (local.altinn.cloud and its subdomains on port 8000).
func checkContainerOrigin(state localtestv2.State) error {
	origin, standard := state.Origin(), manifest.MustDefault().DefaultOrigin()
	if origin.Host == standard.Host && origin.Port == standard.Port {
		return nil
	}
	return fmt.Errorf(
		"%w (%s), and localtest-v2 runs at %s; run the app as a process (the default), or move the environment with "+
			"'%s env up -r localtest-v2 --host %s --port %d'",
		ErrContainerModeCustomOrigin, standard.URL(), origin.URL(), osutil.CurrentBin(), standard.Host, standard.Port,
	)
}

// onStackNetwork puts an app container on the localtest-v2 stack's network, and returns the certificate it signs its
// platform access tokens with. The front door reaches the app at its alias, <org>-<app>, which the container carries in
// a label for studioctl-server's registration; the app calls the platform through the public origin, whose host names
// resolve to the host gateway, where the front door publishes the public port, exactly as the components do. The
// certificate directory is mounted read-only where the components have it, and the localtest-v2 label lets every
// teardown remove a container left running when the environment stops. A network of the apps' own does not work
// today (studioctl README, "Why not a separate apps network").
func onStackNetwork(cfg *types.ContainerConfig, state localtestv2.State, appID string) *accessTokenSigning {
	alias := strings.ReplaceAll(appID, "/", "-")
	cfg.Networks = []string{localtestv2.Network}
	cfg.NetworkAliases = []string{alias}
	cfg.Labels[appcontainers.LabelFrontDoorURL] = "http://" + alias + ":" + appcontainers.DefaultContainerPort
	cfg.Labels[localtestv2.Label] = localtestv2.LabelAppContainer
	hosts := state.Origin().Hosts()
	cfg.ExtraHosts = make([]string, 0, len(hosts))
	for _, host := range hosts {
		cfg.ExtraHosts = append(cfg.ExtraHosts, host+":"+hostGateway)
	}
	cfg.Volumes = append(cfg.Volumes, types.VolumeMount{
		HostPath:       state.CertificateDir,
		ContainerPath:  containerCertificateDir,
		Type:           types.VolumeMountTypeBind,
		SELinuxRelabel: types.SELinuxRelabelNone,
		Options:        "",
		ReadOnly:       true,
	})
	return &accessTokenSigning{
		FullPath:     containerCertificateDir + "/" + localtestv2.CertificateFileName,
		KeysFolder:   containerCertificateDir + "/",
		FileName:     localtestv2.CertificateFileName,
		arbeidsflate: arbeidsflateUp(state),
	}
}

// PrepareDockerRun readies a spec for the runtime it is about to run on. The keys directory it mounts is
// created first (a missing one is otherwise created by the runtime, on Linux as root, where everything else
// under the studioctl home is the developer's; the secrets directory is there already, created and
// provisioned when the spec was built), and the container runs as the developer with the userns and SELinux
// handling the localtest containers use: the mounted secrets are owner-only on the host, and a deployed app
// likewise runs as the one user that can read its secret. The image's own user (uid 1000) could not read
// them on a Linux host with another uid.
func (s *Service) PrepareDockerRun(spec *DockerRunSpec, toolchain types.ContainerToolchain) error {
	if spec.KeysDir != "" {
		if err := os.MkdirAll(spec.KeysDir, osutil.DirPermOwnerOnly); err != nil {
			return fmt.Errorf("create app directory %s: %w", filepath.Base(spec.KeysDir), err)
		}
	}
	user, usernsMode, relabel := stack.RuntimeUser(toolchain)
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
			Options:        "",
			ReadOnly:       true,
		},
	}
	if keysDir != "" {
		mounts = append(mounts, types.VolumeMount{
			HostPath:       keysDir,
			ContainerPath:  ContainerKeysDir,
			Type:           types.VolumeMountTypeBind,
			SELinuxRelabel: types.SELinuxRelabelNone,
			Options:        "",
			ReadOnly:       false,
		})
	}
	return mounts
}
