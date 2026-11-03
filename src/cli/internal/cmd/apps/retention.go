package apps

import (
	"encoding/json"
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
	statErrs     []error
}

// DeleteExpiredLogs deletes app run logs and their metadata that were last written to more than
// 30 days before now, in every app log directory under appLogsDir, and removes app log
// directories left empty. It keeps files that do not follow the app log naming format.
// It continues past failures and returns them joined, each naming its app log directory but no file paths.
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
		for _, err := range deleteExpiredAppLogs(filepath.Join(appLogsDir, entry.Name()), cutoff) {
			errs = append(errs, fmt.Errorf("app log directory %s: %w", entry.Name(), err))
		}
	}
	return errors.Join(errs...)
}

func deleteExpiredAppLogs(dir string, cutoff time.Time) []error {
	runs, err := listRuns(dir)
	if err != nil {
		return []error{err}
	}

	var errs []error
	for _, base := range slices.Sorted(maps.Keys(runs)) {
		run := runs[base]
		if len(run.statErrs) > 0 {
			errs = append(errs, run.statErrs...)
			continue
		}
		if !run.lastWrite.Before(cutoff) {
			continue
		}
		running, err := runProcessRunning(dir, run)
		if err != nil {
			errs = append(errs, err)
		}
		if running {
			continue
		}
		if err := deleteRun(dir, run); err != nil {
			errs = append(errs, err)
		}
	}
	if err := removeIfEmpty(dir); err != nil {
		errs = append(errs, err)
	}
	return errs
}

// listRuns groups the directory's log and metadata files by run. A run with a file it cannot stat
// records the errors, so the run is kept rather than judged on the files it could stat.
func listRuns(dir string) (map[string]runFiles, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("read: %w", withoutPath(err))
	}

	runs := make(map[string]runFiles)
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

		base := strings.TrimSuffix(name, filepath.Ext(name))
		run := runs[base]
		switch {
		case err != nil:
			run.statErrs = append(run.statErrs, fmt.Errorf("stat %s: %w", name, withoutPath(err)))
		case isLog:
			run.logName = name
		default:
			run.metadataName = name
		}
		if err == nil && info.ModTime().After(run.lastWrite) {
			run.lastWrite = info.ModTime()
		}
		runs[base] = run
	}
	return runs, nil
}

// runProcessRunning reports whether the process that writes the run's log may still be running.
// A process that is alive but silent leaves the log's modification time unchanged.
// A reused process id only keeps the files until that other process exits.
// When it cannot tell, it reports the run as running along with the error.
func runProcessRunning(dir string, run runFiles) (bool, error) {
	if run.logName == "" || run.metadataName == "" {
		return false, nil
	}
	metadata, err := readMetadata(filepath.Join(dir, run.metadataName))
	if err != nil {
		var syntaxErr *json.SyntaxError
		var typeErr *json.UnmarshalTypeError
		if errors.Is(err, fs.ErrNotExist) || errors.As(err, &syntaxErr) || errors.As(err, &typeErr) {
			return false, nil
		}
		return true, fmt.Errorf("read %s: %w", run.metadataName, withoutPath(err))
	}
	running, err := osutil.ProcessRunning(metadata.ProcessID)
	if err != nil {
		return true, fmt.Errorf("check process of %s: %w", run.logName, err)
	}
	return running, nil
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
	if pathErr, ok := errors.AsType[*fs.PathError](err); ok {
		return pathErr.Err
	}
	return err
}
