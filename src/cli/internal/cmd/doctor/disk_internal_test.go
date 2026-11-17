package doctor

import (
	"fmt"
	"io/fs"
	"slices"
	"testing"
)

func TestBuildDisk_ReportsTheChecksUnderTheirStableIDs(t *testing.T) {
	t.Parallel()

	disk := newServiceWithConfiguredHome(t).buildDisk(nil)

	ids := make([]string, 0, len(disk.Checks))
	for _, check := range disk.Checks {
		ids = append(ids, check.ID)
	}
	want := []string{
		"home_dir",
		"socket_dir",
		"log_dir",
		"data_dir",
		"bin_dir",
		"credentials_file",
		"server_binary",
		"server_state",
	}
	if !slices.Equal(ids, want) {
		t.Errorf("check IDs = %q, want %q", ids, want)
	}
}

// The text output leaves paths out, so `doctor --json` is where a script finds the file a check is about.
func TestBuildDisk_KeepsThePathOfEveryCheck(t *testing.T) {
	t.Parallel()

	disk := newServiceWithConfiguredHome(t).buildDisk(nil)

	for _, check := range disk.Checks {
		if check.Path == "" {
			t.Errorf("check %s has no path: %+v", check.ID, check)
		}
	}
}

func TestBuildDisk_WithoutAnInstalledServer_ReportsItAsNotInstalledAndNotRunning(t *testing.T) {
	t.Parallel()

	disk := newServiceWithConfiguredHome(t).buildDisk(nil)

	checks := make(map[string]DiskCheck, len(disk.Checks))
	for _, check := range disk.Checks {
		checks[check.ID] = check
	}
	if got := checks[DiskCheckServerBinary]; got.Level != diskLevelInfo || got.Message != "not installed" {
		t.Errorf("server_binary = %+v, want info %q", got, "not installed")
	}
	if got := checks[DiskCheckServerState]; got.Level != diskLevelInfo || got.Message == "" {
		t.Errorf("server_state = %+v, want an info message saying the server is not running", got)
	}
}

func TestErrorWithoutPath_LeavesOutTheFileAnErrorNames(t *testing.T) {
	t.Parallel()

	pathErr := &fs.PathError{Op: "open", Path: "/studioctl/home/credentials.yaml", Err: fs.ErrPermission}
	tests := []struct {
		err  error
		want string
	}{
		{err: pathErr, want: "permission denied"},
		{err: fmt.Errorf("read file %q: %w", pathErr.Path, pathErr), want: "permission denied"},
		{err: fmt.Errorf("parse runtime state: %w", fs.ErrInvalid), want: "parse runtime state: invalid argument"},
	}
	for _, tt := range tests {
		if got := errorWithoutPath(tt.err); got != tt.want {
			t.Errorf("errorWithoutPath(%q) = %q, want %q", tt.err, got, tt.want)
		}
	}
}
