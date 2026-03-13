package types

// ProgressUpdate represents one best-effort progress update for a pull/build operation.
type ProgressUpdate struct {
	Message       string
	Current       int64
	Total         int64
	Indeterminate bool
}

// ProgressHandler receives progress updates.
type ProgressHandler func(update ProgressUpdate)
