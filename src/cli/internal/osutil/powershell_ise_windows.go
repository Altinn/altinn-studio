//go:build windows

package osutil

import (
	"errors"
	"os"
	"sync"
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	powerShellISEOnce sync.Once
	powerShellISEHost bool
)

// IsPowerShellISEHost reports whether studioctl is running under Windows PowerShell ISE.
func IsPowerShellISEHost() bool {
	powerShellISEOnce.Do(func() {
		processes, err := windowsProcessSnapshot()
		if err != nil {
			return
		}
		powerShellISEHost = isPowerShellISEProcessTree(uint32(os.Getpid()), processes)
	})
	return powerShellISEHost
}

func windowsProcessSnapshot() (map[uint32]processSnapshotEntry, error) {
	snapshot, err := windows.CreateToolhelp32Snapshot(windows.TH32CS_SNAPPROCESS, 0)
	if err != nil {
		return nil, err
	}
	defer windows.CloseHandle(snapshot) //nolint:errcheck // Best-effort cleanup after snapshot read.

	processes := map[uint32]processSnapshotEntry{}
	var entry windows.ProcessEntry32
	entry.Size = uint32(unsafe.Sizeof(entry))
	for err := windows.Process32First(snapshot, &entry); err == nil; err = windows.Process32Next(snapshot, &entry) {
		processes[entry.ProcessID] = processSnapshotEntry{
			parentPID: entry.ParentProcessID,
			exe:       windows.UTF16ToString(entry.ExeFile[:]),
		}
	}
	if len(processes) == 0 {
		return nil, errors.New("process snapshot is empty")
	}
	return processes, nil
}
