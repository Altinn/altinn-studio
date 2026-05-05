package self

import (
	"bytes"
	"context"
	"errors"
	"io"
	"os"
	"path/filepath"
	"reflect"
	"testing"

	containerruntime "altinn.studio/devenv/pkg/container"
	containermock "altinn.studio/devenv/pkg/container/mock"
	"altinn.studio/studioctl/internal/appmanager"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/ui"
)

var errReplacementTestRuntimeUnavailable = errors.New("container runtime unavailable")
var errSelfTransitionTestStatus = errors.New("status failed")
var errStopFailed = errors.New("stop failed")
var errMigrationFailed = errors.New("migration failed")

const testAppID = "ttd/app"

func TestSelfTransitionPrepareStopsAppsBeforeLocaltestAndAppManager(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	processID := 123
	var order []string
	client := &fakeAppRuntimeClient{
		status: &appmanager.Status{
			StudioctlPath: "/old/studioctl",
			Apps: []appmanager.DiscoveredApp{
				{
					ProcessID: &processID,
					AppID:     testAppID,
					BaseURL:   "http://localhost:5005",
				},
			},
		},
	}
	transition := &Transition{
		cfg:       cfg,
		out:       ui.NewOutput(&bytes.Buffer{}, io.Discard, true),
		appClient: client,
		containerClient: func(context.Context) (containerruntime.ContainerClient, error) {
			order = append(order, "localtest")
			return nil, errReplacementTestRuntimeUnavailable
		},
		stopProcess: func(_ context.Context, pid int) error {
			if pid != processID {
				t.Fatalf("pid = %d, want %d", pid, processID)
			}
			order = append(order, "apps")
			return nil
		},
		shutdown: func(context.Context, *config.Config) (<-chan error, error) {
			order = append(order, "app-manager")
			done := make(chan error, 1)
			done <- nil
			return done, nil
		},
	}

	state, err := transition.Prepare(t.Context())
	if err != nil {
		t.Fatalf("Prepare() error = %v", err)
	}

	wantOrder := []string{"apps", "localtest", "app-manager"}
	if !reflect.DeepEqual(order, wantOrder) {
		t.Fatalf("order = %+v, want %+v", order, wantOrder)
	}
	if !state.appManagerWasRunning || state.previousStudioctlPath != "/old/studioctl" {
		t.Fatalf("state = %+v, want running app-manager with previous studioctl path", state)
	}
	if len(client.unregistered) != 1 || client.unregistered[0] != testAppID {
		t.Fatalf("unregistered = %+v, want %s", client.unregistered, testAppID)
	}
}

func TestSelfTransitionStatusFailureFails(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	transition := &Transition{
		cfg: cfg,
		out: ui.NewOutput(&bytes.Buffer{}, io.Discard, true),
		appClient: &fakeAppRuntimeClient{
			statusErr: errSelfTransitionTestStatus,
		},
		containerClient: func(context.Context) (containerruntime.ContainerClient, error) {
			return nil, errReplacementTestRuntimeUnavailable
		},
		shutdown: func(context.Context, *config.Config) (<-chan error, error) {
			done := make(chan error, 1)
			done <- nil
			return done, nil
		},
	}

	if _, err := transition.Prepare(t.Context()); !errors.Is(
		err,
		errSelfTransitionTestStatus,
	) {
		t.Fatalf("Prepare() app status error = %v, want status error", err)
	}
}

func TestSelfTransitionAppStopFailureFails(t *testing.T) {
	t.Parallel()

	processID := 123
	newTransition := func() *Transition {
		return &Transition{
			cfg: testConfig(t),
			out: ui.NewOutput(&bytes.Buffer{}, io.Discard, true),
			appClient: &fakeAppRuntimeClient{
				status: &appmanager.Status{
					StudioctlPath: "/old/studioctl",
					Apps: []appmanager.DiscoveredApp{
						{
							ProcessID: &processID,
							AppID:     testAppID,
							BaseURL:   "http://localhost:5005",
						},
					},
				},
			},
			containerClient: func(context.Context) (containerruntime.ContainerClient, error) {
				return nil, errReplacementTestRuntimeUnavailable
			},
			stopProcess: func(context.Context, int) error {
				return errStopFailed
			},
			shutdown: func(context.Context, *config.Config) (<-chan error, error) {
				done := make(chan error, 1)
				done <- nil
				return done, nil
			},
		}
	}

	if _, err := newTransition().Prepare(t.Context()); !errors.Is(
		err,
		errStopFailed,
	) {
		t.Fatalf("Prepare() required app stop error = %v, want stop error", err)
	}
}

func TestSelfTransitionRunsMigrationsBeforeRestart(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	var order []string
	var restartedPath string
	transition := &Transition{
		cfg: cfg,
		out: ui.NewOutput(&bytes.Buffer{}, io.Discard, true),
		runMigrations: func(context.Context, *config.Config) error {
			order = append(order, "migrations")
			return nil
		},
		start: func(_ context.Context, _ *config.Config, _ string, studioctlPath string) error {
			order = append(order, "app-manager")
			restartedPath = studioctlPath
			return nil
		},
	}

	if err := transition.RunMigrations(t.Context()); err != nil {
		t.Fatalf("RunMigrations() error = %v", err)
	}
	if err := transition.RestartIfNeeded(
		t.Context(),
		TransitionState{appManagerWasRunning: true, previousStudioctlPath: "/old/studioctl"},
		"/new/studioctl",
	); err != nil {
		t.Fatalf("RestartIfNeeded() error = %v", err)
	}

	wantOrder := []string{"migrations", "app-manager"}
	if !reflect.DeepEqual(order, wantOrder) {
		t.Fatalf("order = %+v, want %+v", order, wantOrder)
	}
	if restartedPath != "/new/studioctl" {
		t.Fatalf("restartedPath = %q, want new path", restartedPath)
	}
}

func TestSelfTransitionResetEnvsRemovesLocaltestData(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	localtestDataDir := filepath.Join(cfg.DataDir, "AltinnPlatformLocal")
	if err := os.MkdirAll(localtestDataDir, 0o755); err != nil {
		t.Fatalf("create localtest data dir: %v", err)
	}

	client := containermock.New()
	transition := &Transition{
		cfg: cfg,
		out: ui.NewOutput(&bytes.Buffer{}, io.Discard, true),
		containerClient: func(context.Context) (containerruntime.ContainerClient, error) {
			return client, nil
		},
	}

	if err := transition.ResetEnvs(t.Context()); err != nil {
		t.Fatalf("ResetEnvs() error = %v", err)
	}

	if _, err := os.Stat(localtestDataDir); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("localtest data still exists after ResetEnvs(): %v", err)
	}
	assertSelfTransitionCallRecorded(t, client.Calls, "VolumeRemove")
}

func TestSelfTransitionMigrationFailureDoesNotRestart(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	var restarted bool
	transition := &Transition{
		cfg: cfg,
		out: ui.NewOutput(&bytes.Buffer{}, io.Discard, true),
		runMigrations: func(context.Context, *config.Config) error {
			return errMigrationFailed
		},
		start: func(context.Context, *config.Config, string, string) error {
			restarted = true
			return nil
		},
	}

	err := transition.RunMigrations(t.Context())
	if !errors.Is(err, errMigrationFailed) {
		t.Fatalf("RunMigrations() error = %v, want migration failure", err)
	}
	if restarted {
		t.Fatal("app-manager restarted after migration failure")
	}
}

func TestSelfTransitionRestoreUsesPreviousStudioctlPath(t *testing.T) {
	t.Parallel()

	cfg := testConfig(t)
	var restartedPath string
	transition := &Transition{
		cfg: cfg,
		out: ui.NewOutput(&bytes.Buffer{}, io.Discard, true),
		start: func(_ context.Context, _ *config.Config, _ string, studioctlPath string) error {
			restartedPath = studioctlPath
			return nil
		},
	}

	transition.Restore(
		t.Context(),
		TransitionState{appManagerWasRunning: true, previousStudioctlPath: "/old/studioctl"},
		"",
	)

	if restartedPath != "/old/studioctl" {
		t.Fatalf("restartedPath = %q, want previous path", restartedPath)
	}
}

type fakeAppRuntimeClient struct {
	status       *appmanager.Status
	statusErr    error
	unregistered []string
}

func (f *fakeAppRuntimeClient) Status(context.Context) (*appmanager.Status, error) {
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

func assertSelfTransitionCallRecorded(t *testing.T, calls []containermock.Call, method string) {
	t.Helper()
	for _, call := range calls {
		if call.Method == method {
			return
		}
	}
	t.Fatalf("%s not recorded in calls: %+v", method, calls)
}
