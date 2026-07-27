//go:build windows

package osutil

import (
	"errors"
	"fmt"
	"os"
	"sync"
	"unsafe"

	"golang.org/x/sys/windows"
)

var errProcessSnapshotEmpty = errors.New("process snapshot is empty")

//nolint:gochecknoglobals // Cached host detection avoids repeated Windows process snapshots on every output write.
var (
	powerShellISEOnce sync.Once
	powerShellISEHost bool
)

// IsPowerShellISEHost reports whether studioctl is running under Windows PowerShell ISE.
func IsPowerShellISEHost() bool {
	powerShellISEOnce.Do(func() {
		processID, err := windowsProcessID(os.Getpid())
		if err != nil {
			return
		}
		processes, err := windowsProcessSnapshot()
		if err != nil {
			return
		}
		powerShellISEHost = isPowerShellISEProcessTree(processID, processes)
	})
	return powerShellISEHost
}

func windowsProcessSnapshot() (processes map[uint32]processSnapshotEntry, err error) {
	snapshot, err := windows.CreateToolhelp32Snapshot(windows.TH32CS_SNAPPROCESS, 0)
	if err != nil {
		return nil, fmt.Errorf("create process snapshot: %w", err)
	}
	defer func() {
		if closeErr := windows.CloseHandle(snapshot); closeErr != nil {
			err = errors.Join(err, fmt.Errorf("close process snapshot handle: %w", closeErr))
		}
	}()

	processes = map[uint32]processSnapshotEntry{}
	var entry windows.ProcessEntry32
	entry.Size = uint32(unsafe.Sizeof(entry))
	for err := windows.Process32First(snapshot, &entry); err == nil; err = windows.Process32Next(snapshot, &entry) {
		processes[entry.ProcessID] = processSnapshotEntry{
			parentPID: entry.ParentProcessID,
			exe:       windows.UTF16ToString(entry.ExeFile[:]),
		}
	}
	if len(processes) == 0 {
		return nil, errProcessSnapshotEmpty
	}
	return processes, nil
}
