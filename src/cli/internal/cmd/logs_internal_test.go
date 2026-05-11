package cmd

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	containerruntime "altinn.studio/devenv/pkg/container"
	containermock "altinn.studio/devenv/pkg/container/mock"
	appsvc "altinn.studio/studioctl/internal/cmd/app"
	appsupport "altinn.studio/studioctl/internal/cmd/apps"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/studioctlserver"
	"altinn.studio/studioctl/internal/ui"
)

func TestAppLogsStreamsProcessLogByPID(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	processID := 123
	logDir := cfg.AppLogDir(appsupport.SanitizeAppID(testAppID))
	logPath := writeAppLog(t, logDir, "2026-04-20-1.log", "one\ntwo\n")
	writeAppLogMetadata(t, logPath, appsupport.RunMetadata{
		StartedAt: time.Now().UTC(),
		AppID:     testAppID,
		Mode:      runModeProcess,
		ID:        "123",
		LogPath:   logPath,
		ProcessID: processID,
	})

	var out bytes.Buffer
	command := &appLogsCommand{
		out: ui.NewOutput(&out, io.Discard, false),
		cfg: cfg,
		server: studioctlServerAccess{
			client: &fakeStudioctlServerClient{
				status: &studioctlserver.Status{
					Apps: []studioctlserver.DiscoveredApp{
						{
							ProcessID: &processID,
							AppID:     testAppID,
							BaseURL:   "http://127.0.0.1:5005",
						},
					},
				},
			},
		},
	}

	if err := command.run(
		t.Context(),
		[]string{"--id", "123", "--tail", "1", "--follow=false"},
	); err != nil {
		t.Fatalf("run() error = %v", err)
	}
	if out.String() != "two"+osutil.LineBreak {
		t.Fatalf("output = %q, want tail line", out.String())
	}
}

func TestAppLogsJSONIncludesMetadata(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	processID := 123
	logDir := cfg.AppLogDir(appsupport.SanitizeAppID(testAppID))
	logPath := writeAppLog(t, logDir, "2026-04-20-1.log", "one\n")
	writeAppLogMetadata(t, logPath, appsupport.RunMetadata{
		StartedAt: time.Now().UTC(),
		AppID:     testAppID,
		Mode:      runModeProcess,
		ID:        "123",
		Name:      "Altinn.Application.dll",
		LogPath:   logPath,
		ProcessID: processID,
	})

	var out bytes.Buffer
	command := &appLogsCommand{
		out: ui.NewOutput(&out, io.Discard, false),
		cfg: cfg,
		server: studioctlServerAccess{
			client: &fakeStudioctlServerClient{
				status: &studioctlserver.Status{
					Apps: []studioctlserver.DiscoveredApp{
						{
							ProcessID: &processID,
							AppID:     testAppID,
							BaseURL:   "http://127.0.0.1:5005",
							Name:      "Altinn.Application.dll",
						},
					},
				},
			},
		},
	}

	if err := command.run(
		t.Context(),
		[]string{"--id", "123", "--follow=false", "--json"},
	); err != nil {
		t.Fatalf("run() error = %v", err)
	}

	var got appLogLine
	if err := json.Unmarshal([]byte(strings.TrimSpace(out.String())), &got); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if got.AppID != testAppID || got.ID != "123" || got.Mode != runModeProcess || got.Line != "one" {
		t.Fatalf("output = %+v, want process log metadata", got)
	}
}

func TestAppLogsReturnsUnavailableForManualProcess(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	processID := 123
	command := &appLogsCommand{
		out: ioDiscardOutput(),
		cfg: cfg,
		server: studioctlServerAccess{
			client: &fakeStudioctlServerClient{
				status: &studioctlserver.Status{
					Apps: []studioctlserver.DiscoveredApp{
						{
							ProcessID: &processID,
							AppID:     testAppID,
							BaseURL:   "http://127.0.0.1:5005",
						},
					},
				},
			},
		},
	}

	err := command.run(t.Context(), []string{"--id", "123", "--follow=false"})
	if !errors.Is(err, errAppLogsUnavailable) {
		t.Fatalf("run() error = %v, want errAppLogsUnavailable", err)
	}
	if !strings.Contains(err.Error(), "run") {
		t.Fatalf("run() error = %v, want run hint", err)
	}
}

func TestAppLogsStreamsContainerLogs(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	const containerID = "1234567890abcdef"
	var gotName string
	var gotFollow bool
	var gotTail string
	client := containermock.New()
	client.ContainerLogsFunc = func(_ context.Context, nameOrID string, follow bool, tail string) (io.ReadCloser, error) {
		gotName = nameOrID
		gotFollow = follow
		gotTail = tail
		return io.NopCloser(strings.NewReader("container line\n")), nil
	}

	var out bytes.Buffer
	command := &appLogsCommand{
		out: ui.NewOutput(&out, io.Discard, false),
		cfg: cfg,
		server: studioctlServerAccess{
			client: &fakeStudioctlServerClient{
				status: &studioctlserver.Status{
					Apps: []studioctlserver.DiscoveredApp{
						{
							ContainerID: containerID,
							AppID:       testAppID,
							BaseURL:     "http://127.0.0.1:5005",
							Name:        "app-container",
						},
					},
				},
			},
		},
		containerClient: func(context.Context) (containerruntime.ContainerClient, error) {
			return client, nil
		},
	}

	if err := command.run(
		t.Context(),
		[]string{"--id", containerID[:12], "--tail", appLogsTailAllValue, "--follow=false"},
	); err != nil {
		t.Fatalf("run() error = %v", err)
	}
	if gotName != containerID || gotFollow || gotTail != appLogsTailAllValue {
		t.Fatalf("ContainerLogs args = %q %v %q, want container id, false, all", gotName, gotFollow, gotTail)
	}
	if out.String() != "container line"+osutil.LineBreak {
		t.Fatalf("output = %q, want container log line", out.String())
	}
}

func TestAppLogsStoredLatestFileWithoutRunningApp(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	logDir := cfg.AppLogDir(appsupport.SanitizeAppID(testAppID))
	oldPath := writeAppLog(t, logDir, "2026-04-19-1.log", "old\n")
	newPath := writeAppLog(t, logDir, "2026-04-20-1.log", "new\n")
	setAppLogModTime(t, oldPath, time.Date(2026, 4, 19, 1, 0, 0, 0, time.UTC))
	setAppLogModTime(t, newPath, time.Date(2026, 4, 20, 1, 0, 0, 0, time.UTC))

	var out bytes.Buffer
	command := &appLogsCommand{
		out: ui.NewOutput(&out, io.Discard, false),
		cfg: cfg,
	}

	if err := command.streamStoredAppLog(t.Context(), testAppID, appLogsFlags{tail: 100, follow: false}); err != nil {
		t.Fatalf("streamStoredAppLog() error = %v", err)
	}
	if out.String() != "new"+osutil.LineBreak {
		t.Fatalf("output = %q, want latest stored log", out.String())
	}
}

func TestAppLogsSelectedMissingFileReturnsNotFound(t *testing.T) {
	t.Parallel()

	command := &appLogsCommand{
		out: ioDiscardOutput(),
		cfg: testConfig(t),
	}

	err := command.streamLogFile(t.Context(), appLogLine{AppID: testAppID}, "/does/not/exist.log", appLogsFlags{
		tail:   1,
		follow: true,
	})
	if !errors.Is(err, errAppLogsNotFound) {
		t.Fatalf("streamLogFile() error = %v, want errAppLogsNotFound", err)
	}
}

func TestAppLogsStoredIDUsesCurrentAppDirectory(t *testing.T) {
	cfg := testConfig(t)
	appRoot := t.TempDir()
	writeTestAppMetadata(t, appRoot, testAppID)
	t.Chdir(appRoot)

	const processID = 123
	logDir := cfg.AppLogDir(appsupport.SanitizeAppID(testAppID))
	logPath := writeAppLog(t, logDir, "2026-04-20-1.log", "one\ntwo\nthree\n")
	writeAppLogMetadata(t, logPath, appsupport.RunMetadata{
		StartedAt: time.Now().UTC(),
		AppID:     testAppID,
		Mode:      runModeProcess,
		ID:        "123",
		LogPath:   logPath,
		ProcessID: processID,
	})

	var out bytes.Buffer
	command := &appLogsCommand{
		out:     ui.NewOutput(&out, io.Discard, false),
		cfg:     cfg,
		service: appsvc.NewService(&config.Config{Version: config.NewVersion("test-version")}),
		server: studioctlServerAccess{
			client: &fakeStudioctlServerClient{status: &studioctlserver.Status{}},
		},
	}

	if err := command.run(
		t.Context(),
		[]string{"--id", "123", "--tail", appLogsTailAllValue, "--follow=false"},
	); err != nil {
		t.Fatalf("run() error = %v", err)
	}
	want := "one" + osutil.LineBreak + "two" + osutil.LineBreak + "three" + osutil.LineBreak
	if out.String() != want {
		t.Fatalf("output = %q, want all stored lines", out.String())
	}
}

func TestAppLogsTailAllRequiresScope(t *testing.T) {
	t.Parallel()

	command := &appLogsCommand{
		out: ioDiscardOutput(),
		cfg: testConfig(t),
	}

	err := command.run(t.Context(), []string{"--tail", appLogsTailAllValue, "--follow=false"})
	if !errors.Is(err, ErrInvalidFlagValue) {
		t.Fatalf("run() error = %v, want ErrInvalidFlagValue", err)
	}
}

func TestAppLogsContainerReaderIgnoresCanceledContextError(t *testing.T) {
	t.Parallel()

	ctx, cancel := context.WithCancel(t.Context())
	cancel()

	command := &appLogsCommand{out: ioDiscardOutput()}
	err := command.streamContainerLogReader(ctx, errReader{err: context.Canceled}, appLogLine{
		AppID:   testAppID,
		Mode:    runModeContainer,
		ID:      "container-id",
		Name:    "container-name",
		LogPath: "",
		Line:    "",
		Port:    5005,
		JSON:    false,
	})
	if err != nil {
		t.Fatalf("streamContainerLogReader() error = %v, want nil", err)
	}
}

func writeAppLog(t *testing.T, dir string, name string, content string) string {
	t.Helper()

	if err := os.MkdirAll(dir, osutil.DirPermOwnerOnly); err != nil {
		t.Fatalf("create app log dir: %v", err)
	}
	path := filepath.Join(dir, name)
	if err := os.WriteFile(path, []byte(content), osutil.FilePermOwnerOnly); err != nil {
		t.Fatalf("write app log: %v", err)
	}
	return path
}

func writeAppLogMetadata(t *testing.T, logPath string, metadata appsupport.RunMetadata) {
	t.Helper()

	if err := appsupport.WriteRunMetadata(logPath, metadata); err != nil {
		t.Fatalf("write app log metadata: %v", err)
	}
}

func writeTestAppMetadata(t *testing.T, appPath string, appID string) {
	t.Helper()

	configDir := filepath.Join(appPath, "App", "config")
	if err := os.MkdirAll(configDir, osutil.DirPermOwnerOnly); err != nil {
		t.Fatalf("create app config dir: %v", err)
	}
	content := []byte(`{"id":"` + appID + `"}`)
	if err := os.WriteFile(
		filepath.Join(configDir, "applicationmetadata.json"),
		content,
		osutil.FilePermOwnerOnly,
	); err != nil {
		t.Fatalf("write app metadata: %v", err)
	}
}

func setAppLogModTime(t *testing.T, path string, modTime time.Time) {
	t.Helper()

	if err := os.Chtimes(path, modTime, modTime); err != nil {
		t.Fatalf("chtimes %q: %v", path, err)
	}
}

func ioDiscardOutput() *ui.Output {
	return ui.NewOutput(io.Discard, io.Discard, false)
}

type errReader struct {
	err error
}

func (r errReader) Read([]byte) (int, error) {
	return 0, r.err
}
