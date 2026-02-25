//go:build !windows

package osutil

// SecureFile ensures the file has restrictive permissions.
// On Unix systems, file permissions are set at creation time via mode,
// so this is a no-op.
func SecureFile(_ string) error {
	return nil
}
