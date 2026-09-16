package localtest_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/devenv/pkg/container/mock"
	"altinn.studio/devenv/pkg/container/types"
	containerbackend "altinn.studio/devenv/pkg/resource/executor/container"
	envtypes "altinn.studio/studioctl/internal/cmd/env"
	"altinn.studio/studioctl/internal/cmd/env/localtest"
	"altinn.studio/studioctl/internal/cmd/env/localtest/components"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/ui"
)

var errStateUnavailable = errors.New("state unavailable")

// testLocaltestImageRef is the localtest reference in testImages.
const testLocaltestImageRef = "ghcr.io/altinn/test-localtest:latest"

func TestStatus_RunningRequiresAllCoreContainers(t *testing.T) {
	t.Parallel()

	tests := map[string]struct {
		states         map[string]types.ContainerState
		wantRunning    bool
		wantAnyRunning bool
	}{
		"all core containers running": {
			states: map[string]types.ContainerState{
				components.ContainerLocaltest:        {Status: "running", Running: true},
				components.ContainerPDF3:             {Status: "running", Running: true},
				components.ContainerWorkflowEngineDb: {Status: "running", Running: true},
				components.ContainerWorkflowEngine:   {Status: "running", Running: true},
			},
			wantRunning:    true,
			wantAnyRunning: true,
		},
		"optional pgadmin stale": {
			states: map[string]types.ContainerState{
				components.ContainerLocaltest:        {Status: "running", Running: true},
				components.ContainerPDF3:             {Status: "running", Running: true},
				components.ContainerWorkflowEngineDb: {Status: "running", Running: true},
				components.ContainerWorkflowEngine:   {Status: "running", Running: true},
				components.ContainerPgAdmin:          {Status: "exited", Running: false},
			},
			wantRunning:    false,
			wantAnyRunning: true,
		},
		"one running one exited": {
			states: map[string]types.ContainerState{
				components.ContainerLocaltest:        {Status: "running", Running: true},
				components.ContainerPDF3:             {Status: "exited", Running: false},
				components.ContainerWorkflowEngineDb: {Status: "running", Running: true},
				components.ContainerWorkflowEngine:   {Status: "running", Running: true},
			},
			wantRunning:    false,
			wantAnyRunning: true,
		},
		"one running one missing": {
			states: map[string]types.ContainerState{
				components.ContainerLocaltest: {Status: "running", Running: true},
			},
			wantRunning:    false,
			wantAnyRunning: true,
		},
		"none running": {
			states:         map[string]types.ContainerState{},
			wantRunning:    false,
			wantAnyRunning: false,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			t.Parallel()

			client := mock.New()
			client.ContainerInspectFunc = func(_ context.Context, nameOrID string) (types.ContainerInfo, error) {
				state, ok := tt.states[nameOrID]
				if !ok {
					return types.ContainerInfo{}, types.ErrContainerNotFound
				}
				return managedContainerInfo(state), nil
			}

			env := newTestEnv(client)
			status, err := env.Status(context.Background())
			if err != nil {
				t.Fatalf("Status() error = %v", err)
			}
			if status.Running != tt.wantRunning {
				t.Fatalf("Status().Running = %v, want %v", status.Running, tt.wantRunning)
			}
			if status.AnyRunning != tt.wantAnyRunning {
				t.Fatalf("Status().AnyRunning = %v, want %v", status.AnyRunning, tt.wantAnyRunning)
			}
		})
	}
}

func TestStatus_ReturnsErrorForNonNotFoundStateError(t *testing.T) {
	t.Parallel()

	client := mock.New()
	client.ContainerInspectFunc = func(_ context.Context, nameOrID string) (types.ContainerInfo, error) {
		if nameOrID == components.ContainerPDF3 {
			return types.ContainerInfo{}, errStateUnavailable
		}
		return managedContainerInfo(types.ContainerState{Status: "running", Running: true}), nil
	}

	env := newTestEnv(client)
	_, err := env.Status(context.Background())
	if !errors.Is(err, errStateUnavailable) {
		t.Fatalf("Status() error = %v, want wrapped %v", err, errStateUnavailable)
	}
}

func TestStatus_HidesAbsentOptionalContainers(t *testing.T) {
	t.Parallel()

	coreState := types.ContainerState{Status: "running", Running: true}
	client := mock.New()
	client.ContainerInspectFunc = func(_ context.Context, nameOrID string) (types.ContainerInfo, error) {
		switch nameOrID {
		case components.ContainerLocaltest,
			components.ContainerPDF3,
			components.ContainerWorkflowEngineDb,
			components.ContainerWorkflowEngine:
			return managedContainerInfo(coreState), nil
		default:
			return types.ContainerInfo{}, types.ErrContainerNotFound
		}
	}

	env := newTestEnv(client)
	status, err := env.Status(context.Background())
	if err != nil {
		t.Fatalf("Status() error = %v", err)
	}
	assertContainerStatusAbsent(t, status, components.ContainerPgAdmin)
	assertContainerStatusAbsent(t, status, components.ContainerMonitoringGrafana)
}

func TestStatusForUp_IncludesPgAdminWhenRequested(t *testing.T) {
	t.Parallel()

	client := mock.New()
	client.ContainerInspectFunc = func(_ context.Context, nameOrID string) (types.ContainerInfo, error) {
		if nameOrID == components.ContainerPgAdmin {
			return types.ContainerInfo{}, types.ErrContainerNotFound
		}
		return managedContainerInfo(types.ContainerState{Status: "running", Running: true}), nil
	}

	env := newTestEnv(client)
	status, err := env.StatusForUp(context.Background(), envtypes.UpOptions{PgAdmin: true})
	if err != nil {
		t.Fatalf("StatusForUp() error = %v", err)
	}
	if status.Running {
		t.Fatal("StatusForUp().Running = true, want false when pgadmin is requested but missing")
	}
}

func TestStatusForUp_RequiresUnrequestedPgAdminDestroyed(t *testing.T) {
	t.Parallel()

	client := mock.New()
	client.ContainerInspectFunc = func(_ context.Context, _ string) (types.ContainerInfo, error) {
		return managedContainerInfo(types.ContainerState{Status: "running", Running: true}), nil
	}

	env := newTestEnv(client)
	status, err := env.StatusForUp(context.Background(), envtypes.UpOptions{})
	if err != nil {
		t.Fatalf("StatusForUp() error = %v", err)
	}
	if status.Running {
		t.Fatal("StatusForUp().Running = true, want false when unrequested pgadmin is running")
	}
}

func TestStatus_TreatsPresentOptionalContainerAsRunning(t *testing.T) {
	t.Parallel()

	client := mock.New()
	client.ContainerInspectFunc = func(_ context.Context, _ string) (types.ContainerInfo, error) {
		return managedContainerInfo(types.ContainerState{Status: "running", Running: true}), nil
	}

	env := newTestEnv(client)
	status, err := env.Status(context.Background())
	if err != nil {
		t.Fatalf("Status() error = %v", err)
	}
	if !status.Running {
		t.Fatal("Status().Running = false, want true when visible optional containers are running")
	}
	assertContainerStatus(t, status, components.ContainerPgAdmin, "running")
}

func TestStatusForUp_IncludesMonitoringWhenRequested(t *testing.T) {
	t.Parallel()

	coreState := types.ContainerState{Status: "running", Running: true}
	client := mock.New()
	client.ContainerInspectFunc = func(_ context.Context, nameOrID string) (types.ContainerInfo, error) {
		switch nameOrID {
		case components.ContainerLocaltest,
			components.ContainerPDF3,
			components.ContainerWorkflowEngineDb,
			components.ContainerWorkflowEngine:
			return managedContainerInfo(coreState), nil
		default:
			return types.ContainerInfo{}, types.ErrContainerNotFound
		}
	}

	env := newTestEnv(client)
	status, err := env.StatusForUp(context.Background(), envtypes.UpOptions{Monitoring: true})
	if err != nil {
		t.Fatalf("StatusForUp() error = %v", err)
	}
	if status.Running {
		t.Fatal("StatusForUp().Running = true, want false when monitoring is requested but missing")
	}
	assertContainerStatus(t, status, components.ContainerMonitoringGrafana, "not found")
}

func TestStatus_UsesDevWorkflowEngineFromEnvironmentTopology(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{
		DataDir: t.TempDir(),
		Images:  testImages(),
	}
	topology := envtopology.NewLocal(envtopology.DefaultIngressPortString())
	if err := topology.WriteBoundTopologyBaseConfig(
		cfg.BoundTopologyBaseConfigPath(),
		[]envtopology.RuntimeBinding{
			{
				ComponentID: envtopology.ComponentWorkflowEngine,
				Destination: envtopology.BoundTopologyDestination{
					Location: envtopology.DestinationLocationHost,
					Kind:     envtopology.DestinationKindHTTP,
					URL:      "http://127.0.0.1:9090",
				},
				Enabled: true,
			},
		},
	); err != nil {
		t.Fatalf("WriteBoundTopologyBaseConfig() error = %v", err)
	}

	client := mock.New()
	client.ContainerInspectFunc = func(_ context.Context, nameOrID string) (types.ContainerInfo, error) {
		switch nameOrID {
		case components.ContainerLocaltest,
			components.ContainerPDF3,
			components.ContainerWorkflowEngineDb:
			return managedContainerInfo(types.ContainerState{Status: "running", Running: true}), nil
		default:
			return types.ContainerInfo{}, types.ErrContainerNotFound
		}
	}

	env := newTestEnvWithConfig(client, cfg)
	status, err := env.Status(context.Background())
	if err != nil {
		t.Fatalf("Status() error = %v", err)
	}
	if !status.Running {
		t.Fatal("Status().Running = false, want true when workflow-engine is host-bound")
	}
	assertContainerStatusAbsent(t, status, components.ContainerWorkflowEngine)
	assertContainerStatusAbsent(t, status, components.ContainerMonitoringGrafana)
}

func TestStatus_IgnoresUnmanagedNameCollisions(t *testing.T) {
	t.Parallel()

	client := mock.New()
	client.ContainerInspectFunc = func(context.Context, string) (types.ContainerInfo, error) {
		return types.ContainerInfo{
			State:  types.ContainerState{Status: "running", Running: true},
			Labels: map[string]string{},
		}, nil
	}

	env := newTestEnv(client)
	status, err := env.Status(context.Background())
	if err != nil {
		t.Fatalf("Status() error = %v", err)
	}
	if status.Running {
		t.Fatal("Status().Running = true, want false")
	}
	if status.AnyRunning {
		t.Fatal("Status().AnyRunning = true, want false")
	}
}

func TestDown_IgnoresUnmanagedNameCollision(t *testing.T) {
	t.Parallel()

	client := mock.New()
	client.ContainerInspectFunc = func(_ context.Context, nameOrID string) (types.ContainerInfo, error) {
		if nameOrID != components.ContainerLocaltest {
			return types.ContainerInfo{}, types.ErrContainerNotFound
		}
		return types.ContainerInfo{
			State:  types.ContainerState{Status: "running", Running: true},
			Labels: map[string]string{},
		}, nil
	}
	client.ContainerRemoveFunc = func(context.Context, string, bool) error {
		t.Fatal("ContainerRemove called for unmanaged container")
		return nil
	}

	env := newTestEnv(client)
	err := env.Down(context.Background())
	if !errors.Is(err, envtypes.ErrAlreadyStopped) {
		t.Fatalf("Down() error = %v, want ErrAlreadyStopped", err)
	}
}

func TestDown_StopsStaleManagedResources(t *testing.T) {
	t.Parallel()

	client := mock.New()
	var removedContainer string
	client.ListContainersFunc = func(context.Context, types.ContainerListFilter) ([]types.ContainerInfo, error) {
		return []types.ContainerInfo{{
			ID:     "stale-container-id",
			Name:   "stale-container",
			Labels: map[string]string{containerbackend.GraphIDLabel: testGraphID},
		}}, nil
	}
	client.ContainerRemoveFunc = func(_ context.Context, nameOrID string, _ bool) error {
		removedContainer = nameOrID
		return nil
	}

	env := newTestEnv(client)
	if err := env.Down(context.Background()); err != nil {
		t.Fatalf("Down() error = %v", err)
	}
	if removedContainer != "stale-container-id" {
		t.Fatalf("removed container = %q, want stale-container-id", removedContainer)
	}
}

func TestLogs_JSONOutputsOneObjectPerLine(t *testing.T) {
	t.Parallel()

	client := mock.New()
	client.ContainerStateFunc = func(_ context.Context, nameOrID string) (types.ContainerState, error) {
		if nameOrID == components.ContainerLocaltest {
			return types.ContainerState{Status: "running", Running: true}, nil
		}
		return types.ContainerState{}, types.ErrContainerNotFound
	}
	client.ContainerLogsFunc = func(_ context.Context, nameOrID string, follow bool, tail string) (io.ReadCloser, error) {
		if nameOrID != components.ContainerLocaltest {
			t.Fatalf("ContainerLogs() name = %q, want %q", nameOrID, components.ContainerLocaltest)
		}
		if follow {
			t.Fatal("ContainerLogs() follow = true, want false")
		}
		if tail != "100" {
			t.Fatalf("ContainerLogs() tail = %q, want 100", tail)
		}
		return io.NopCloser(strings.NewReader("one\ntwo\n")), nil
	}

	var out bytes.Buffer
	env := localtest.NewEnv(&config.Config{}, ui.NewOutput(&out, io.Discard, false), client)
	if err := env.Logs(context.Background(), envtypes.LogsOptions{
		Component: components.ContainerLocaltest,
		Follow:    false,
		JSON:      true,
	}); err != nil {
		t.Fatalf("Logs() error = %v", err)
	}

	lines := strings.Split(strings.TrimSpace(out.String()), "\n")
	if len(lines) != 2 {
		t.Fatalf("output lines = %d, want 2: %q", len(lines), out.String())
	}
	for i, line := range lines {
		var got struct {
			Component string `json:"component"`
			Line      string `json:"line"`
		}
		if err := json.Unmarshal([]byte(line), &got); err != nil {
			t.Fatalf("json.Unmarshal(line %d) error = %v", i, err)
		}
		if got.Component != components.ContainerLocaltest {
			t.Fatalf("line %d component = %q, want %q", i, got.Component, components.ContainerLocaltest)
		}
	}
	if !strings.Contains(lines[0], `"line":"one"`) || !strings.Contains(lines[1], `"line":"two"`) {
		t.Fatalf("lines = %v, want one and two log lines", lines)
	}
}

func managedContainerInfo(state types.ContainerState) types.ContainerInfo {
	return types.ContainerInfo{
		State:  state,
		Labels: map[string]string{containerbackend.GraphIDLabel: testGraphID},
	}
}

func assertContainerStatus(t *testing.T, status *localtest.Status, name string, want string) {
	t.Helper()
	for _, entry := range status.Containers {
		if entry.Name == name {
			if entry.Status != want {
				t.Fatalf("container %q status = %q, want %q", name, entry.Status, want)
			}
			return
		}
	}
	t.Fatalf("container %q missing from status", name)
}

func assertContainerStatusAbsent(t *testing.T, status *localtest.Status, name string) {
	t.Helper()
	for _, entry := range status.Containers {
		if entry.Name == name {
			t.Fatalf("container %q present in status with status %q, want absent", name, entry.Status)
		}
	}
}

func newTestEnv(client container.ContainerClient) *localtest.Env {
	return newTestEnvWithConfig(client, &config.Config{Images: testImages()})
}

func newTestEnvWithConfig(client container.ContainerClient, cfg *config.Config) *localtest.Env {
	return localtest.NewEnv(cfg, ui.NewOutput(io.Discard, io.Discard, false), client)
}

func testImages() config.ImagesConfig {
	return config.ImagesConfig{
		Core: config.CoreImages{
			Localtest:        config.ImageSpec{Image: "ghcr.io/altinn/test-localtest", Tag: "latest"},
			PDF3:             config.ImageSpec{Image: "ghcr.io/altinn/test-pdf3", Tag: "latest"},
			WorkflowEngineDb: config.ImageSpec{Image: "postgres", Tag: "18"},
			WorkflowEngine:   config.ImageSpec{Image: "ghcr.io/altinn/test-workflow-engine", Tag: "latest"},
			PgAdmin:          config.ImageSpec{Image: "dpage/pgadmin4", Tag: "latest"},
		},
		Monitoring: config.MonitoringImages{
			Tempo:         config.ImageSpec{Image: "grafana/tempo", Tag: "latest"},
			Mimir:         config.ImageSpec{Image: "grafana/mimir", Tag: "latest"},
			Loki:          config.ImageSpec{Image: "grafana/loki", Tag: "latest"},
			OtelCollector: config.ImageSpec{Image: "otel/opentelemetry-collector-contrib", Tag: "latest"},
			Grafana:       config.ImageSpec{Image: "grafana/grafana", Tag: "latest"},
		},
	}
}

// TestStatus_ReportsTheBuildEachContainerRuns pins why status reads the container rather than
// the configured reference. The localtest container runs the build it started with while its
// tag has since moved to another one, so the reference no longer describes it and is dropped;
// the pdf container still runs what its reference resolves to, so both are reported.
func TestStatus_ReportsTheBuildEachContainerRuns(t *testing.T) {
	t.Parallel()

	const (
		startedWith  = "sha256:started-with"
		pulledSince  = "sha256:pulled-since"
		pdfImageID   = "sha256:pdf"
		testPDFImage = "ghcr.io/altinn/test-pdf3:latest"
	)

	client := mock.New()
	client.ContainerInspectFunc = func(_ context.Context, name string) (types.ContainerInfo, error) {
		info := managedContainerInfo(types.ContainerState{Status: "running", Running: true})
		switch name {
		case components.ContainerLocaltest:
			info.ImageID = startedWith
		case components.ContainerPDF3:
			info.ImageID = pdfImageID
		}
		return info, nil
	}
	client.ImageInspectFunc = func(_ context.Context, image string) (types.ImageInfo, error) {
		switch image {
		case testLocaltestImageRef:
			return types.ImageInfo{ID: pulledSince}, nil
		case testPDFImage:
			return types.ImageInfo{ID: pdfImageID}, nil
		default:
			return types.ImageInfo{}, types.ErrImageNotFound
		}
	}

	env := newTestEnv(client)
	status, err := env.Status(context.Background())
	if err != nil {
		t.Fatalf("Status() error = %v", err)
	}

	localtestStatus, ok := containerStatus(status, components.ContainerLocaltest)
	if !ok {
		t.Fatalf("status has no %q container", components.ContainerLocaltest)
	}
	if localtestStatus.ImageID != startedWith {
		t.Errorf("localtest image = %q, want the build the container runs", localtestStatus.ImageID)
	}
	if localtestStatus.Image != "" {
		t.Errorf("localtest reference = %q, want none once the tag has moved off that build", localtestStatus.Image)
	}

	pdfStatus, ok := containerStatus(status, components.ContainerPDF3)
	if !ok {
		t.Fatalf("status has no %q container", components.ContainerPDF3)
	}
	if pdfStatus.ImageID != pdfImageID || pdfStatus.Image != testPDFImage {
		t.Errorf("pdf image = %q (%q), want %q (%q)", pdfStatus.Image, pdfStatus.ImageID, testPDFImage, pdfImageID)
	}

	dbStatus, ok := containerStatus(status, components.ContainerWorkflowEngineDb)
	if !ok {
		t.Fatalf("status has no %q container", components.ContainerWorkflowEngineDb)
	}
	if dbStatus.ImageID != "" || dbStatus.Image != "" {
		t.Errorf("workflow-engine-db image = %q (%q), want nothing reported for an unresolvable image",
			dbStatus.Image, dbStatus.ImageID)
	}
}

func containerStatus(status *localtest.Status, name string) (localtest.ContainerStatus, bool) {
	for _, ctr := range status.Containers {
		if ctr.Name == name {
			return ctr, true
		}
	}
	return localtest.ContainerStatus{}, false
}

// TestNewerBuilds_ReportsImagesNoContainerIsRunning covers the hint a converged environment
// gets: a floating image that now resolves to a build nothing is running is behind, and a
// registry that cannot be reached reports nothing rather than failing.
func TestNewerBuilds_ReportsImagesNoContainerIsRunning(t *testing.T) {
	t.Parallel()

	const (
		runningID = "sha256:running"
		newerID   = "sha256:newer"
	)

	tests := map[string]struct {
		pullErr error
		inspect string
		want    int
	}{
		"newer build available":  {pullErr: nil, inspect: newerID, want: 1},
		"already on that build":  {pullErr: nil, inspect: runningID, want: 0},
		"registry not reachable": {pullErr: errStateUnavailable, inspect: newerID, want: 0},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			t.Parallel()

			client := mock.New()
			client.ImagePullFunc = func(context.Context, string) error { return tt.pullErr }
			client.ImageInspectFunc = func(context.Context, string) (types.ImageInfo, error) {
				return types.ImageInfo{ID: tt.inspect}, nil
			}

			images := testImages()
			images.Core.Localtest.Floating = true
			env := newTestEnvWithConfig(client, &config.Config{Images: images})
			status := &localtest.Status{Containers: []localtest.ContainerStatus{{
				Name:    components.ContainerLocaltest,
				ImageID: runningID,
				Status:  "running",
			}}}

			if got := env.NewerBuilds(context.Background(), status); len(got) != tt.want {
				t.Errorf("NewerBuilds() = %v, want %d entries", got, tt.want)
			}
		})
	}
}
