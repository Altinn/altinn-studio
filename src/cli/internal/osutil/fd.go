package osutil

const maxInt = int(^uint(0) >> 1)

// FDInt converts a file descriptor to int only when it fits.
func FDInt(fd uintptr) (int, bool) {
	if fd > uintptr(maxInt) {
		return 0, false
	}
	return int(fd), true
}
