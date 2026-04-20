// Package apps contains app command support code.
package apps

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"altinn.studio/studioctl/internal/logstream"
	"altinn.studio/studioctl/internal/osutil"
)

const (
	dateFormat = "2006-01-02"
	logSuffix  = ".log"
	metaSuffix = ".json"
)

// RunMetadata describes the studioctl run that produced one app log file.
type RunMetadata struct {
	StartedAt time.Time `json:"startedAt"`
	AppID     string    `json:"appId"`
	Mode      string    `json:"mode"`
	ID        string    `json:"id"`
	Name      string    `json:"name,omitempty"`
	LogPath   string    `json:"logPath"`
	ProcessID int       `json:"processId,omitempty"`
	HostPort  int       `json:"hostPort,omitempty"`
}

// SanitizeAppID returns the directory-safe app id used for app log folders.
func SanitizeAppID(appID string) string {
	return strings.ReplaceAll(appID, "/", "-")
}

// NextLogPath returns the next auto-incremented app log path for the given date.
func NextLogPath(dir string, now time.Time) (string, error) {
	date := now.Format(dateFormat)
	nextRunID, err := nextRunID(dir, date)
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, date+"-"+strconv.Itoa(nextRunID)+logSuffix), nil
}

// WriteRunMetadata writes sidecar metadata for an app log file.
func WriteRunMetadata(logPath string, metadata RunMetadata) error {
	metadata.LogPath = logPath
	data, err := json.MarshalIndent(metadata, "", "  ")
	if err != nil {
		return fmt.Errorf("encode app log metadata: %w", err)
	}
	if err := os.WriteFile(MetadataPath(logPath), append(data, '\n'), osutil.FilePermOwnerOnly); err != nil {
		return fmt.Errorf("write app log metadata: %w", err)
	}
	return nil
}

// MetadataPath returns the sidecar metadata path for an app log path.
func MetadataPath(logPath string) string {
	return strings.TrimSuffix(logPath, filepath.Ext(logPath)) + metaSuffix
}

// LatestLogPath returns the most recently modified app log path.
func LatestLogPath(dir string) (string, bool, error) {
	files, err := LogFiles(dir)
	if err != nil || len(files) == 0 {
		return "", false, err
	}
	return files[len(files)-1].Path, true, nil
}

// LogFiles returns app log files ordered by modification time.
func LogFiles(dir string) ([]logstream.File, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("read app log directory: %w", err)
	}

	files := make([]logstream.File, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || !IsLogName(entry.Name()) {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			return nil, fmt.Errorf("stat app log %s: %w", entry.Name(), err)
		}
		files = append(files, logstream.File{
			Path:    filepath.Join(dir, entry.Name()),
			ModTime: info.ModTime(),
			Size:    info.Size(),
		})
	}
	sort.Slice(files, func(i, j int) bool {
		if files[i].ModTime.Equal(files[j].ModTime) {
			return files[i].Path < files[j].Path
		}
		return files[i].ModTime.Before(files[j].ModTime)
	})

	return files, nil
}

// FindMetadataByID returns the newest app log metadata matching a runtime id.
func FindMetadataByID(dir string, id string) (RunMetadata, bool, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return zeroRunMetadata(), false, nil
		}
		return zeroRunMetadata(), false, fmt.Errorf("read app log directory: %w", err)
	}

	var found RunMetadata
	foundModTime := time.Time{}
	for _, entry := range entries {
		if entry.IsDir() || !IsMetadataName(entry.Name()) {
			continue
		}
		path := filepath.Join(dir, entry.Name())
		metadata, err := readMetadata(path)
		if err != nil {
			return zeroRunMetadata(), false, err
		}
		if !metadataMatchesID(metadata, id) {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			return zeroRunMetadata(), false, fmt.Errorf("stat app log metadata %s: %w", entry.Name(), err)
		}
		if found.LogPath == "" || info.ModTime().After(foundModTime) {
			found = metadata
			foundModTime = info.ModTime()
		}
	}
	return found, found.LogPath != "", nil
}

// IsLogName reports whether name matches the app log file naming format.
func IsLogName(name string) bool {
	return runIDFromName(name, logSuffix)
}

// IsMetadataName reports whether name matches the app log metadata naming format.
func IsMetadataName(name string) bool {
	return runIDFromName(name, metaSuffix)
}

func nextRunID(dir string, date string) (int, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return 0, fmt.Errorf("read app log directory: %w", err)
	}

	maxRunID := 0
	prefix := date + "-"
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if !strings.HasPrefix(name, prefix) || !strings.HasSuffix(name, logSuffix) {
			continue
		}
		runIDText := strings.TrimSuffix(strings.TrimPrefix(name, prefix), logSuffix)
		runID, parseErr := strconv.Atoi(runIDText)
		if parseErr == nil && runID > maxRunID {
			maxRunID = runID
		}
	}
	return maxRunID + 1, nil
}

func readMetadata(path string) (RunMetadata, error) {
	//nolint:gosec // G304: path comes from the configured app log directory and metadata filename pattern.
	data, err := os.ReadFile(path)
	if err != nil {
		return zeroRunMetadata(), fmt.Errorf("read app log metadata: %w", err)
	}
	var metadata RunMetadata
	if err := json.Unmarshal(data, &metadata); err != nil {
		return zeroRunMetadata(), fmt.Errorf("decode app log metadata: %w", err)
	}
	return metadata, nil
}

func zeroRunMetadata() RunMetadata {
	return RunMetadata{
		StartedAt: time.Time{},
		AppID:     "",
		Mode:      "",
		ID:        "",
		Name:      "",
		LogPath:   "",
		ProcessID: 0,
		HostPort:  0,
	}
}

func metadataMatchesID(metadata RunMetadata, id string) bool {
	if metadata.ID == id {
		return true
	}
	if metadata.ProcessID > 0 && strconv.Itoa(metadata.ProcessID) == id {
		return true
	}
	return false
}

func runIDFromName(name string, suffix string) bool {
	const dateLength = len("2006-01-02")
	if len(name) <= dateLength+len("-")+len(suffix) {
		return false
	}
	if !isUTCDatePrefix(name[:dateLength]) {
		return false
	}
	if name[dateLength] != '-' {
		return false
	}
	if !strings.HasSuffix(name, suffix) {
		return false
	}

	value, err := strconv.Atoi(name[dateLength+1 : len(name)-len(suffix)])
	return err == nil && value > 0
}

func isUTCDatePrefix(value string) bool {
	if len(value) != len("2006-01-02") || value[4] != '-' || value[7] != '-' {
		return false
	}
	for i, r := range value {
		if i == 4 || i == 7 {
			continue
		}
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}
