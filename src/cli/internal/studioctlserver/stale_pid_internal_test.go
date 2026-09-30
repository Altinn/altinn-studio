package studioctlserver

import (
	"context"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"testing"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/osutil"
)

func TestReadStudioctlServerState_IgnoresPIDOfCurrentProcess(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	writeTestServerState(t, cfg, newRuntimeState(os.Getpid(), testStartConfig(currentTestExecutable(t))))

	_, ok, err := readStudioctlServerState(cfg)
	if err != nil {
		t.Fatalf("readStudioctlServerState() error = %v", err)
	}
	if ok {
		t.Fatal("readStudioctlServerState() ok = true, want false")
	}
	assertPIDFileExists(t, cfg.StudioctlServerPIDPath())
}

func TestReadStudioctlServerState_IgnoresPIDOfUnrelatedProcess(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	pid, _ := startSleepProcess(t)
	writeTestServerState(t, cfg, reusedPIDState(t, pid, cfg.StudioctlServerBinaryPath()))

	_, ok, err := readStudioctlServerState(cfg)
	if err != nil {
		t.Fatalf("readStudioctlServerState() error = %v", err)
	}
	if ok {
		t.Fatal("readStudioctlServerState() ok = true, want false")
	}
	assertPIDFileExists(t, cfg.StudioctlServerPIDPath())
	assertProcessRunning(t, pid)
}

func TestReadStudioctlServerState_IgnoresStateWithoutStartTime(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	pid, path := startSleepProcess(t)
	// A pid file from an older studioctl has no start time.
	writeTestServerState(t, cfg, runtimeState{PID: pid, Start: testStartConfig(path), StartTime: 0})

	_, ok, err := readStudioctlServerState(cfg)
	if err != nil {
		t.Fatalf("readStudioctlServerState() error = %v", err)
	}
	if ok {
		t.Fatal("readStudioctlServerState() ok = true, want false")
	}
}

func TestReadStudioctlServerState_AcceptsPIDOfServerProcess(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	pid, path := startSleepProcess(t)
	writeTestServerState(t, cfg, newRuntimeState(pid, testStartConfig(path)))

	state, ok, err := readStudioctlServerState(cfg)
	if err != nil {
		t.Fatalf("readStudioctlServerState() error = %v", err)
	}
	if !ok || state.PID != pid {
		t.Fatalf("readStudioctlServerState() = (pid %d, ok %t), want (pid %d, ok true)", state.PID, ok, pid)
	}
}

// An update replaces the install folder while the old server continues to run from the removed folder.
func TestReadStudioctlServerState_AcceptsServerAfterInstallFolderReplaced(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	installDir := filepath.Join(t.TempDir(), "studioctl-server")
	binaryPath := copySleepExecutable(t, installDir)
	pid := startTestProcess(t, binaryPath)
	assertProcessRunning(t, pid)
	writeTestServerState(t, cfg, newRuntimeState(pid, testStartConfig(binaryPath)))

	updateDir := filepath.Join(t.TempDir(), "update")
	copySleepExecutable(t, updateDir)
	if err := osutil.ReplacePath(updateDir, installDir); err != nil {
		t.Fatalf("ReplacePath() error = %v", err)
	}

	state, ok, err := readStudioctlServerState(cfg)
	if err != nil {
		t.Fatalf("readStudioctlServerState() error = %v", err)
	}
	if !ok || state.PID != pid {
		t.Fatalf("readStudioctlServerState() = (pid %d, ok %t), want (pid %d, ok true)", state.PID, ok, pid)
	}
}

func TestEnsureStarted_DoesNotKillProcessThatReusedServerPID(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	pid, _ := startSleepProcess(t)
	writeTestServerState(t, cfg, reusedPIDState(t, pid, cfg.StudioctlServerBinaryPath()))

	// The test config has no studioctl-server binary, so a start stops at ErrBinaryMissing.
	err := EnsureStartedWithStudioctlPath(context.Background(), cfg, "8000", "")
	if !errors.Is(err, ErrBinaryMissing) {
		t.Fatalf("EnsureStartedWithStudioctlPath() error = %v, want %v", err, ErrBinaryMissing)
	}
	assertPIDFileExists(t, cfg.StudioctlServerPIDPath())
	assertProcessRunning(t, pid)
}

func TestShutdown_DoesNotKillProcessThatReusedServerPID(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	pid, _ := startSleepProcess(t)
	writeTestServerState(t, cfg, reusedPIDState(t, pid, cfg.StudioctlServerBinaryPath()))

	_, err := Shutdown(context.Background(), cfg)
	if !errors.Is(err, ErrNotRunning) {
		t.Fatalf("Shutdown() error = %v, want %v", err, ErrNotRunning)
	}
	assertPIDFileExists(t, cfg.StudioctlServerPIDPath())
	assertProcessRunning(t, pid)
}

// startSleepProcess starts "sleep 60" and returns its PID and executable path.
func startSleepProcess(t *testing.T) (int, string) {
	t.Helper()

	path := lookSleep(t)
	return startTestProcess(t, path), path
}

// startTestProcess starts path with the argument "60" and returns its PID.
func startTestProcess(t *testing.T, path string) int {
	t.Helper()

	// The test context ends before cleanup runs, which kills the process.
	cmd := exec.CommandContext(t.Context(), path, "60")
	if err := cmd.Start(); err != nil {
		t.Fatalf("start %s: %v", path, err)
	}
	t.Cleanup(func() {
		ignoreError(cmd.Wait())
	})
	return cmd.Process.Pid
}

func lookSleep(t *testing.T) string {
	t.Helper()

	path, err := exec.LookPath("sleep")
	if err != nil {
		t.Skip("sleep is not available")
	}
	return path
}

// copySleepExecutable copies the sleep executable into dir and returns the path of the copy.
func copySleepExecutable(t *testing.T, dir string) string {
	t.Helper()

	data, err := os.ReadFile(lookSleep(t))
	if err != nil {
		t.Fatalf("read sleep executable: %v", err)
	}
	if err := os.MkdirAll(dir, 0o700); err != nil {
		t.Fatalf("create %s: %v", dir, err)
	}
	// Keep the name, because a multi-call coreutils binary selects the program from it.
	path := filepath.Join(dir, "sleep")
	if err := os.WriteFile(path, data, 0o700); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
	return path
}

// reusedPIDState returns a state for pid with a start time that pid does not have,
// as if the server stopped and the OS then gave its PID to the process with pid.
func reusedPIDState(t *testing.T, pid int, binaryPath string) runtimeState {
	t.Helper()

	state := newRuntimeState(pid, testStartConfig(binaryPath))
	if state.StartTime == 0 {
		t.Fatalf("newRuntimeState(%d) has no start time", pid)
	}
	state.StartTime++
	return state
}

func currentTestExecutable(t *testing.T) string {
	t.Helper()

	path, err := os.Executable()
	if err != nil {
		t.Fatalf("os.Executable() error = %v", err)
	}
	return path
}

func testStartConfig(binaryPath string) startConfig {
	return startConfig{BinaryPath: binaryPath}
}

func writeTestServerState(t *testing.T, cfg *config.Config, state runtimeState) {
	t.Helper()

	if err := writeStudioctlServerState(cfg, state); err != nil {
		t.Fatalf("writeStudioctlServerState() error = %v", err)
	}
}

func assertPIDFileExists(t *testing.T, pidPath string) {
	t.Helper()

	if _, err := os.Stat(pidPath); err != nil {
		t.Fatalf("pid file was removed or stat failed: %v", err)
	}
}

func assertProcessRunning(t *testing.T, pid int) {
	t.Helper()

	running, err := osutil.ProcessRunning(pid)
	if err != nil {
		t.Fatalf("ProcessRunning(%d) error = %v", pid, err)
	}
	if !running {
		t.Fatalf("process %d was stopped, want it to keep running", pid)
	}
}
