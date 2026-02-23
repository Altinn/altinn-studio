package osutil

const (
	// DirPermDefault allows owner read/write/execute; group/other can read/execute.
	// Used for non-sensitive directories that must be traversable.
	DirPermDefault = 0o755

	// DirPermOwnerOnly allows only the owner to read/write/execute.
	// Used for sensitive cache or credential directories.
	DirPermOwnerOnly = 0o700

	// FilePermDefault allows owner read/write; group/other can read.
	// Used for non-sensitive files that may be shared.
	FilePermDefault = 0o644

	// FilePermOwnerOnly allows only the owner to read/write.
	// Used for credentials and other sensitive files.
	FilePermOwnerOnly = 0o600

	// OwnerReadBit is the owner-read permission bit for mask checks.
	OwnerReadBit = 0o400
)
