package studioctlserver

import (
	"context"
	"errors"
	"os"
	"os/exec"
	"testing"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/osutil"
)

func TestReadLiveStudioctlServerState_RemovesPIDOfCurrentProcess(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	writeTestServerState(t, cfg, os.Getpid(), currentTestExecutable(t))

	_, ok, err := readLiveStudioctlServerState(cfg)
	if err != nil {
		t.Fatalf("readLiveStudioctlServerState() error = %v", err)
	}
	if ok {
		t.Fatal("readLiveStudioctlServerState() ok = true, want false")
	}
	assertNoPIDFile(t, cfg.StudioctlServerPIDPath())
}

func TestReadLiveStudioctlServerState_RemovesPIDOfUnrelatedProcess(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	pid, _ := startUnrelatedProcess(t)
	writeTestServerState(t, cfg, pid, cfg.StudioctlServerBinaryPath())

	_, ok, err := readLiveStudioctlServerState(cfg)
	if err != nil {
		t.Fatalf("readLiveStudioctlServerState() error = %v", err)
	}
	if ok {
		t.Fatal("readLiveStudioctlServerState() ok = true, want false")
	}
	assertNoPIDFile(t, cfg.StudioctlServerPIDPath())
	assertProcessRunning(t, pid)
}

func TestReadLiveStudioctlServerState_KeepsPIDOfServerExecutable(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	pid, path := startUnrelatedProcess(t)
	writeTestServerState(t, cfg, pid, path)

	state, ok, err := readLiveStudioctlServerState(cfg)
	if err != nil {
		t.Fatalf("readLiveStudioctlServerState() error = %v", err)
	}
	if !ok || state.PID != pid {
		t.Fatalf("readLiveStudioctlServerState() = (pid %d, ok %t), want (pid %d, ok true)", state.PID, ok, pid)
	}
}

func TestEnsureStarted_DoesNotKillProcessThatReusedServerPID(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	pid, _ := startUnrelatedProcess(t)
	writeTestServerState(t, cfg, pid, cfg.StudioctlServerBinaryPath())

	// The test config has no studioctl-server binary, so a start stops at ErrBinaryMissing.
	err := EnsureStartedWithStudioctlPath(context.Background(), cfg, "8000", "")
	if !errors.Is(err, ErrBinaryMissing) {
		t.Fatalf("EnsureStartedWithStudioctlPath() error = %v, want %v", err, ErrBinaryMissing)
	}
	assertNoPIDFile(t, cfg.StudioctlServerPIDPath())
	assertProcessRunning(t, pid)
}

func TestShutdown_DoesNotKillProcessThatReusedServerPID(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	pid, _ := startUnrelatedProcess(t)
	writeTestServerState(t, cfg, pid, cfg.StudioctlServerBinaryPath())

	_, err := Shutdown(context.Background(), cfg)
	if !errors.Is(err, ErrNotRunning) {
		t.Fatalf("Shutdown() error = %v, want %v", err, ErrNotRunning)
	}
	assertNoPIDFile(t, cfg.StudioctlServerPIDPath())
	assertProcessRunning(t, pid)
}

// startUnrelatedProcess starts a process that is not studioctl-server and returns its PID and executable.
func startUnrelatedProcess(t *testing.T) (int, string) {
	t.Helper()

	path, err := exec.LookPath("sleep")
	if err != nil {
		t.Skip("sleep is not available")
	}
	// The test context ends before cleanup runs, which kills the process.
	cmd := exec.CommandContext(t.Context(), path, "60")
	if err := cmd.Start(); err != nil {
		t.Fatalf("start %s: %v", path, err)
	}
	t.Cleanup(func() {
		ignoreError(cmd.Wait())
	})
	return cmd.Process.Pid, path
}

func currentTestExecutable(t *testing.T) string {
	t.Helper()

	path, err := os.Executable()
	if err != nil {
		t.Fatalf("os.Executable() error = %v", err)
	}
	return path
}

func writeTestServerState(t *testing.T, cfg *config.Config, pid int, binaryPath string) {
	t.Helper()

	state := runtimeState{PID: pid, Start: startConfig{BinaryPath: binaryPath}}
	if err := writeStudioctlServerState(cfg, state); err != nil {
		t.Fatalf("writeStudioctlServerState() error = %v", err)
	}
}

func assertNoPIDFile(t *testing.T, pidPath string) {
	t.Helper()

	if _, err := os.Stat(pidPath); !os.IsNotExist(err) {
		t.Fatalf("pid file still exists or stat failed: %v", err)
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
