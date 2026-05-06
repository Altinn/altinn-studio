package appmanager

import (
	"context"
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"altinn.studio/studioctl/internal/config"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

func TestUpgradeAppUsesUpgradeTimeoutOnly(t *testing.T) {
	t.Parallel()

	deadlines := make(map[string]time.Duration)
	client := &Client{
		http: &http.Client{
			Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
				deadline, ok := req.Context().Deadline()
				if !ok {
					t.Fatalf("%s request has no deadline", req.URL.Path)
				}
				deadlines[req.URL.Path] = time.Until(deadline)

				body := `{}`
				if req.URL.Path == upgradePath {
					body = `{"message":"upgrade completed","output":"ok","error":"","exitCode":0}`
				}
				return &http.Response{
					StatusCode: http.StatusOK,
					Status:     "200 OK",
					Body:       io.NopCloser(strings.NewReader(body)),
					Header:     make(http.Header),
					Request:    req,
				}, nil
			}),
		},
	}

	result, err := client.UpgradeApp(
		t.Context(),
		AppUpgrade{
			ProjectFolder:            "/tmp/app",
			StudioRoot:               "",
			Kind:                     "v10",
			ConvertPackageReferences: false,
		},
	)
	if err != nil {
		t.Fatalf("UpgradeApp() error = %v", err)
	}
	if result.Output != "ok" {
		t.Fatalf("Output = %q, want ok", result.Output)
	}

	if _, err := client.Status(t.Context()); err != nil {
		t.Fatalf("Status() error = %v", err)
	}

	if deadlines[upgradePath] < 20*time.Second {
		t.Fatalf("upgrade deadline = %s, want near %s", deadlines[upgradePath], appManagerUpgradeTimeout)
	}
	if deadlines[statusPath] > 3*time.Second {
		t.Fatalf("status deadline = %s, want short app-manager request timeout", deadlines[statusPath])
	}
}

func TestUpgradeAppIncludesResponseMessageOnFailure(t *testing.T) {
	t.Parallel()

	client := &Client{
		http: &http.Client{
			Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
				return &http.Response{
					StatusCode: http.StatusBadRequest,
					Status:     "400 Bad Request",
					Body:       io.NopCloser(strings.NewReader(`{"message":"unsupported upgrade kind"}`)),
					Header:     make(http.Header),
					Request:    req,
				}, nil
			}),
		},
	}

	_, err := client.UpgradeApp(
		t.Context(),
		AppUpgrade{
			ProjectFolder:            "/tmp/app",
			StudioRoot:               "",
			Kind:                     "unknown",
			ConvertPackageReferences: false,
		},
	)
	if !errors.Is(err, errUnexpectedUpgradeStatus) {
		t.Fatalf("UpgradeApp() error = %v, want %v", err, errUnexpectedUpgradeStatus)
	}
	if !strings.Contains(err.Error(), "unsupported upgrade kind") {
		t.Fatalf("UpgradeApp() error = %v, want response message", err)
	}
}

func TestLatestAppManagerLogPath_ReturnsNewestMatchingFile(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	oldPath := writeTestLog(t, dir, "2026-04-18-1.log", "old\n")
	newPath := writeTestLog(t, dir, "2026-04-19-2.log", "new\n")
	_ = writeTestLog(t, dir, "legacy.log", "legacy\n")
	setModTime(t, oldPath, time.Date(2026, 4, 18, 1, 0, 0, 0, time.UTC))
	setModTime(t, newPath, time.Date(2026, 4, 19, 1, 0, 0, 0, time.UTC))

	got, ok := latestAppManagerLogPath(dir)
	if !ok {
		t.Fatal("latestAppManagerLogPath() ok = false, want true")
	}
	if got != newPath {
		t.Fatalf("latestAppManagerLogPath() = %q, want %q", got, newPath)
	}
}

func TestReadLatestAppManagerLogTail_ReadsOnlyNewestMatchingFile(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	oldPath := writeTestLog(t, dir, "2026-04-18-1.log", "old\n")
	newPath := writeTestLog(t, dir, "2026-04-19-2.log", "new\n")
	setModTime(t, oldPath, time.Date(2026, 4, 18, 1, 0, 0, 0, time.UTC))
	setModTime(t, newPath, time.Date(2026, 4, 19, 1, 0, 0, 0, time.UTC))

	assertLatestLogPath(t, dir, newPath)
	got := readLatestAppManagerLogTail(dir)
	if !strings.Contains(got, "new") {
		t.Fatalf("readLatestAppManagerLogTail() = %q, want newest log line", got)
	}
	if strings.Contains(got, "old") {
		t.Fatalf("readLatestAppManagerLogTail() = %q, want no old log line", got)
	}
}

func TestReadLatestAppManagerLogTail_LimitsOutput(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	var content strings.Builder
	for range appManagerLogTailLines + 1 {
		content.WriteString("line\n")
	}
	content.WriteString("last\n")
	path := writeTestLog(t, dir, "2026-04-19-2.log", content.String())

	assertLatestLogPath(t, dir, path)
	got := readLatestAppManagerLogTail(dir)
	if strings.Count(got, "line") != appManagerLogTailLines-1 {
		t.Fatalf("line count = %d, want %d", strings.Count(got, "line"), appManagerLogTailLines-1)
	}
	if !strings.Contains(got, "last") {
		t.Fatalf("readLatestAppManagerLogTail() = %q, want last line", got)
	}
}

func TestReadLatestAppManagerLogTailSince_IgnoresOlderLogs(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	oldPath := writeTestLog(t, dir, "2026-04-19-1.log", "old\n")
	newPath := writeTestLog(t, dir, "2026-04-19-2.log", "new\n")
	setModTime(t, oldPath, time.Date(2026, 4, 19, 1, 0, 0, 0, time.UTC))
	setModTime(t, newPath, time.Date(2026, 4, 19, 3, 0, 0, 0, time.UTC))

	got := readLatestAppManagerLogTailSince(dir, time.Date(2026, 4, 19, 2, 0, 0, 0, time.UTC))
	if !strings.Contains(got, "new") {
		t.Fatalf("readLatestAppManagerLogTailSince() = %q, want new log", got)
	}
	if strings.Contains(got, "old") {
		t.Fatalf("readLatestAppManagerLogTailSince() = %q, want no old log", got)
	}
}

func TestLogFiles_ReturnsMatchingFilesByModTime(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	first := writeTestLog(t, dir, "2026-04-19-2.log", "first\n")
	second := writeTestLog(t, dir, "2026-04-18-1.log", "second\n")
	_ = writeTestLog(t, dir, "legacy.log", "legacy\n")
	setModTime(t, first, time.Date(2026, 4, 19, 1, 0, 0, 0, time.UTC))
	setModTime(t, second, time.Date(2026, 4, 19, 2, 0, 0, 0, time.UTC))

	files, err := LogFiles(dir)
	if err != nil {
		t.Fatalf("LogFiles() error = %v", err)
	}
	got := make([]string, 0, len(files))
	for _, file := range files {
		got = append(got, file.Path)
	}
	want := []string{first, second}
	if strings.Join(got, "\n") != strings.Join(want, "\n") {
		t.Fatalf("LogFiles() = %v, want %v", got, want)
	}
}

func TestLogLookup_HandlesDirectoryWithGlobMetacharacters(t *testing.T) {
	t.Parallel()

	dir := filepath.Join(t.TempDir(), "logs[abc]")
	if err := os.Mkdir(dir, 0o700); err != nil {
		t.Fatalf("create log dir: %v", err)
	}
	oldPath := writeTestLog(t, dir, "2026-04-18-1.log", "first\n")
	newPath := writeTestLog(t, dir, "2026-04-19-1.log", "second\n")
	otherPath := writeTestLog(t, dir, "2026-04-19-2.log", "other\n")
	setModTime(t, oldPath, time.Date(2026, 4, 18, 1, 0, 0, 0, time.UTC))
	setModTime(t, newPath, time.Date(2026, 4, 19, 1, 0, 0, 0, time.UTC))
	setModTime(t, otherPath, time.Date(2026, 4, 18, 2, 0, 0, 0, time.UTC))

	latest, ok := LatestLogPath(dir)
	if !ok {
		t.Fatal("LatestLogPath() ok = false, want true")
	}
	if latest != newPath {
		t.Fatalf("LatestLogPath() = %q, want %q", latest, newPath)
	}

	files, err := LogFiles(dir)
	if err != nil {
		t.Fatalf("LogFiles() error = %v", err)
	}
	want := []string{oldPath, otherPath, newPath}
	got := make([]string, 0, len(files))
	for _, file := range files {
		got = append(got, file.Path)
	}
	if strings.Join(got, "\n") != strings.Join(want, "\n") {
		t.Fatalf("LogFiles() = %v, want %v", got, want)
	}
}

func TestPrepareAppManagerSocketForStart_RemovesUnreachableSocket(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	if err := os.WriteFile(cfg.AppManagerSocketPath(), []byte("stale"), 0o600); err != nil {
		t.Fatalf("write stale socket: %v", err)
	}

	if err := prepareAppManagerSocketForStart(context.Background(), cfg); err != nil {
		t.Fatalf("prepareAppManagerSocketForStart() error = %v", err)
	}
	if _, err := os.Lstat(cfg.AppManagerSocketPath()); !os.IsNotExist(err) {
		t.Fatalf("socket still exists or stat failed: %v", err)
	}
}

func TestPrepareAppManagerSocketForStart_RejectsDirectory(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	if err := os.Mkdir(cfg.AppManagerSocketPath(), 0o700); err != nil {
		t.Fatalf("create socket directory: %v", err)
	}

	err := prepareAppManagerSocketForStart(context.Background(), cfg)
	if err == nil || !strings.Contains(err.Error(), "socket path is a directory") {
		t.Fatalf("prepareAppManagerSocketForStart() error = %v, want directory error", err)
	}
}

func TestBuildStartConfig_IncludesBoundTopologyConfigPathsWhenPresent(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	if err := os.MkdirAll(filepath.Dir(cfg.BoundTopologyBaseConfigPath()), 0o700); err != nil {
		t.Fatalf("create topology config dir: %v", err)
	}
	if err := os.WriteFile(cfg.BoundTopologyBaseConfigPath(), []byte("{}\n"), 0o600); err != nil {
		t.Fatalf("write base topology config: %v", err)
	}

	got, err := buildStartConfig(cfg, "8000", "/path/to/studioctl")
	if err != nil {
		t.Fatalf("buildStartConfig() error = %v", err)
	}
	if got.BoundTopologyBaseConfigPath != cfg.BoundTopologyBaseConfigPath() {
		t.Fatalf(
			"BoundTopologyBaseConfigPath = %q, want %q",
			got.BoundTopologyBaseConfigPath,
			cfg.BoundTopologyBaseConfigPath(),
		)
	}
	if got.BoundTopologyConfigPath != cfg.BoundTopologyConfigPath() {
		t.Fatalf(
			"BoundTopologyConfigPath = %q, want %q",
			got.BoundTopologyConfigPath,
			cfg.BoundTopologyConfigPath(),
		)
	}
}

func TestLiveConfig_UsesStatusBoundTopologyPaths(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	if err := os.MkdirAll(filepath.Dir(cfg.BoundTopologyBaseConfigPath()), 0o700); err != nil {
		t.Fatalf("create topology config dir: %v", err)
	}
	if err := os.WriteFile(cfg.BoundTopologyBaseConfigPath(), []byte("{}\n"), 0o600); err != nil {
		t.Fatalf("write base topology config: %v", err)
	}

	got := liveConfig(cfg, &Status{
		Tunnel:                      TunnelStatus{URL: TunnelURL("8000")},
		LocaltestURL:                LocaltestURL("8000"),
		StudioctlPath:               "/path/to/studioctl",
		BoundTopologyBaseConfigPath: "",
		BoundTopologyConfigPath:     "",
	})

	if got.BoundTopologyBaseConfigPath != "" {
		t.Fatalf("BoundTopologyBaseConfigPath = %q, want empty live status value", got.BoundTopologyBaseConfigPath)
	}
	if got.BoundTopologyConfigPath != "" {
		t.Fatalf("BoundTopologyConfigPath = %q, want empty live status value", got.BoundTopologyConfigPath)
	}
}

func writeTestLog(t *testing.T, dir, name, content string) string {
	t.Helper()

	path := filepath.Join(dir, name)
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatalf("write log %q: %v", path, err)
	}
	return path
}

func testConfig(t *testing.T) *config.Config {
	t.Helper()

	dir := t.TempDir()
	return &config.Config{
		Home:      dir,
		SocketDir: dir,
		LogDir:    filepath.Join(dir, "logs"),
		DataDir:   filepath.Join(dir, "data"),
		BinDir:    filepath.Join(dir, "bin"),
	}
}

func assertLatestLogPath(t *testing.T, dir, want string) {
	t.Helper()

	got, ok := latestAppManagerLogPath(dir)
	if !ok {
		t.Fatal("latestAppManagerLogPath() ok = false, want true")
	}
	if got != want {
		t.Fatalf("latestAppManagerLogPath() = %q, want %q", got, want)
	}
}

func setModTime(t *testing.T, path string, modTime time.Time) {
	t.Helper()

	if err := os.Chtimes(path, modTime, modTime); err != nil {
		t.Fatalf("set modtime %q: %v", path, err)
	}
}
