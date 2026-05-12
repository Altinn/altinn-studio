//go:build !windows

package install

func isRetryableWindowsReplaceError(error) bool {
	return false
}
