//go:build !windows

package install

func isRetryableWindowsReplaceError(error) bool {
	return false
}

func uninstallBinaryAtWindows(string) (UninstallResult, error) {
	return UninstallResult{}, errUninstallUnsupported
}
