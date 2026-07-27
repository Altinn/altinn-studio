package osutil

import "testing"

func TestIsPowerShellISEProcessTreeDetectsAncestor(t *testing.T) {
	processes := map[uint32]processSnapshotEntry{
		10: {parentPID: 9, exe: "studioctl.exe"},
		9:  {parentPID: 8, exe: "dev.exe"},
		8:  {parentPID: 7, exe: `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`},
		7:  {parentPID: 6, exe: `C:\Windows\System32\WindowsPowerShell\v1.0\powershell_ise.exe`},
	}

	if !isPowerShellISEProcessTree(10, processes) {
		t.Fatal("isPowerShellISEProcessTree() = false, want true")
	}
}

func TestIsPowerShellISEProcessTreeRejectsPowerShellConsole(t *testing.T) {
	processes := map[uint32]processSnapshotEntry{
		10: {parentPID: 9, exe: "studioctl.exe"},
		9:  {parentPID: 8, exe: "dev.exe"},
		8:  {parentPID: 0, exe: `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`},
	}

	if isPowerShellISEProcessTree(10, processes) {
		t.Fatal("isPowerShellISEProcessTree() = true, want false")
	}
}

func TestIsPowerShellISEProcessTreeStopsOnCycle(t *testing.T) {
	processes := map[uint32]processSnapshotEntry{
		10: {parentPID: 9, exe: "studioctl.exe"},
		9:  {parentPID: 10, exe: "go.exe"},
	}

	if isPowerShellISEProcessTree(10, processes) {
		t.Fatal("isPowerShellISEProcessTree() = true, want false")
	}
}
