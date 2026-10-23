package doctor

import (
	"path/filepath"
	"strings"

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

type diskUsageArea struct {
	id    string
	paths []string
}

// buildDiskUsage measures studioctl's home in one walk. It reports sizes only: how large the home has
// grown is not a fault, so nothing here feeds Disk.HasIssues.
//
// The areas are the ones a user can tell apart and act on: logs, the localtest data `env reset`
// deletes, and the installed studioctl-server. The rest (installed localtest resources, per-app secrets
// and keys, credentials) is small and only shows in the total. The workflow-engine database lives in a
// container volume, outside the home directory, and is not counted.
func (s *Service) buildDiskUsage() []DiskUsage {
	areas := []diskUsageArea{
		{id: DiskUsageLogs, paths: []string{s.cfg.LogDir}},
		{id: DiskUsageLocaltestData, paths: []string{
			components.LocaltestStoragePath(s.cfg.DataDir),
			components.WorkflowEngineDbDataPath(s.cfg.DataDir),
		}},
		{id: DiskUsageServer, paths: []string{s.cfg.StudioctlServerInstallDir()}},
	}

	var parts []string
	partArea := make([]int, 0, len(areas))
	for i, area := range areas {
		for _, path := range area.paths {
			if rel, ok := relativeToHome(s.cfg.Home, path); ok {
				parts = append(parts, rel)
				partArea = append(partArea, i)
			}
		}
	}

	total, partSizes := osutil.MeasureTree(s.cfg.Home, parts)

	sizes := make([]osutil.TreeSize, len(areas))
	for i, size := range partSizes {
		area := &sizes[partArea[i]]
		area.Bytes += size.Bytes
		if area.Err == nil {
			area.Err = size.Err
		}
	}

	usage := make([]DiskUsage, 0, len(areas)+1)
	for i, area := range areas {
		usage = append(usage, s.diskUsageEntry(area.id, sizes[i]))
	}
	return append(usage, s.diskUsageEntry(DiskUsageTotal, total))
}

func (s *Service) diskUsageEntry(id string, size osutil.TreeSize) DiskUsage {
	if size.Err != nil {
		s.debugf("disk usage %s unknown: %v", id, size.Err)
		return DiskUsage{ID: id, Bytes: nil, Error: size.Err.Error()}
	}
	return DiskUsage{ID: id, Bytes: new(size.Bytes), Error: ""}
}

// relativeToHome returns path relative to home, or false when it lies outside it: the walk never
// leaves the home directory.
func relativeToHome(home, path string) (string, bool) {
	rel, err := filepath.Rel(home, path)
	if err != nil || rel == "." || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
		return "", false
	}
	return rel, true
}
