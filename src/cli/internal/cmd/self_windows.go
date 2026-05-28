//go:build windows

package cmd

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"

	installpkg "altinn.studio/studioctl/internal/install"
	"altinn.studio/studioctl/internal/osutil"

	"golang.org/x/sys/windows"
)

const (
	windowsHelperExe               = "studioctl-self-helper.exe"
	windowsHelperFilePerm          = 0o755
	windowsParentExitWaitTimeout   = 30 * time.Second
	windowsPowerShellSystemSubpath = `WindowsPowerShell\v1.0\powershell.exe`
)

var (
	errUnexpectedWindowsWaitStatus = errors.New("unexpected Windows wait status")
	errWindowsParentWaitTimeout    = errors.New("timed out waiting for parent process")
)

type windowsSelfHelperFlags struct {
	operation    string
	target       string
	source       string
	version      string
	tempDir      string
	parentHandle windows.Handle
}

func (c *SelfCommand) startWindowsUpdateHelper(ctx context.Context, resolved installpkg.ResolvedBundle) error {
	source := resolved.Bundle.BinaryPath
	target := resolved.Bundle.InstallPath()
	if source == "" || target == "" {
		return fmt.Errorf("%w: update helper source and target are required", ErrInvalidFlagValue)
	}
	tempDir := filepath.Dir(source)
	_, helperPath, err := copyCurrentExecutableToWindowsHelper(tempDir)
	if err != nil {
		return err
	}

	args := c.windowsSelfHelperArgs(windowsSelfHelperFlags{
		operation:    selfUpdateSubcmd,
		target:       target,
		source:       source,
		version:      resolved.Bundle.Version,
		tempDir:      tempDir,
		parentHandle: 0,
	})

	return startWindowsHelperProcess(ctx, helperPath, args)
}

func (c *SelfCommand) startWindowsUninstallHelper(ctx context.Context) error {
	tempDir, err := os.MkdirTemp("", "studioctl-self-uninstall-*")
	if err != nil {
		return fmt.Errorf("create uninstall helper directory: %w", err)
	}
	current, helperPath, err := copyCurrentExecutableToWindowsHelper(tempDir)
	if err != nil {
		return errors.Join(err, os.RemoveAll(tempDir))
	}

	args := c.windowsSelfHelperArgs(windowsSelfHelperFlags{
		operation:    selfUninstallSubcmd,
		target:       current,
		source:       "",
		version:      "",
		tempDir:      tempDir,
		parentHandle: 0,
	})
	if err := startWindowsHelperProcess(ctx, helperPath, args); err != nil {
		return errors.Join(err, os.RemoveAll(tempDir))
	}
	return nil
}

func (c *SelfCommand) windowsSelfHelperArgs(flags windowsSelfHelperFlags) []string {
	args := c.installedSelfCommandArgs(selfWindowsHelperSubcmd)
	args = append(args,
		"--operation", flags.operation,
		"--target", flags.target,
	)
	if flags.source != "" {
		args = append(args, "--source", flags.source)
	}
	if flags.version != "" {
		args = append(args, "--version", flags.version)
	}
	if flags.tempDir != "" {
		args = append(args, "--temp-dir", flags.tempDir)
	}
	return args
}

func startWindowsHelperProcess(ctx context.Context, path string, args []string) error {
	processID, err := currentWindowsProcessID()
	if err != nil {
		return err
	}
	parentHandle, err := windows.OpenProcess(windows.SYNCHRONIZE, true, processID)
	if err != nil {
		return fmt.Errorf("open current process for Windows self helper: %w", err)
	}
	defer closeWindowsHandle(parentHandle)

	args = append(args, "--parent-handle", strconv.FormatUint(uint64(parentHandle), 10))

	//nolint:gosec // G204: helper path is a temp copy of the current studioctl binary.
	cmd := exec.CommandContext(context.WithoutCancel(ctx), path, args...)
	osutil.ApplyDetachedAttrs(cmd)
	cmd.SysProcAttr.AdditionalInheritedHandles = append(
		cmd.SysProcAttr.AdditionalInheritedHandles,
		syscall.Handle(parentHandle),
	)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if osutil.IsPowerShellISEHost() {
		cmd.Env = append(os.Environ(), osutil.DisableTerminalDecorationsEnv+"=1")
	}
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("start Windows self helper: %w", err)
	}
	return nil
}

func (c *SelfCommand) runWindowsSelfHelper(ctx context.Context, args []string) error {
	flags, err := parseWindowsSelfHelperFlags(args)
	if err != nil {
		return err
	}

	if err := waitForWindowsProcessExit(flags.parentHandle); err != nil {
		return err
	}

	defer scheduleWindowsTempCleanup(ctx, c, flags.tempDir)

	switch flags.operation {
	case selfUpdateSubcmd:
		return c.runWindowsUpdateHelper(ctx, flags)
	case selfUninstallSubcmd:
		return c.runWindowsUninstallHelper(ctx, flags)
	default:
		return fmt.Errorf("%w: unsupported Windows self helper operation %q", ErrInvalidFlagValue, flags.operation)
	}
}

func parseWindowsSelfHelperFlags(args []string) (windowsSelfHelperFlags, error) {
	fs := flag.NewFlagSet("self "+selfWindowsHelperSubcmd, flag.ContinueOnError)
	var flags windowsSelfHelperFlags
	var parentHandle string
	fs.StringVar(&flags.operation, "operation", "", "operation")
	fs.StringVar(&parentHandle, "parent-handle", "", "parent process handle")
	fs.StringVar(&flags.target, "target", "", "target executable path")
	fs.StringVar(&flags.source, "source", "", "source executable path")
	fs.StringVar(&flags.version, "version", "", "bundle version")
	fs.StringVar(&flags.tempDir, "temp-dir", "", "temporary directory")

	if err := fs.Parse(args); err != nil {
		return windowsSelfHelperFlags{}, fmt.Errorf("parsing flags: %w", err)
	}
	if parentHandle == "" {
		return windowsSelfHelperFlags{}, fmt.Errorf("%w: parent-handle is required", ErrInvalidFlagValue)
	}
	handle, err := strconv.ParseUint(parentHandle, 10, 0)
	if err != nil || handle == 0 {
		return windowsSelfHelperFlags{}, fmt.Errorf("%w: invalid parent-handle", ErrInvalidFlagValue)
	}
	flags.parentHandle = windows.Handle(handle)
	if flags.target == "" {
		return windowsSelfHelperFlags{}, fmt.Errorf("%w: target is required", ErrInvalidFlagValue)
	}
	return flags, nil
}

func (c *SelfCommand) runWindowsUpdateHelper(ctx context.Context, flags windowsSelfHelperFlags) error {
	if flags.source == "" {
		return fmt.Errorf("%w: source is required for update", ErrInvalidFlagValue)
	}
	version := flags.version
	if version == "" {
		version = c.cfg.Version.String()
	}
	bundle := installpkg.NewBundle(version, flags.source, "", flags.target)
	if err := c.applyBundle(ctx, bundle, applyBundleOptions{
		TargetDir:  filepath.Dir(flags.target),
		Candidates: nil,
		WarnPath:   false,
	}); err != nil {
		return fmt.Errorf("apply Windows self update: %w", err)
	}
	c.out.Successf("%s updated successfully.", osutil.CurrentBin())
	return nil
}

func (c *SelfCommand) runWindowsUninstallHelper(ctx context.Context, flags windowsSelfHelperFlags) error {
	return c.runConfirmedUninstall(ctx, func() (installpkg.UninstallResult, error) {
		return c.service.UninstallBinaryAt(flags.target)
	})
}

func waitForWindowsProcessExit(handle windows.Handle) error {
	defer closeWindowsHandle(handle)

	status, err := windows.WaitForSingleObject(handle, windowsParentExitWaitMilliseconds())
	if err != nil {
		return fmt.Errorf("wait for parent process: %w", err)
	}
	if status == uint32(windows.WAIT_TIMEOUT) {
		return fmt.Errorf("wait for parent process: %w", errWindowsParentWaitTimeout)
	}
	if status != windows.WAIT_OBJECT_0 {
		return fmt.Errorf("wait for parent process: %w %d", errUnexpectedWindowsWaitStatus, status)
	}
	return nil
}

func closeWindowsHandle(handle windows.Handle) {
	// Handle closure is cleanup only; a failure must not turn a successful
	// helper start or parent wait into a failed self update/uninstall.
	if err := windows.CloseHandle(handle); err != nil {
		return
	}
}

func windowsParentExitWaitMilliseconds() uint32 {
	return uint32(windowsParentExitWaitTimeout / time.Millisecond)
}

func currentWindowsProcessID() (uint32, error) {
	pid := os.Getpid()
	if pid < 0 || uint64(pid) > math.MaxUint32 {
		return 0, fmt.Errorf("%w: %d", ErrInvalidFlagValue, pid)
	}
	return uint32(pid), nil
}

func currentExecutablePath() (string, error) {
	path, err := os.Executable()
	if err != nil {
		return "", fmt.Errorf("resolve current executable: %w", err)
	}
	resolved, err := filepath.EvalSymlinks(path)
	if err != nil {
		absolute, absErr := filepath.Abs(path)
		if absErr != nil {
			return "", fmt.Errorf("resolve absolute executable path: %w", absErr)
		}
		return absolute, nil
	}
	return resolved, nil
}

func copyCurrentExecutableToWindowsHelper(tempDir string) (currentPath, helperPath string, err error) {
	currentPath, err = currentExecutablePath()
	if err != nil {
		return "", "", fmt.Errorf("resolve current executable path: %w", err)
	}
	helperPath = filepath.Join(tempDir, windowsHelperExe)
	if err := copyFileForWindowsHelper(currentPath, helperPath); err != nil {
		return "", "", err
	}
	return currentPath, helperPath, nil
}

func copyFileForWindowsHelper(src, dst string) (err error) {
	if mkdirErr := os.MkdirAll(filepath.Dir(dst), osutil.DirPermDefault); mkdirErr != nil {
		return fmt.Errorf("create helper directory: %w", mkdirErr)
	}

	//nolint:gosec // G304: source is the resolved current studioctl executable.
	in, err := os.Open(src)
	if err != nil {
		return fmt.Errorf("open helper source: %w", err)
	}
	defer func() {
		if closeErr := in.Close(); closeErr != nil && err == nil {
			err = fmt.Errorf("close helper source: %w", closeErr)
		}
	}()

	//nolint:gosec // G304: destination is a freshly-created temp helper path.
	out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, windowsHelperFilePerm)
	if err != nil {
		return fmt.Errorf("create helper copy: %w", err)
	}
	defer func() {
		if closeErr := out.Close(); closeErr != nil && err == nil {
			err = fmt.Errorf("close helper copy: %w", closeErr)
		}
	}()

	if _, err := io.Copy(out, in); err != nil {
		return fmt.Errorf("copy helper executable: %w", err)
	}
	return nil
}

func scheduleWindowsTempCleanup(ctx context.Context, c *SelfCommand, tempDir string) {
	if tempDir == "" {
		return
	}

	quoted := strings.ReplaceAll(tempDir, "'", "''")
	command := fmt.Sprintf(
		"Start-Sleep -Seconds 2; Remove-Item -LiteralPath '%s' -Recurse -Force -ErrorAction SilentlyContinue",
		quoted,
	)
	//nolint:gosec // G204: executable is the system PowerShell path; command only targets the helper temp directory.
	cmd := exec.CommandContext(
		context.WithoutCancel(ctx),
		windowsPowerShellPath(),
		"-NoProfile",
		"-ExecutionPolicy",
		"Bypass",
		"-Command",
		command,
	)
	osutil.ApplyDetachedAttrs(cmd)
	if err := cmd.Start(); err != nil {
		c.out.Verbosef("failed to schedule helper cleanup for %s: %v", tempDir, err)
	}
}

func windowsPowerShellPath() string {
	systemDir, err := windows.GetSystemDirectory()
	if err != nil || systemDir == "" {
		systemDir = `C:\Windows\System32`
	}
	// Windows PowerShell 5.1 is included with supported Windows versions and is
	// a better fallback for this cleanup task than pwsh, which may not be installed.
	return filepath.Join(systemDir, windowsPowerShellSystemSubpath)
}
