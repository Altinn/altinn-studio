package cmd

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"strings"
	"testing"

	containerruntime "altinn.studio/devenv/pkg/container"
	containermock "altinn.studio/devenv/pkg/container/mock"
	"altinn.studio/studioctl/internal/appmanager"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/ui"
)

const testAppID = "ttd/app"

var errStopFailed = errors.New("stop failed")

func TestAppPsJSONListsApps(t *testing.T) {
	t.Parallel()

	processID := 123
	var out bytes.Buffer
	command := &AppPsCommand{
		out: ui.NewOutput(&out, io.Discard, false),
		manager: appManagerAccess{
			client: &fakeAppRuntimeClient{
				status: &appmanager.Status{
					Apps: []appmanager.DiscoveredApp{
						{
							ProcessID:   &processID,
							AppID:       testAppID,
							BaseURL:     "http://localhost:5005",
							Source:      "studioctl",
							Description: "test app",
						},
					},
				},
			},
		},
	}

	if err := command.RunWithCommandPath(t.Context(), []string{"--json"}, "app ps"); err != nil {
		t.Fatalf("RunWithCommandPath() error = %v", err)
	}

	var got appPsOutput
	if err := json.Unmarshal([]byte(strings.TrimSpace(out.String())), &got); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if !got.Running || len(got.Apps) != 1 || got.Apps[0].AppID != testAppID {
		t.Fatalf("output = %+v, want one running app", got)
	}
}

func TestAppPsTableUsesProcessModeAndRuntimeID(t *testing.T) {
	t.Parallel()

	processID := 123
	var out bytes.Buffer
	command := &AppPsCommand{
		out: ui.NewOutput(&out, io.Discard, false),
		manager: appManagerAccess{
			client: &fakeAppRuntimeClient{
				status: &appmanager.Status{
					Apps: []appmanager.DiscoveredApp{
						{
							ProcessID: &processID,
							AppID:     testAppID,
							BaseURL:   "http://localhost:5005",
							Name:      "Altinn.Application.dll",
						},
					},
				},
			},
		},
	}

	if err := command.RunWithCommandPath(t.Context(), nil, "app ps"); err != nil {
		t.Fatalf("RunWithCommandPath() error = %v", err)
	}

	output := out.String()
	for _, want := range []string{"APP ID", "MODE", "ID", "NAME", "process", "123", "Altinn.Application.dll"} {
		if !strings.Contains(output, want) {
			t.Fatalf("output = %q, want %q", output, want)
		}
	}
	if strings.Contains(output, "PID") {
		t.Fatalf("output = %q, did not want PID header", output)
	}
}

func TestAppPsTableShortensContainerID(t *testing.T) {
	t.Parallel()

	const containerID = "1234567890abcdef"
	var out bytes.Buffer
	command := &AppPsCommand{
		out: ui.NewOutput(&out, io.Discard, false),
		manager: appManagerAccess{
			client: &fakeAppRuntimeClient{
				status: &appmanager.Status{
					Apps: []appmanager.DiscoveredApp{
						{
							ContainerID: containerID,
							AppID:       testAppID,
							BaseURL:     "http://localhost:5005",
							Name:        "container-name",
						},
					},
				},
			},
		},
	}

	if err := command.RunWithCommandPath(t.Context(), nil, "app ps"); err != nil {
		t.Fatalf("RunWithCommandPath() error = %v", err)
	}

	output := out.String()
	if !strings.Contains(output, containerID[:shortContainerIDLength]) {
		t.Fatalf("output = %q, want short container id", output)
	}
	if strings.Contains(output, containerID) {
		t.Fatalf("output = %q, did not want full container id", output)
	}
}

func TestAppPsStartsAppManagerBeforeStatus(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	var out bytes.Buffer
	var started bool
	command := &AppPsCommand{
		out: ui.NewOutput(&out, io.Discard, false),
		manager: appManagerAccess{
			cfg: cfg,
			client: &fakeAppRuntimeClient{
				statusErrs: []error{appmanager.ErrNotRunning, nil},
				status:     &appmanager.Status{},
			},
			ensureStarted: func(context.Context, *config.Config, string) error {
				started = true
				return nil
			},
		},
	}

	if err := command.RunWithCommandPath(t.Context(), []string{"--json"}, "app ps"); err != nil {
		t.Fatalf("RunWithCommandPath() error = %v", err)
	}
	if !started {
		t.Fatal("ensureStarted was not called")
	}
}

func TestAppPsReconcilesRunningAppManager(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	var out bytes.Buffer
	var started bool
	command := &AppPsCommand{
		out: ui.NewOutput(&out, io.Discard, false),
		manager: appManagerAccess{
			cfg:    cfg,
			client: &fakeAppRuntimeClient{status: &appmanager.Status{}},
			ensureStarted: func(context.Context, *config.Config, string) error {
				started = true
				return nil
			},
		},
	}

	if err := command.RunWithCommandPath(t.Context(), []string{"--json"}, "app ps"); err != nil {
		t.Fatalf("RunWithCommandPath() error = %v", err)
	}
	if !started {
		t.Fatal("ensureStarted was not called")
	}
}

func TestAppStopJSONStopsNativeAppsWithProcessID(t *testing.T) {
	t.Parallel()

	processID := 123
	var stoppedPID int
	var out bytes.Buffer
	client := &fakeAppRuntimeClient{
		status: &appmanager.Status{
			Apps: []appmanager.DiscoveredApp{
				{
					ProcessID: &processID,
					AppID:     testAppID,
					BaseURL:   "http://localhost:5005",
				},
				{
					AppID:   "ttd/no-handle",
					BaseURL: "http://localhost:5006",
				},
			},
		},
	}
	command := &StopCommand{
		out: ui.NewOutput(&out, io.Discard, false),
		manager: appManagerAccess{
			client: client,
		},
		stopProcess: func(_ context.Context, pid int) error {
			stoppedPID = pid
			return nil
		},
	}

	if err := command.RunWithCommandPath(t.Context(), []string{"--all", "--json"}, "app stop"); err != nil {
		t.Fatalf("RunWithCommandPath() error = %v", err)
	}

	var got appStopOutput
	if err := json.Unmarshal([]byte(strings.TrimSpace(out.String())), &got); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if stoppedPID != processID {
		t.Fatalf("stopped pid = %d, want %d", stoppedPID, processID)
	}
	if len(got.Stopped) != 1 || got.Stopped[0].AppID != testAppID {
		t.Fatalf("stopped = %+v, want one app", got.Stopped)
	}
	if got.Stopped[0].Mode != runModeProcess || got.Stopped[0].ProcessID != processID {
		t.Fatalf("stopped = %+v, want process mode and pid %d", got.Stopped[0], processID)
	}
	if len(client.unregistered) != 1 || client.unregistered[0] != testAppID {
		t.Fatalf("unregistered = %+v, want %s", client.unregistered, testAppID)
	}
}

func TestAppStopContinuesAfterStopError(t *testing.T) {
	t.Parallel()

	firstProcessID := 123
	secondProcessID := 456
	var stoppedPIDs []int
	var out bytes.Buffer
	client := &fakeAppRuntimeClient{
		status: &appmanager.Status{
			Apps: []appmanager.DiscoveredApp{
				{
					ProcessID: &firstProcessID,
					AppID:     "ttd/fails",
					BaseURL:   "http://localhost:5005",
				},
				{
					ProcessID: &secondProcessID,
					AppID:     "ttd/stops",
					BaseURL:   "http://localhost:5006",
				},
			},
		},
	}
	command := &StopCommand{
		out: ui.NewOutput(&out, io.Discard, false),
		manager: appManagerAccess{
			client: client,
		},
		stopProcess: func(_ context.Context, pid int) error {
			stoppedPIDs = append(stoppedPIDs, pid)
			if pid == firstProcessID {
				return errStopFailed
			}
			return nil
		},
	}

	err := command.RunWithCommandPath(t.Context(), []string{"--all", "--json"}, "app stop")
	if err == nil || !strings.Contains(err.Error(), "ttd/fails") {
		t.Fatalf("RunWithCommandPath() error = %v, want failed app id", err)
	}

	var got appStopOutput
	if jsonErr := json.Unmarshal([]byte(strings.TrimSpace(out.String())), &got); jsonErr != nil {
		t.Fatalf("json.Unmarshal() error = %v", jsonErr)
	}
	if len(stoppedPIDs) != 2 {
		t.Fatalf("stopped pids = %+v, want both apps attempted", stoppedPIDs)
	}
	if len(got.Stopped) != 1 || got.Stopped[0].AppID != "ttd/stops" {
		t.Fatalf("stopped = %+v, want successful app output", got.Stopped)
	}
	if len(client.unregistered) != 1 || client.unregistered[0] != "ttd/stops" {
		t.Fatalf("unregistered = %+v, want successful app only", client.unregistered)
	}
}

func TestAppStopJSONStopsManagedContainerApps(t *testing.T) {
	t.Parallel()

	var out bytes.Buffer
	runtime := containermock.New()
	command := &StopCommand{
		out: ui.NewOutput(&out, io.Discard, false),
		manager: appManagerAccess{
			client: &fakeAppRuntimeClient{
				status: &appmanager.Status{
					Apps: []appmanager.DiscoveredApp{
						{
							AppID:       testAppID,
							BaseURL:     "http://localhost:5005",
							ContainerID: "container-id",
							Name:        "container-name",
						},
					},
				},
			},
		},
		containerClient: func(context.Context) (containerruntime.ContainerClient, error) {
			return runtime, nil
		},
	}

	if err := command.RunWithCommandPath(t.Context(), []string{"--all", "--json"}, "app stop"); err != nil {
		t.Fatalf("RunWithCommandPath() error = %v", err)
	}

	if len(runtime.Calls) < 2 {
		t.Fatalf("container calls = %+v, want stop and remove", runtime.Calls)
	}
	if runtime.Calls[0].Method != "ContainerStop" || runtime.Calls[1].Method != "ContainerRemove" {
		t.Fatalf("container calls = %+v, want stop then remove", runtime.Calls)
	}
}

type fakeAppRuntimeClient struct {
	status       *appmanager.Status
	statusErr    error
	statusErrs   []error
	unregistered []string
}

func (f *fakeAppRuntimeClient) Status(context.Context) (*appmanager.Status, error) {
	if len(f.statusErrs) > 0 {
		err := f.statusErrs[0]
		f.statusErrs = f.statusErrs[1:]
		return f.status, err
	}
	return f.status, f.statusErr
}

func (f *fakeAppRuntimeClient) UnregisterApp(_ context.Context, appID string) error {
	f.unregistered = append(f.unregistered, appID)
	return nil
}

func testConfig(t *testing.T) *config.Config {
	t.Helper()

	cfg, err := config.New(config.Flags{Home: t.TempDir(), SocketDir: "", Verbose: false}, "test-version")
	if err != nil {
		t.Fatalf("config.New() error = %v", err)
	}
	return cfg
}
