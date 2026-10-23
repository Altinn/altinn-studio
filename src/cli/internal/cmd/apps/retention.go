package apps

import (
	"errors"
	"fmt"
	"io/fs"
	"maps"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"time"

	"altinn.studio/studioctl/internal/osutil"
)

// logRetention is how long app run logs are kept after they were last written to.
const logRetention = 30 * 24 * time.Hour

// runFiles is one run's log file and metadata sidecar, either of which may be missing.
type runFiles struct {
	lastWrite    time.Time
	logName      string
	metadataName string
}

// DeleteExpiredLogs deletes app run logs and their metadata that were last written to more than
// 30 days before now, in every app log directory under appLogsDir, and removes app log
// directories left empty. It keeps files that do not follow the app log naming format.
// It continues past failures and returns them joined, without file paths.
func DeleteExpiredLogs(appLogsDir string, now time.Time) error {
	entries, err := os.ReadDir(appLogsDir)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return nil
		}
		return fmt.Errorf("read app log directories: %w", withoutPath(err))
	}

	cutoff := now.Add(-logRetention)
	var errs []error
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		if err := deleteExpiredAppLogs(filepath.Join(appLogsDir, entry.Name()), cutoff); err != nil {
			errs = append(errs, fmt.Errorf("app log directory %s: %w", entry.Name(), err))
		}
	}
	return errors.Join(errs...)
}

func deleteExpiredAppLogs(dir string, cutoff time.Time) error {
	runs, errs, err := listRuns(dir)
	if err != nil {
		return err
	}

	for _, base := range slices.Sorted(maps.Keys(runs)) {
		run := runs[base]
		if !run.lastWrite.Before(cutoff) || runProcessRunning(dir, run) {
			continue
		}
		if err := deleteRun(dir, run); err != nil {
			errs = append(errs, err)
		}
	}
	if err := removeIfEmpty(dir); err != nil {
		errs = append(errs, err)
	}
	return errors.Join(errs...)
}

// listRuns groups the directory's log and metadata files by run. A file it cannot stat is skipped
// and reported in the returned errors.
func listRuns(dir string) (map[string]runFiles, []error, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, nil, fmt.Errorf("read: %w", withoutPath(err))
	}

	runs := make(map[string]runFiles)
	var errs []error
	for _, entry := range entries {
		name := entry.Name()
		isLog := IsLogName(name)
		if entry.IsDir() || (!isLog && !IsMetadataName(name)) {
			continue
		}
		info, err := entry.Info()
		if errors.Is(err, fs.ErrNotExist) {
			continue
		}
		if err != nil {
			errs = append(errs, fmt.Errorf("stat %s: %w", name, withoutPath(err)))
			continue
		}

		base := strings.TrimSuffix(name, filepath.Ext(name))
		run := runs[base]
		if isLog {
			run.logName = name
		} else {
			run.metadataName = name
		}
		if info.ModTime().After(run.lastWrite) {
			run.lastWrite = info.ModTime()
		}
		runs[base] = run
	}
	return runs, errs, nil
}

// runProcessRunning reports whether the process that writes the run's log may still be running.
// A process that is alive but silent leaves the log's modification time unchanged.
// A reused process id only keeps the files until that other process exits.
func runProcessRunning(dir string, run runFiles) bool {
	if run.logName == "" || run.metadataName == "" {
		return false
	}
	metadata, err := readMetadata(filepath.Join(dir, run.metadataName))
	if err != nil {
		return false
	}
	running, err := osutil.ProcessRunning(metadata.ProcessID)
	return running || err != nil
}

// deleteRun deletes the log before its metadata, so metadata only outlives a log that is already gone.
func deleteRun(dir string, run runFiles) error {
	for _, name := range []string{run.logName, run.metadataName} {
		if name == "" {
			continue
		}
		if err := os.Remove(filepath.Join(dir, name)); err != nil && !errors.Is(err, fs.ErrNotExist) {
			return fmt.Errorf("delete %s: %w", name, withoutPath(err))
		}
	}
	return nil
}

func removeIfEmpty(dir string) error {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return fmt.Errorf("read: %w", withoutPath(err))
	}
	if len(entries) > 0 {
		return nil
	}
	if err := os.Remove(dir); err != nil && !errors.Is(err, fs.ErrNotExist) {
		return fmt.Errorf("remove empty directory: %w", withoutPath(err))
	}
	return nil
}

// withoutPath drops the file path from err, as output does not show paths of files studioctl manages.
func withoutPath(err error) error {
	var pathErr *fs.PathError
	if errors.As(err, &pathErr) {
		return pathErr.Err
	}
	return err
}
