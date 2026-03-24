// Package perm centralizes filesystem permission constants.
package perm

const (
	// DirPermDefault allows owner read/write/execute; group/other can read/execute.
	// Used for non-sensitive directories that must be traversable.
	DirPermDefault = 0o755

	// FilePermDefault allows owner read/write; group/other can read.
	// Used for non-sensitive files that may be shared.
	FilePermDefault = 0o644
)
