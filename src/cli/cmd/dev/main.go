// Package main provides a cross-platform development tool for studioctl.
// Replaces platform-specific Makefile operations with portable Go code.
//
//nolint:forbidigo // This dev tool uses fmt.Print for simple CLI output
package main

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"altinn.studio/devenv/pkg/processutil"
	selfapp "altinn.studio/studioctl/internal/cmd/self"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/osutil"
)

const (
	version = "0.1.0-preview.0"

	buildDir = "build"

	localtestDir = "../Runtime/localtest"

	helpFlag = "--help"

	helpCmd = "help"

	dirPermDefault = 0o755

	filePermDefault = 0o644

	goArchAMD64 = "amd64"
	goArchARM64 = "arm64"
)

var (
	errBinaryPathIsDirectory       = errors.New("binary path is a directory")
	errInstallWindowsHostNeedsUser = errors.New("windows-host install requires -user")
	errNotRunningInWSL             = errors.New("windows-host install requires WSL")
	errNoPathsSpecified            = errors.New("no paths specified")
	errUnexpectedBinaryName        = errors.New("unexpected binary name")
	errUnsupportedAppManagerRID    = errors.New("unsupported app-manager runtime")
	errWindowsVariableEmpty        = errors.New("windows variable is empty")
)

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	var err error
	switch os.Args[1] {
	case "resources":
		err = runResources(os.Args[2:])
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
  resources   Create localtest resources tarball
  install     Build and install studioctl (default: dev-home)
  clean       Remove build artifacts

Run 'go run ./cmd/dev <command> -h' for command-specific help.
`)
}

func runResources(args []string) error {
	fs := flag.NewFlagSet("resources", flag.ExitOnError)
	fs.Usage = func() {
		fmt.Print(`Usage: go run ./cmd/dev resources

Creates build/localtest-resources.tar.gz from ../Runtime/localtest/{testdata,infra}
`)
	}
	if err := fs.Parse(args); err != nil {
		return fmt.Errorf("parse flags: %w", err)
	}

	return createResourcesTarball()
}

func createResourcesTarball() error {
	dest := filepath.Join(buildDir, "localtest-resources.tar.gz")
	fmt.Printf("Creating %s...\n", dest)

	if err := createTarGz(dest, localtestDir, "testdata", "infra"); err != nil {
		return fmt.Errorf("create tarball: %w", err)
	}

	fmt.Println("Done.")
	return nil
}

func runInstall(args []string) error {
	fs := flag.NewFlagSet("install", flag.ExitOnError)
	user := fs.Bool("user", false, "Install to user directories (~/.local/bin)")
	windowsHost := fs.Bool("windows-host", false, "Install to the Windows host from WSL")
	fs.Usage = func() {
		fmt.Print(`Usage: go run ./cmd/dev install [options]

Builds studioctl, publishes app-manager, and installs them with localtest resources.

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

	if err := createResourcesTarball(); err != nil {
		return err
	}

	if *windowsHost {
		return installWindowsHostMode()
	}

	binaryPath, err := buildStudioctl(runtime.GOOS, buildDir)
	if err != nil {
		return err
	}
	appManagerPath, err := publishAppManager(runtime.GOOS, runtime.GOARCH, buildDir)
	if err != nil {
		return err
	}

	return installBinary(binaryPath, appManagerPath, *user)
}

func buildStudioctl(goos, outputDir string) (string, error) {
	fmt.Println("Building studioctl...")
	binaryName := binaryNameWithExt("studioctl", goos)
	binaryPath := filepath.Join(outputDir, binaryName)
	ldflags := "-X altinn.studio/studioctl/internal/cmd.version=" + version

	if err := goBuild(binaryPath, ldflags, "./cmd/studioctl", goos, runtime.GOARCH); err != nil {
		return "", fmt.Errorf("build studioctl: %w", err)
	}

	return binaryPath, nil
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

func installBinary(binaryPath, appManagerPath string, userInstall bool) error {
	tarballPath, err := filepath.Abs(filepath.Join(buildDir, "localtest-resources.tar.gz"))
	if err != nil {
		return fmt.Errorf("get tarball absolute path: %w", err)
	}

	if userInstall {
		return installUserMode(binaryPath, appManagerPath, tarballPath)
	}
	return installDevMode(binaryPath, appManagerPath, tarballPath)
}

func installWindowsHostMode() error {
	tarballPath, err := filepath.Abs(filepath.Join(buildDir, "localtest-resources.tar.gz"))
	if err != nil {
		return fmt.Errorf("get tarball absolute path: %w", err)
	}

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

	binaryPathWSL, err := buildStudioctl("windows", stageDirWSL)
	if err != nil {
		return err
	}
	appManagerPathWSL, err := publishAppManager("windows", runtime.GOARCH, stageDirWSL)
	if err != nil {
		return err
	}
	binaryPathWindows, err := windowsPath(binaryPathWSL)
	if err != nil {
		return err
	}
	appManagerPathWindows, err := windowsPath(appManagerPathWSL)
	if err != nil {
		return err
	}

	tarballWindows := joinWindowsPath(stageDirWindows, "localtest-resources.tar.gz")
	tarballWSL, err := wslPathToUnix(tarballWindows)
	if err != nil {
		return err
	}
	if copyErr := copyFile(tarballPath, tarballWSL); copyErr != nil {
		return fmt.Errorf("stage resources tarball: %w", copyErr)
	}

	installDirWindows, err := recommendedWindowsInstallDir()
	if err != nil {
		return err
	}

	fmt.Println("Running Windows studioctl self install...")
	fmt.Printf("Installing to %s\n", installDirWindows)

	if err := runWindowsInstall(
		binaryPathWindows,
		appManagerPathWindows,
		tarballWindows,
		installDirWindows,
	); err != nil {
		return fmt.Errorf("run windows self install: %w", err)
	}

	return nil
}

func installUserMode(binaryPath, appManagerPath, tarballPath string) error {
	// Use the same candidate detection as self install
	binDir := findRecommendedBinDir()
	if binDir == "" {
		return selfapp.ErrNoWritableLocation
	}

	fmt.Printf("Running studioctl self install --path %s\n", binDir)

	// Only set tarball env - let config use default home resolution
	env := []string{
		config.EnvResourcesTarball + "=" + tarballPath,
		config.EnvAppManagerBinary + "=" + appManagerPath,
	}

	if err := runBinary(binaryPath, env, "self", "install", "--path", binDir); err != nil {
		return fmt.Errorf("run self install: %w", err)
	}
	return nil
}

func installDevMode(binaryPath, appManagerPath, tarballPath string) error {
	devHome, err := filepath.Abs(filepath.Join(buildDir, "dev-home"))
	if err != nil {
		return fmt.Errorf("get dev home absolute path: %w", err)
	}
	binDir := filepath.Join(devHome, "bin")

	fmt.Printf("Running studioctl self install --path %s\n", binDir)

	env := []string{
		config.EnvResourcesTarball + "=" + tarballPath,
		config.EnvAppManagerBinary + "=" + appManagerPath,
		config.EnvHome + "=" + devHome,
	}

	if err := runBinary(binaryPath, env, "self", "install", "--path", binDir); err != nil {
		return fmt.Errorf("run self install: %w", err)
	}

	destBinary := filepath.Join(binDir, binaryNameWithExt("studioctl", runtime.GOOS))
	fmt.Printf("\nRun with: %s=%s %s <command>\n", config.EnvHome, devHome, destBinary)
	return nil
}

func findRecommendedBinDir() string {
	for _, c := range selfapp.DetectCandidates(nil) {
		if c.Recommended && c.Writable {
			return c.Path
		}
	}
	return ""
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
	if goos == "windows" {
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
	cmd.Env = append(os.Environ(), "GOOS="+goos, "GOARCH="+goarch)

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("go build failed: %w", err)
	}
	return nil
}

func publishAppManager(goos, goarch, outputDir string) (string, error) {
	fmt.Println("Publishing app-manager...")

	rid, err := dotnetRuntimeIdentifier(goos, goarch)
	if err != nil {
		return "", err
	}

	publishDir := filepath.Join(outputDir, "app-manager-"+goos+"-"+goarch)
	if err := os.MkdirAll(publishDir, dirPermDefault); err != nil {
		return "", fmt.Errorf("create app-manager publish dir: %w", err)
	}

	args := []string{
		"publish",
		"./app-manager/app-manager.csproj",
		"-c", "Release",
		"-o", publishDir,
		"-r", rid,
		"--self-contained", "true",
		"-p:DebugType=None",
		"-p:DebugSymbols=false",
	}

	cmd := processutil.CommandContext(context.Background(), "dotnet", args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Dir = "."

	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("dotnet publish failed: %w", err)
	}

	return publishDir, nil
}

func dotnetRuntimeIdentifier(goos, goarch string) (string, error) {
	switch goos {
	case "linux":
		switch goarch {
		case goArchAMD64:
			return "linux-x64", nil
		case goArchARM64:
			return "linux-arm64", nil
		}
	case "darwin":
		switch goarch {
		case goArchAMD64:
			return "osx-x64", nil
		case goArchARM64:
			return "osx-arm64", nil
		}
	case "windows":
		switch goarch {
		case goArchAMD64:
			return "win-x64", nil
		case goArchARM64:
			return "win-arm64", nil
		}
	}

	return "", fmt.Errorf("%w: %s/%s", errUnsupportedAppManagerRID, goos, goarch)
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

func runWindowsInstall(binaryPath, appManagerPath, tarballPath, installDir string) error {
	script := fmt.Sprintf(
		"$env:%s = %s; $env:%s = %s; & %s self install --path %s",
		config.EnvResourcesTarball,
		powerShellSingleQuoted(tarballPath),
		config.EnvAppManagerBinary,
		powerShellSingleQuoted(appManagerPath),
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

func createTarGz(dest, baseDir string, paths ...string) (err error) {
	if len(paths) == 0 {
		return errNoPathsSpecified
	}

	if ensureErr := os.MkdirAll(filepath.Dir(dest), dirPermDefault); ensureErr != nil {
		return fmt.Errorf("create destination directory: %w", ensureErr)
	}

	//nolint:gosec // G304: dest path is from trusted dev tooling input
	f, err := os.OpenFile(dest, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, filePermDefault)
	if err != nil {
		return fmt.Errorf("create archive file: %w", err)
	}
	defer func() { err = closeWithError(f, "close archive file", err) }()

	gw := gzip.NewWriter(f)
	defer func() { err = closeWithError(gw, "close gzip writer", err) }()

	tw := tar.NewWriter(gw)
	defer func() { err = closeWithError(tw, "close tar writer", err) }()

	for _, path := range paths {
		fullPath := filepath.Join(baseDir, path)
		if walkErr := addToTar(tw, baseDir, fullPath); walkErr != nil {
			return fmt.Errorf("add %s to archive: %w", path, walkErr)
		}
	}

	return nil
}

func addToTar(tw *tar.Writer, baseDir, path string) error {
	walkErr := filepath.Walk(path, func(filePath string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		return addEntryToTar(tw, baseDir, filePath, info)
	})
	if walkErr != nil {
		return fmt.Errorf("walk %s: %w", path, walkErr)
	}
	return nil
}

func addEntryToTar(tw *tar.Writer, baseDir, filePath string, info os.FileInfo) error {
	relPath, err := filepath.Rel(baseDir, filePath)
	if err != nil {
		return fmt.Errorf("compute relative path: %w", err)
	}

	tarPath := filepath.ToSlash(relPath)

	header, err := tar.FileInfoHeader(info, "")
	if err != nil {
		return fmt.Errorf("create tar header: %w", err)
	}
	header.Name = tarPath

	if writeErr := tw.WriteHeader(header); writeErr != nil {
		return fmt.Errorf("write tar header: %w", writeErr)
	}

	if info.IsDir() {
		return nil
	}

	return addFileContentToTar(tw, filePath)
}

func addFileContentToTar(tw *tar.Writer, filePath string) (err error) {
	//nolint:gosec // G304: filePath is from trusted dev tooling input via filepath.Walk
	srcFile, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("open file: %w", err)
	}
	defer func() { err = closeWithError(srcFile, "close source", err) }()

	if _, copyErr := io.Copy(tw, srcFile); copyErr != nil {
		return fmt.Errorf("copy file content: %w", copyErr)
	}

	return nil
}

func copyFile(src, dest string) (err error) {
	if mkdirErr := os.MkdirAll(filepath.Dir(dest), dirPermDefault); mkdirErr != nil {
		return fmt.Errorf("create destination directory: %w", mkdirErr)
	}

	srcFile, err := os.Open(src) //nolint:gosec // G304: src is controlled by the dev helper.
	if err != nil {
		return fmt.Errorf("open source file: %w", err)
	}
	defer func() { err = closeWithError(srcFile, "close source file", err) }()

	//nolint:gosec // G304: dest is controlled by the dev helper.
	destFile, err := os.OpenFile(
		dest,
		os.O_CREATE|os.O_WRONLY|os.O_TRUNC,
		filePermDefault,
	)
	if err != nil {
		return fmt.Errorf("open destination file: %w", err)
	}
	defer func() { err = closeWithError(destFile, "close destination file", err) }()

	if _, err := io.Copy(destFile, srcFile); err != nil {
		return fmt.Errorf("copy file: %w", err)
	}

	return nil
}

func closeWithError(c io.Closer, msg string, existingErr error) error {
	closeErr := c.Close()
	if closeErr == nil {
		return existingErr
	}
	if existingErr == nil {
		return fmt.Errorf("%s: %w", msg, closeErr)
	}
	return existingErr
}
