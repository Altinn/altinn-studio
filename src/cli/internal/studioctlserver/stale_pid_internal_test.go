package studioctlserver

import (
	"os"
	"os/exec"
	"testing"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/osutil"
)

func TestReadStudioctlServerState_IgnoresPIDOfCurrentProcess(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	writeTestServerState(t, cfg, newRuntimeState(os.Getpid(), startConfig{}))

	_, ok, err := readStudioctlServerState(cfg)
	if err != nil {
		t.Fatalf("readStudioctlServerState() error = %v", err)
	}
	if ok {
		t.Fatal("readStudioctlServerState() ok = true, want false")
	}
}

func TestReadStudioctlServerState_IgnoresProcessThatReusedServerPID(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	pid := startSleepProcess(t)
	state := newRuntimeState(pid, startConfig{})
	if state.StartTime == 0 {
		t.Fatalf("newRuntimeState(%d) has no start time", pid)
	}
	// A process that got the PID after the server stopped has a different start time.
	state.StartTime++
	writeTestServerState(t, cfg, state)

	_, ok, err := readStudioctlServerState(cfg)
	if err != nil {
		t.Fatalf("readStudioctlServerState() error = %v", err)
	}
	if ok {
		t.Fatal("readStudioctlServerState() ok = true, want false")
	}
	running, err := osutil.ProcessRunning(pid)
	if err != nil || !running {
		t.Fatalf("ProcessRunning(%d) = (%t, %v), want the process to keep running", pid, running, err)
	}
}

func TestReadStudioctlServerState_AcceptsServerProcess(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	pid := startSleepProcess(t)
	writeTestServerState(t, cfg, newRuntimeState(pid, startConfig{}))

	state, ok, err := readStudioctlServerState(cfg)
	if err != nil {
		t.Fatalf("readStudioctlServerState() error = %v", err)
	}
	if !ok || state.PID != pid {
		t.Fatalf("readStudioctlServerState() = (pid %d, ok %t), want (pid %d, ok true)", state.PID, ok, pid)
	}
}

// startSleepProcess starts "sleep 60" and returns its PID.
func startSleepProcess(t *testing.T) int {
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
	return cmd.Process.Pid
}

func writeTestServerState(t *testing.T, cfg *config.Config, state runtimeState) {
	t.Helper()

	if err := writeStudioctlServerState(cfg, state); err != nil {
		t.Fatalf("writeStudioctlServerState() error = %v", err)
	}
}
