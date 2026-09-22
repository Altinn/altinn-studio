//go:build !windows

package install

func uninstallBinaryAtWindows(string) (UninstallResult, error) {
	return UninstallResult{}, errUninstallUnsupported
}
