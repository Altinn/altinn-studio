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
	"os/exec"
	"path/filepath"
	"runtime"

	selfapp "altinn.studio/studioctl/internal/cmd/self"
	"altinn.studio/studioctl/internal/config"
)

const (
	version = "0.1.0-preview.0"

	buildDir = "build"

	localtestDir = "../Runtime/localtest"

	helpFlag = "--help"

	helpCmd = "help"

	dirPermDefault = 0o755

	filePermDefault = 0o644
)

var errNoPathsSpecified = errors.New("no paths specified")

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
	fs.Usage = func() {
		fmt.Print(`Usage: go run ./cmd/dev install [options]

Builds studioctl and installs it with localtest resources.

Options:
  -user    Install to user directories (~/.local/bin, ~/.altinn-studio)
           Default: install to build/dev-home/

`)
	}
	if err := fs.Parse(args); err != nil {
		return fmt.Errorf("parse flags: %w", err)
	}

	binaryPath, err := buildStudioctl()
	if err != nil {
		return err
	}

	if err := createResourcesTarball(); err != nil {
		return err
	}

	return installBinary(binaryPath, *user)
}

func buildStudioctl() (string, error) {
	fmt.Println("Building studioctl...")
	binaryName := binaryNameWithExt("studioctl")
	binaryPath := filepath.Join(buildDir, binaryName)
	ldflags := "-X altinn.studio/studioctl/internal/cmd.version=" + version

	if err := goBuild(binaryPath, ldflags, "./cmd/studioctl"); err != nil {
		return "", fmt.Errorf("build studioctl: %w", err)
	}

	return binaryPath, nil
}

func installBinary(binaryPath string, userInstall bool) error {
	tarballPath, err := filepath.Abs(filepath.Join(buildDir, "localtest-resources.tar.gz"))
	if err != nil {
		return fmt.Errorf("get tarball absolute path: %w", err)
	}

	if userInstall {
		return installUserMode(binaryPath, tarballPath)
	}
	return installDevMode(binaryPath, tarballPath)
}

func installUserMode(binaryPath, tarballPath string) error {
	// Use the same candidate detection as self install
	binDir := findRecommendedBinDir()
	if binDir == "" {
		return selfapp.ErrNoWritableLocation
	}

	fmt.Printf("Running studioctl self install --path %s\n", binDir)

	// Only set tarball env - let config use default home resolution
	env := []string{
		config.EnvResourcesTarball + "=" + tarballPath,
	}

	if err := runBinary(binaryPath, env, "self", "install", "--path", binDir); err != nil {
		return fmt.Errorf("run self install: %w", err)
	}
	return nil
}

func installDevMode(binaryPath, tarballPath string) error {
	devHome, err := filepath.Abs(filepath.Join(buildDir, "dev-home"))
	if err != nil {
		return fmt.Errorf("get dev home absolute path: %w", err)
	}
	binDir := filepath.Join(devHome, "bin")

	fmt.Printf("Running studioctl self install --path %s\n", binDir)

	env := []string{
		config.EnvResourcesTarball + "=" + tarballPath,
		config.EnvHome + "=" + devHome,
	}

	if err := runBinary(binaryPath, env, "self", "install", "--path", binDir); err != nil {
		return fmt.Errorf("run self install: %w", err)
	}

	destBinary := filepath.Join(binDir, binaryNameWithExt("studioctl"))
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

func binaryNameWithExt(name string) string {
	if runtime.GOOS == "windows" {
		return name + ".exe"
	}
	return name
}

func goBuild(output, ldflags, pkg string) error {
	args := []string{"build"}
	if ldflags != "" {
		args = append(args, "-ldflags", ldflags)
	}
	args = append(args, "-o", output, pkg)

	cmd := exec.CommandContext(context.Background(), "go", args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("go build failed: %w", err)
	}
	return nil
}

func runBinary(binary string, env []string, args ...string) error {
	cmd := exec.CommandContext(context.Background(), binary, args...)
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
