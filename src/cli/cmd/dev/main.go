//nolint:forbidigo // This dev tool uses fmt.Print for simple CLI output
package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"altinn.studio/devenv/pkg/processutil"
	"altinn.studio/studioctl/internal/config"
	installpkg "altinn.studio/studioctl/internal/install"
	"altinn.studio/studioctl/internal/osutil"
)

const (
	version = "v0.1.0-preview.0"

	buildDir = "build"

	localtestDir = "../Runtime/localtest"

	helpFlag = "--help"

	helpCmd = "help"

	dirPermDefault = 0o755
)

type distPlatform struct {
	GOOS   string
	GOARCH string
}

type distOptions struct {
	Version      string
	OutputDir    string
	ManifestPath string
	PlatformMode string
	Release      bool
}

type distResult struct {
	HostBinaryPath           string
	HostResourcesArchivePath string
	Artifacts                []string
}

type distManifest struct {
	Artifacts []string `json:"artifacts"`
}

var (
	errBinaryPathIsDirectory       = errors.New("binary path is a directory")
	errInstallWindowsHostNeedsUser = errors.New("windows-host install requires -user")
	errNotRunningInWSL             = errors.New("windows-host install requires WSL")
	errUnexpectedBinaryName        = errors.New("unexpected binary name")
	errUnsupportedPlatformMode     = errors.New("unsupported platform mode")
	errWindowsVariableEmpty        = errors.New("windows variable is empty")
)

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	var err error
	switch os.Args[1] {
	case "dist":
		err = runDist(os.Args[2:])
	case "install":
		err = runInstall(os.Args[2:])
	case "clean":
		err = runClean(os.Args[2:])
	case helpCmd, "-h", helpFlag:
		printUsage()
		return
	default:
		fmt.Fprintf(os.Stderr, "unknown command: %s\n\n", os.Args[1])
		printUsage()
		os.Exit(1)
	}

	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Print(`dev - Cross-platform development tool for studioctl

Usage: go run ./cmd/dev <command> [options]

Commands:
  dist        Build/stage studioctl install artifacts
  install     Build and install studioctl (default: dev-home)
  clean       Remove build artifacts

Run 'go run ./cmd/dev <command> -h' for command-specific help.
`)
}

func runDist(args []string) error {
	fs := flag.NewFlagSet("dist", flag.ExitOnError)
	distVersion := fs.String("version", version, "Version to embed in studioctl")
	outputDir := fs.String("output", buildDir, "Output directory")
	platform := fs.String("platform", "host", "Platform set: host or all")
	manifestPath := fs.String("manifest", "", "Write JSON artifact manifest to file")
	release := fs.Bool("release", false, "Finalize release artifacts")
	fs.Usage = func() {
		fmt.Print(`Usage: go run ./cmd/dev dist [options]

Builds/stages studioctl and matching resources archives.

Options:
  -version VERSION            Version to embed in studioctl
  -output DIR                 Output directory (default: build)
  -platform host|all          Build host platform or release platform set
  -manifest FILE              Write JSON artifact manifest to file
  -release                    Add release install scripts and SHA256SUMS
`)
	}
	if err := fs.Parse(args); err != nil {
		return fmt.Errorf("parse flags: %w", err)
	}

	_, err := buildDist(distOptions{
		Version:      *distVersion,
		OutputDir:    *outputDir,
		ManifestPath: *manifestPath,
		PlatformMode: *platform,
		Release:      *release,
	})
	return err
}

func buildDist(opts distOptions) (distResult, error) {
	if opts.ManifestPath != "" {
		if err := os.Remove(opts.ManifestPath); err != nil && !errors.Is(err, os.ErrNotExist) {
			return distResult{}, fmt.Errorf("remove stale dist manifest: %w", err)
		}
	}

	platforms, err := resolveDistPlatforms(opts.PlatformMode)
	if err != nil {
		return distResult{}, err
	}

	var result distResult
	for _, platform := range platforms {
		binaryName := distStudioctlName(platform, opts.PlatformMode)
		binaryPath, err := buildStudioctlFor(platform.GOOS, platform.GOARCH, opts.OutputDir, binaryName, opts.Version)
		if err != nil {
			return distResult{}, err
		}

		resourcesArchivePath, err := buildPlatformResources(
			platform.GOOS,
			platform.GOARCH,
			opts.OutputDir,
		)
		if err != nil {
			return distResult{}, err
		}
		result.Artifacts = append(result.Artifacts,
			binaryPath,
			resourcesArchivePath,
		)
		if platform.GOOS == runtime.GOOS && platform.GOARCH == runtime.GOARCH {
			result.HostBinaryPath = binaryPath
			result.HostResourcesArchivePath = resourcesArchivePath
		}
	}

	if opts.Release {
		releaseArtifacts, err := installpkg.CreateReleaseArtifacts(opts.OutputDir, opts.Version)
		if err != nil {
			return distResult{}, fmt.Errorf("finalize release artifacts: %w", err)
		}
		result.Artifacts = append(result.Artifacts, releaseArtifacts...)
	}

	if opts.ManifestPath != "" {
		if err := writeDistManifest(opts.ManifestPath, result); err != nil {
			return distResult{}, err
		}
	}

	return result, nil
}

func writeDistManifest(path string, result distResult) error {
	if err := os.MkdirAll(filepath.Dir(path), dirPermDefault); err != nil {
		return fmt.Errorf("create manifest directory: %w", err)
	}

	content, err := json.MarshalIndent(distManifest{Artifacts: result.Artifacts}, "", "  ")
	if err != nil {
		return fmt.Errorf("write dist manifest: %w", err)
	}
	content = append(content, '\n')
	if err := os.WriteFile(path, content, osutil.FilePermOwnerOnly); err != nil {
		return fmt.Errorf("write dist manifest: %w", err)
	}
	return nil
}

func resolveDistPlatforms(mode string) ([]distPlatform, error) {
	switch mode {
	case "host":
		return []distPlatform{{GOOS: runtime.GOOS, GOARCH: runtime.GOARCH}}, nil
	case "all":
		return []distPlatform{
			{GOOS: osutil.OSLinux, GOARCH: goArchAMD64},
			{GOOS: osutil.OSLinux, GOARCH: goArchARM64},
			{GOOS: osutil.OSDarwin, GOARCH: goArchAMD64},
			{GOOS: osutil.OSDarwin, GOARCH: goArchARM64},
			{GOOS: osutil.OSWindows, GOARCH: goArchAMD64},
			{GOOS: osutil.OSWindows, GOARCH: goArchARM64},
		}, nil
	default:
		return nil, fmt.Errorf("%w: %s", errUnsupportedPlatformMode, mode)
	}
}

func distStudioctlName(platform distPlatform, mode string) string {
	if mode == "host" {
		return binaryNameWithExt("studioctl", platform.GOOS)
	}
	return binaryNameWithExt("studioctl-"+platform.GOOS+"-"+platform.GOARCH, platform.GOOS)
}

func runInstall(args []string) error {
	fs := flag.NewFlagSet("install", flag.ExitOnError)
	user := fs.Bool("user", false, "Install to user directories (~/.local/bin)")
	windowsHost := fs.Bool("windows-host", false, "Install to the Windows host from WSL")
	fs.Usage = func() {
		fmt.Print(`Usage: go run ./cmd/dev install [options]

Builds studioctl and its resources archive, then installs them.

Options:
  -user           Install to user directories (~/.local/bin, ~/.altinn-studio)
  -windows-host   From WSL, stage a Windows build and install to the recommended
                  Windows user location
                  Default: install to build/dev-home/

`)
	}
	if err := fs.Parse(args); err != nil {
		return fmt.Errorf("parse flags: %w", err)
	}

	if err := validateInstallMode(*user, *windowsHost, osutil.IsWSL()); err != nil {
		return err
	}

	if *windowsHost {
		return installWindowsHostMode()
	}

	dist, err := buildDist(distOptions{
		Version:      version,
		OutputDir:    buildDir,
		ManifestPath: "",
		PlatformMode: "host",
		Release:      false,
	})
	if err != nil {
		return err
	}

	return installBinary(dist.HostBinaryPath, dist.HostResourcesArchivePath, *user)
}

func buildStudioctl(goos, outputDir string) (string, error) {
	return buildStudioctlFor(
		goos,
		runtime.GOARCH,
		outputDir,
		binaryNameWithExt("studioctl", goos),
		version,
	)
}

func buildStudioctlFor(goos, goarch, outputDir, binaryName, buildVersion string) (string, error) {
	fmt.Println("Building studioctl...")
	binaryPath := filepath.Join(outputDir, binaryName)
	ldflags := "-X altinn.studio/studioctl/internal/cmd.version=" + buildVersion

	if err := goBuild(binaryPath, ldflags, "./cmd/studioctl", goos, goarch); err != nil {
		return "", fmt.Errorf("build studioctl: %w", err)
	}

	return binaryPath, nil
}

func buildPlatformResources(
	goos, goarch, outputDir string,
) (archivePath string, err error) {
	appManagerDir := filepath.Join(outputDir, ".app-manager-"+goos+"-"+goarch)
	if removeErr := os.RemoveAll(appManagerDir); removeErr != nil {
		return "", fmt.Errorf("clean app-manager staging dir: %w", removeErr)
	}
	defer func() {
		if removeErr := os.RemoveAll(appManagerDir); removeErr != nil && err == nil {
			err = fmt.Errorf("remove app-manager staging dir: %w", removeErr)
		}
	}()

	if _, publishErr := publishAppManagerToDir(goos, goarch, appManagerDir); publishErr != nil {
		return "", publishErr
	}

	fmt.Println("Creating resources archive...")
	archivePath, err = installpkg.CreateResourcesArchive(installpkg.ResourcesArchiveOptions{
		GOOS:          goos,
		GOARCH:        goarch,
		OutputDir:     outputDir,
		AppManagerDir: appManagerDir,
		LocaltestDir:  localtestDir,
	})
	if err != nil {
		return "", fmt.Errorf("create resources archive: %w", err)
	}
	fmt.Printf("Created %s\n", archivePath)

	return archivePath, nil
}

func validateInstallMode(userInstall, windowsHost, runningInWSL bool) error {
	if !windowsHost {
		return nil
	}
	if !userInstall {
		return errInstallWindowsHostNeedsUser
	}
	if !runningInWSL {
		return errNotRunningInWSL
	}
	return nil
}

func installBinary(binaryPath, resourcesArchivePath string, userInstall bool) error {
	resourcesArchivePath, err := filepath.Abs(resourcesArchivePath)
	if err != nil {
		return fmt.Errorf("get resources archive absolute path: %w", err)
	}

	if userInstall {
		return installUserMode(binaryPath, resourcesArchivePath)
	}
	return installDevMode(binaryPath, resourcesArchivePath)
}

func installWindowsHostMode() error {
	stageDirWindows, err := windowsEnv("TEMP")
	if err != nil {
		return err
	}
	stageDirWindows = joinWindowsPath(stageDirWindows, "studioctl-dev")

	stageDirWSL, err := wslPathToUnix(stageDirWindows)
	if err != nil {
		return err
	}
	if mkdirErr := os.MkdirAll(stageDirWSL, dirPermDefault); mkdirErr != nil {
		return fmt.Errorf("create windows staging directory: %w", mkdirErr)
	}

	binaryPathWSL, err := buildStudioctl(osutil.OSWindows, stageDirWSL)
	if err != nil {
		return err
	}
	resourcesArchivePath, err := buildPlatformResources(osutil.OSWindows, runtime.GOARCH, stageDirWSL)
	if err != nil {
		return err
	}
	binaryPathWindows, err := windowsPath(binaryPathWSL)
	if err != nil {
		return err
	}
	resourcesArchiveWindows, err := windowsPath(resourcesArchivePath)
	if err != nil {
		return err
	}

	installDirWindows, err := recommendedWindowsInstallDir()
	if err != nil {
		return err
	}

	fmt.Println("Running Windows studioctl self install...")
	fmt.Printf("Installing to %s\n", installDirWindows)

	if err := runWindowsInstall(
		binaryPathWindows,
		resourcesArchiveWindows,
		installDirWindows,
	); err != nil {
		return fmt.Errorf("run windows self install: %w", err)
	}

	return nil
}

func installUserMode(binaryPath, resourcesArchivePath string) error {
	fmt.Println("Running studioctl self install...")

	env := []string{
		config.EnvResourcesArchive + "=" + resourcesArchivePath,
	}

	if err := runBinary(binaryPath, env, "self", "install"); err != nil {
		return fmt.Errorf("run self install: %w", err)
	}
	return nil
}

func installDevMode(binaryPath, resourcesArchivePath string) error {
	devHome, err := filepath.Abs(filepath.Join(buildDir, "dev-home"))
	if err != nil {
		return fmt.Errorf("get dev home absolute path: %w", err)
	}
	binDir := filepath.Join(devHome, "bin")

	fmt.Printf("Running studioctl self install --path %s\n", binDir)

	env := []string{
		config.EnvResourcesArchive + "=" + resourcesArchivePath,
		config.EnvHome + "=" + devHome,
	}

	if err := runBinary(binaryPath, env, "self", "install", "--path", binDir); err != nil {
		return fmt.Errorf("run self install: %w", err)
	}

	destBinary := filepath.Join(binDir, binaryNameWithExt("studioctl", runtime.GOOS))
	fmt.Printf("\nRun with: %s=%s %s <command>\n", config.EnvHome, devHome, destBinary)
	return nil
}

func runClean(args []string) error {
	fs := flag.NewFlagSet("clean", flag.ExitOnError)
	fs.Usage = func() {
		fmt.Print(`Usage: go run ./cmd/dev clean

Removes build/ and bin/ directories.
`)
	}
	if err := fs.Parse(args); err != nil {
		return fmt.Errorf("parse flags: %w", err)
	}

	dirs := []string{"build", "bin"}
	for _, dir := range dirs {
		fmt.Printf("Removing %s...\n", dir)
		if err := os.RemoveAll(dir); err != nil {
			return fmt.Errorf("remove %s: %w", dir, err)
		}
	}

	fmt.Println("Clean complete.")
	return nil
}

func binaryNameWithExt(name, goos string) string {
	if goos == osutil.OSWindows {
		return name + ".exe"
	}
	return name
}

func goBuild(output, ldflags, pkg, goos, goarch string) error {
	args := []string{"build"}
	if ldflags != "" {
		args = append(args, "-ldflags", ldflags)
	}
	args = append(args, "-o", output, pkg)

	cmd := processutil.CommandContext(context.Background(), "go", args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = append(os.Environ(), "GOOS="+goos, "GOARCH="+goarch, "CGO_ENABLED=0")

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("go build failed: %w", err)
	}
	return nil
}

func runBinary(binary string, env []string, args ...string) error {
	if err := validateStudioctlBinary(binary); err != nil {
		return err
	}

	cmd := processutil.CommandContext(context.Background(), binary, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin
	if len(env) > 0 {
		cmd.Env = append(os.Environ(), env...)
	}

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("run binary failed: %w", err)
	}
	return nil
}

func validateStudioctlBinary(binary string) error {
	absBinary, err := filepath.Abs(binary)
	if err != nil {
		return fmt.Errorf("resolve binary path: %w", err)
	}

	info, err := os.Stat(absBinary)
	if err != nil {
		return fmt.Errorf("stat binary: %w", err)
	}
	if info.IsDir() {
		return fmt.Errorf("%w: %s", errBinaryPathIsDirectory, absBinary)
	}
	if !isStudioctlBinaryName(filepath.Base(absBinary)) {
		return fmt.Errorf("%w: %s", errUnexpectedBinaryName, absBinary)
	}

	return nil
}

func isStudioctlBinaryName(name string) bool {
	return name == "studioctl" || name == "studioctl.exe"
}

func recommendedWindowsInstallDir() (string, error) {
	localAppData, err := windowsEnv("LOCALAPPDATA")
	if err != nil {
		return "", err
	}
	return joinWindowsPath(localAppData, "Programs", "studioctl"), nil
}

func windowsEnv(name string) (string, error) {
	out, err := commandOutput("cmd.exe", "/c", "echo", "%"+name+"%")
	if err != nil {
		return "", fmt.Errorf("read Windows %s: %w", name, err)
	}
	if out == "" || out == "%"+name+"%" {
		return "", fmt.Errorf("read Windows %s: %w", name, errWindowsVariableEmpty)
	}
	return out, nil
}

func wslPathToUnix(path string) (string, error) {
	out, err := commandOutput("wslpath", "-u", path)
	if err != nil {
		return "", fmt.Errorf("convert Windows path to WSL path: %w", err)
	}
	return out, nil
}

func windowsPath(path string) (string, error) {
	out, err := commandOutput("wslpath", "-w", path)
	if err != nil {
		return "", fmt.Errorf("convert WSL path to Windows path: %w", err)
	}
	return out, nil
}

func commandOutput(name string, args ...string) (string, error) {
	cmd := processutil.CommandContext(context.Background(), name, args...)
	output, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("run command %q: %w", name, err)
	}
	return strings.TrimSpace(string(output)), nil
}

func runWindowsInstall(binaryPath, resourcesArchivePath, installDir string) error {
	script := fmt.Sprintf(
		"$env:%s = %s; & %s self install --path %s",
		config.EnvResourcesArchive,
		powerShellSingleQuoted(resourcesArchivePath),
		powerShellSingleQuoted(binaryPath),
		powerShellSingleQuoted(installDir),
	)

	cmd := processutil.CommandContext(context.Background(), "powershell.exe", "-NoProfile", "-Command", script)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("run PowerShell install command: %w", err)
	}

	return nil
}

func powerShellSingleQuoted(value string) string {
	return "'" + strings.ReplaceAll(value, "'", "''") + "'"
}

func joinWindowsPath(base string, elems ...string) string {
	parts := []string{strings.TrimRight(base, `\/`)}
	for _, elem := range elems {
		trimmed := strings.Trim(elem, `\/`)
		if trimmed != "" {
			parts = append(parts, trimmed)
		}
	}
	return strings.Join(parts, `\`)
}
