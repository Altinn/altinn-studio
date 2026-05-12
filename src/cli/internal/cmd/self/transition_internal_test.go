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
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/studioctlserver"
	"altinn.studio/studioctl/internal/ui"
)

var errReplacementTestRuntimeUnavailable = errors.New("container runtime unavailable")
var errSelfTransitionTestStatus = errors.New("status failed")
var errSelfTransitionStopFailed = errors.New("stop failed")
var errMigrationFailed = errors.New("migration failed")

const selfTransitionTestAppID = "ttd/app"

func TestSelfTransitionPrepareStopsAppsBeforeLocaltestAndStudioctlServer(t *testing.T) {
	t.Parallel()

	cfg := selfTransitionTestConfig(t)
	processID := 123
	var order []string
	client := &fakeSelfTransitionStudioctlServerClient{
		status: &studioctlserver.Status{
			StudioctlPath: "/old/studioctl",
			Apps: []studioctlserver.DiscoveredApp{
				{
					ProcessID: &processID,
					AppID:     selfTransitionTestAppID,
					BaseURL:   "http://localhost:5005",
				},
			},
		},
	}
	transition := &Transition{
		cfg:          cfg,
		out:          ui.NewOutput(&bytes.Buffer{}, io.Discard, true),
		serverClient: client,
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
			order = append(order, "studioctl-server")
			done := make(chan error, 1)
			done <- nil
			return done, nil
		},
	}

	state, err := transition.Prepare(t.Context())
	if err != nil {
		t.Fatalf("Prepare() error = %v", err)
	}

	wantOrder := []string{"apps", "localtest", "studioctl-server"}
	if !reflect.DeepEqual(order, wantOrder) {
		t.Fatalf("order = %+v, want %+v", order, wantOrder)
	}
	if !state.studioctlServerWasRunning || state.previousStudioctlPath != "/old/studioctl" {
		t.Fatalf("state = %+v, want running studioctl-server with previous studioctl path", state)
	}
	if len(client.unregistered) != 1 || client.unregistered[0] != selfTransitionTestAppID {
		t.Fatalf("unregistered = %+v, want %s", client.unregistered, selfTransitionTestAppID)
	}
}

func TestSelfTransitionStatusFailureFails(t *testing.T) {
	t.Parallel()

	cfg := selfTransitionTestConfig(t)
	transition := &Transition{
		cfg: cfg,
		out: ui.NewOutput(&bytes.Buffer{}, io.Discard, true),
		serverClient: &fakeSelfTransitionStudioctlServerClient{
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
			cfg: selfTransitionTestConfig(t),
			out: ui.NewOutput(&bytes.Buffer{}, io.Discard, true),
			serverClient: &fakeSelfTransitionStudioctlServerClient{
				status: &studioctlserver.Status{
					StudioctlPath: "/old/studioctl",
					Apps: []studioctlserver.DiscoveredApp{
						{
							ProcessID: &processID,
							AppID:     selfTransitionTestAppID,
							BaseURL:   "http://localhost:5005",
						},
					},
				},
			},
			containerClient: func(context.Context) (containerruntime.ContainerClient, error) {
				return nil, errReplacementTestRuntimeUnavailable
			},
			stopProcess: func(context.Context, int) error {
				return errSelfTransitionStopFailed
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
		errSelfTransitionStopFailed,
	) {
		t.Fatalf("Prepare() required app stop error = %v, want stop error", err)
	}
}

func TestSelfTransitionRunsMigrations(t *testing.T) {
	t.Parallel()

	cfg := selfTransitionTestConfig(t)
	var order []string
	transition := &Transition{
		cfg: cfg,
		out: ui.NewOutput(&bytes.Buffer{}, io.Discard, true),
		runMigrations: func(context.Context, *config.Config) error {
			order = append(order, "migrations")
			return nil
		},
	}

	if err := transition.RunMigrations(t.Context()); err != nil {
		t.Fatalf("RunMigrations() error = %v", err)
	}

	wantOrder := []string{"migrations"}
	if !reflect.DeepEqual(order, wantOrder) {
		t.Fatalf("order = %+v, want %+v", order, wantOrder)
	}
}

func TestSelfTransitionResetEnvsRemovesLocaltestData(t *testing.T) {
	t.Parallel()

	cfg := selfTransitionTestConfig(t)
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

func TestSelfTransitionMigrationFailureReturnsError(t *testing.T) {
	t.Parallel()

	cfg := selfTransitionTestConfig(t)
	transition := &Transition{
		cfg: cfg,
		out: ui.NewOutput(&bytes.Buffer{}, io.Discard, true),
		runMigrations: func(context.Context, *config.Config) error {
			return errMigrationFailed
		},
	}

	err := transition.RunMigrations(t.Context())
	if !errors.Is(err, errMigrationFailed) {
		t.Fatalf("RunMigrations() error = %v, want migration failure", err)
	}
}

func TestSelfTransitionRestoreUsesPreviousStudioctlPath(t *testing.T) {
	t.Parallel()

	cfg := selfTransitionTestConfig(t)
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
		TransitionState{studioctlServerWasRunning: true, previousStudioctlPath: "/old/studioctl"},
		"",
	)

	if restartedPath != "/old/studioctl" {
		t.Fatalf("restartedPath = %q, want previous path", restartedPath)
	}
}

type fakeSelfTransitionStudioctlServerClient struct {
	status       *studioctlserver.Status
	statusErr    error
	unregistered []string
}

func (f *fakeSelfTransitionStudioctlServerClient) Status(context.Context) (*studioctlserver.Status, error) {
	return f.status, f.statusErr
}

func (f *fakeSelfTransitionStudioctlServerClient) UnregisterApp(_ context.Context, appID string) error {
	f.unregistered = append(f.unregistered, appID)
	return nil
}

func (f *fakeSelfTransitionStudioctlServerClient) UpgradeApp(
	context.Context,
	studioctlserver.AppUpgrade,
) (studioctlserver.AppUpgradeResult, error) {
	return studioctlserver.AppUpgradeResult{}, nil
}

func selfTransitionTestConfig(t *testing.T) *config.Config {
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
