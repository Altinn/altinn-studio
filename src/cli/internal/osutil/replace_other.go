//go:build !windows

package osutil

func isRetryableReplaceError(error) bool {
	return false
}
