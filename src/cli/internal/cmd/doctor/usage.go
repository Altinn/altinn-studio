package doctor

import (
	"errors"
	"io/fs"

	"altinn.studio/studioctl/internal/cmd/env/localtest/components"
	"altinn.studio/studioctl/internal/osutil"
)

// Disk usage area IDs, in the order doctor reports them.
const (
	DiskUsageLogs          = "logs"
	DiskUsageLocaltestData = "localtest_data"
	DiskUsageServer        = "server"
	DiskUsageTotal         = "total"
)

// DiskUsage is the size of one area of studioctl's home directory.
type DiskUsage struct {
	ID string `json:"id"`
	// Bytes is nil when the area could not be measured; Error then says why.
	Bytes *int64 `json:"bytes"`
	Error string `json:"error,omitempty"`
}

// buildDiskUsage measures the areas of studioctl's home a user can tell apart and act on: logs, the
// localtest data `env reset` deletes, and the installed studioctl-server. The rest (installed localtest
// resources, per-app secrets and keys, credentials) is small and only shows in the total. The
// workflow-engine database lives in a container volume, outside the home directory, and is not counted.
//
// It reports sizes only: how large the home has grown is not a fault, so nothing here feeds
// Disk.HasIssues.
func (s *Service) buildDiskUsage() []DiskUsage {
	return []DiskUsage{
		s.measureDiskUsage(DiskUsageLogs, s.cfg.LogDir),
		s.measureDiskUsage(
			DiskUsageLocaltestData,
			components.LocaltestStoragePath(s.cfg.DataDir),
			components.WorkflowEngineDbDataPath(s.cfg.DataDir),
		),
		s.measureDiskUsage(DiskUsageServer, s.cfg.StudioctlServerInstallDir()),
		s.measureDiskUsage(DiskUsageTotal, s.cfg.Home),
	}
}

// measureDiskUsage sums the sizes of dirs, or reports the area as unknown if any of them cannot be
// measured. The reported error states only the cause, as output does not show paths of files studioctl
// manages; the verbose log keeps the path.
func (s *Service) measureDiskUsage(id string, dirs ...string) DiskUsage {
	var total int64
	for _, dir := range dirs {
		size, err := osutil.DirSize(dir)
		if err != nil {
			s.debugf("disk usage %s unknown: %v", id, err)
			return DiskUsage{ID: id, Bytes: nil, Error: withoutPath(err).Error()}
		}
		total += size
	}
	return DiskUsage{ID: id, Bytes: new(total), Error: ""}
}

// withoutPath drops the file path from err, as output does not show paths of files studioctl manages.
func withoutPath(err error) error {
	var pathErr *fs.PathError
	if errors.As(err, &pathErr) {
		return pathErr.Err
	}
	return err
}
