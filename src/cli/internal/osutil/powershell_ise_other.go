//go:build !windows

package osutil

// IsPowerShellISEHost reports whether studioctl is running under Windows PowerShell ISE.
func IsPowerShellISEHost() bool {
	return false
}
