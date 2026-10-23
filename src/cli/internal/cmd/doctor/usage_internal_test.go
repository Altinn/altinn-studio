package doctor

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/osutil"
)

func newServiceWithConfiguredHome(t *testing.T) *Service {
	t.Helper()

	home := t.TempDir()
	cfg, err := config.New(config.Flags{Home: home, SocketDir: home, Verbose: false}, "test")
	if err != nil {
		t.Fatalf("config.New() error = %v", err)
	}
	return New(cfg, nil)
}

func seedFile(t *testing.T, path string, size int) {
	t.Helper()

	if err := os.MkdirAll(filepath.Dir(path), 0o750); err != nil {
		t.Fatalf("MkdirAll() error = %v", err)
	}
	if err := os.WriteFile(path, make([]byte, size), 0o600); err != nil {
		t.Fatalf("WriteFile() error = %v", err)
	}
}

func usageByID(t *testing.T, disk *Disk) map[string]DiskUsage {
	t.Helper()

	byID := make(map[string]DiskUsage, len(disk.Usage))
	for _, usage := range disk.Usage {
		byID[usage.ID] = usage
	}
	return byID
}

func assertUsageBytes(t *testing.T, usage map[string]DiskUsage, id string, want int64) {
	t.Helper()

	got, ok := usage[id]
	if !ok {
		t.Fatalf("usage %q missing", id)
	}
	if got.Bytes == nil {
		t.Fatalf("usage %q unknown (%s), want %d bytes", id, got.Error, want)
	}
	if *got.Bytes != want {
		t.Fatalf("usage %q = %d bytes, want %d", id, *got.Bytes, want)
	}
}

func TestBuildDisk_ReportsUsageOfEachAreaAndTheTotal(t *testing.T) {
	t.Parallel()

	service := newServiceWithConfiguredHome(t)
	cfg := service.cfg
	seedFile(t, filepath.Join(cfg.StudioctlServerLogDir(), "server.log"), 100)
	seedFile(t, filepath.Join(cfg.AppLogDir("ttd/app"), "run.log"), 20)
	seedFile(t, filepath.Join(cfg.DataDir, "AltinnPlatformLocal", "blob", "data.json"), 3000)
	seedFile(t, filepath.Join(cfg.DataDir, "workflow-engine-db", "PG_VERSION"), 2)
	seedFile(t, filepath.Join(cfg.DataDir, "infra", "resource.yaml"), 400)
	seedFile(t, filepath.Join(cfg.StudioctlServerInstallDir(), "studioctl-server.dll"), 50000)
	seedFile(t, filepath.Join(cfg.Home, "apps", "ttd", "app", "secrets", "client.json"), 5)

	disk := service.buildDisk(&App{Found: false})

	usage := usageByID(t, disk)
	if len(disk.Usage) != 4 {
		t.Fatalf("usage = %+v, want logs, localtest data, server and total", disk.Usage)
	}
	assertUsageBytes(t, usage, DiskUsageLogs, 120)
	assertUsageBytes(t, usage, DiskUsageLocaltestData, 3002)
	assertUsageBytes(t, usage, DiskUsageServer, 50000)
	assertUsageBytes(t, usage, DiskUsageTotal, 53527)
	if disk.Usage[len(disk.Usage)-1].ID != DiskUsageTotal {
		t.Errorf("last usage = %q, want the total", disk.Usage[len(disk.Usage)-1].ID)
	}
	if disk.HasIssues {
		t.Errorf("HasIssues = true, checks: %+v", disk.Checks)
	}
}

// Sizes are information: an area that cannot be measured, here a legacy workflow-engine database the
// postgres container owns, is reported as unknown, never as a problem. The error states only the cause.
func TestBuildDisk_UnmeasurableAreaIsUnknownWithoutReportingIssues(t *testing.T) {
	t.Parallel()
	if runtime.GOOS == osutil.OSWindows || os.Geteuid() == 0 {
		t.Skip("directory permission bits do not restrict this user")
	}

	service := newServiceWithConfiguredHome(t)
	cfg := service.cfg
	seedFile(t, filepath.Join(cfg.LogDir, "server.log"), 10)
	locked := filepath.Join(cfg.DataDir, "workflow-engine-db")
	seedFile(t, filepath.Join(locked, "PG_VERSION"), 3)
	if err := os.Chmod(locked, 0); err != nil {
		t.Fatalf("Chmod() error = %v", err)
	}
	t.Cleanup(func() {
		if err := os.Chmod(locked, 0o700); err != nil {
			t.Errorf("restore permissions on %s: %v", locked, err)
		}
	})

	disk := service.buildDisk(&App{Found: false})

	usage := usageByID(t, disk)
	for _, id := range []string{DiskUsageLocaltestData, DiskUsageTotal} {
		if usage[id].Bytes != nil || usage[id].Error != "permission denied" {
			t.Errorf("usage %q = %+v, want unknown with just the cause", id, usage[id])
		}
	}
	assertUsageBytes(t, usage, DiskUsageLogs, 10)
	if disk.HasIssues {
		t.Errorf("HasIssues = true, checks: %+v", disk.Checks)
	}
}

// A root that is not a directory reports just the cause, like any other walk error.
func TestMeasureDiskUsage_RootThatIsAFileReportsOnlyTheCause(t *testing.T) {
	t.Parallel()

	service := newServiceWithConfiguredHome(t)
	file := filepath.Join(service.cfg.Home, "not-a-dir")
	seedFile(t, file, 1)

	usage := service.measureDiskUsage(DiskUsageLogs, file)

	if usage.Bytes != nil || usage.Error != "not a directory" {
		t.Errorf("usage = %+v, want unknown with error %q", usage, "not a directory")
	}
}
