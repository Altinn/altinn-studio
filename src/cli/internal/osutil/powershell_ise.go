package osutil

import "strings"

const (
	powerShellISEProcessName = "powershell_ise.exe"
	maxProcessTreeDepth      = 32
)

type processSnapshotEntry struct {
	exe       string
	parentPID uint32
}

func isPowerShellISEProcessTree(currentPID uint32, processes map[uint32]processSnapshotEntry) bool {
	seen := map[uint32]struct{}{}
	for range maxProcessTreeDepth {
		if currentPID == 0 {
			return false
		}
		if _, ok := seen[currentPID]; ok {
			return false
		}
		seen[currentPID] = struct{}{}

		entry, ok := processes[currentPID]
		if !ok {
			return false
		}
		if isPowerShellISEProcessName(entry.exe) {
			return true
		}
		currentPID = entry.parentPID
	}
	return false
}

func isPowerShellISEProcessName(name string) bool {
	name = strings.TrimSpace(name)
	if idx := strings.LastIndexAny(name, `\/`); idx >= 0 {
		name = name[idx+1:]
	}
	return strings.EqualFold(name, powerShellISEProcessName)
}
