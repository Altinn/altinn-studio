//nolint:testpackage // Same-package tests are justified here because the renderer package is internal CLI implementation detail.
package renderer

import (
	"bytes"
	"errors"
	"io"
	"regexp"
	"strings"
	"testing"
	"time"

	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

var (
	errPullPermissionDenied = errors.New("failed to pull\npermission denied")
	errSpecificFailure      = errors.New("specific failure")
)

func TestTableRenderer_FansOutImageProgressToAllDependentContainers(t *testing.T) {
	t.Parallel()

	image := &resource.RemoteImage{Ref: "ghcr.io/altinn/test:latest"}
	containerA := &resource.Container{Name: "container-a", Image: resource.Ref(image)}
	containerB := &resource.Container{Name: "container-b", Image: resource.Ref(image)}

	renderer := NewTable(
		ui.NewOutput(io.Discard, io.Discard, false),
		[]resource.Resource{image, containerA, containerB},
		OperationApply,
	)

	renderer.OnEvent(resource.Event{
		Type:     resource.EventApplyProgress,
		Resource: image.ID(),
		Progress: &resource.Progress{Message: "pulling", Current: 4, Total: 10},
	})

	rowA := renderer.model.rows["container-a"]
	rowB := renderer.model.rows["container-b"]
	if rowA == nil || rowB == nil {
		t.Fatalf("expected both container rows, got rowA=%v rowB=%v", rowA, rowB)
	}
	if rowA.current != 4 || rowB.current != 4 || rowA.total != 10 || rowB.total != 10 {
		t.Fatalf(
			"unexpected fan-out progress: rowA=%d/%d rowB=%d/%d",
			rowA.current,
			rowA.total,
			rowB.current,
			rowB.total,
		)
	}
	if !renderer.dirty {
		t.Fatal("expected renderer to be dirty after progress event")
	}
}

func TestTableRenderer_RendersNetworkAsDedicatedRow(t *testing.T) {
	t.Setenv("NO_COLOR", "1")
	restoreTermFuncs := stubTerminalFuncsForTest(
		func(int) bool { return true },
		func(int) (int, int, error) { return 160, 24, nil },
	)
	defer restoreTermFuncs()

	network := &resource.Network{Name: "altinntestlocal_network"}
	image := &resource.RemoteImage{Ref: "ghcr.io/altinn/test:latest"}
	container := &resource.Container{Name: "localtest", Image: resource.Ref(image)}
	out := &fakeFDBuffer{fd: 7}
	renderer := NewTable(
		ui.NewOutput(out, io.Discard, false),
		[]resource.Resource{network, image, container},
		OperationApply,
	)

	renderer.OnEvent(resource.Event{Type: resource.EventApplyDone, Resource: network.ID()})
	renderer.mu.Lock()
	renderer.renderLocked()
	renderer.mu.Unlock()

	rendered := out.String()
	expectedName := fitWidth(network.Name, nameColumnWidth)
	if !strings.Contains(rendered, expectedName) {
		t.Fatalf("rendered output %q missing network row", rendered)
	}
	if !strings.Contains(rendered, "[ok] ready") {
		t.Fatalf("rendered output %q missing ready state for network row", rendered)
	}
}

func TestNetworkUsesCreateRemoveStates(t *testing.T) {
	row := newProgressRow("altinntestlocal_network")

	applyStartEvent(row, resource.ResourceID("network:altinntestlocal_network"), time.Unix(1000, 0))
	if row.state != stateCreating {
		t.Fatalf("row.state after apply start = %q, want %q", row.state, stateCreating)
	}

	destroyStartEvent(row, resource.ResourceID("network:altinntestlocal_network"), time.Unix(1001, 0))
	if row.state != stateRemoving {
		t.Fatalf("row.state after destroy start = %q, want %q", row.state, stateRemoving)
	}
}

func TestApplyEventToRow_SanitizesFailureMessage(t *testing.T) {
	t.Parallel()

	row := newProgressRow("container-a")
	changed := applyEventToRow(row, resource.Event{
		Type:     resource.EventApplyFailed,
		Resource: resource.ResourceID("container:container-a"),
		Error:    errPullPermissionDenied,
	}, time.Now())
	if !changed {
		t.Fatal("expected row to change")
	}
	if got := row.message; got != "failed to pull permission denied" {
		t.Fatalf("unexpected message %q", got)
	}
}

func TestTableRenderer_FailAllPreservesSpecificFailureAndCancelsCollateral(t *testing.T) {
	t.Setenv("NO_COLOR", "1")
	restoreTermFuncs := stubTerminalFuncsForTest(
		func(int) bool { return true },
		func(int) (int, int, error) { return 160, 24, nil },
	)
	defer restoreTermFuncs()

	imageA := &resource.RemoteImage{Ref: "ghcr.io/altinn/test:a"}
	imageB := &resource.RemoteImage{Ref: "ghcr.io/altinn/test:b"}
	containerA := &resource.Container{Name: "localtest-pdf3", Image: resource.Ref(imageA)}
	containerB := &resource.Container{Name: "localtest", Image: resource.Ref(imageB)}
	out := &fakeFDBuffer{fd: 7}
	renderer := NewTable(
		ui.NewOutput(out, io.Discard, false),
		[]resource.Resource{imageA, imageB, containerA, containerB},
		OperationApply,
	)

	renderer.OnEvent(resource.Event{
		Type:     resource.EventApplyFailed,
		Resource: containerA.ID(),
		Error:    errSpecificFailure,
	})
	renderer.FailAll("apply level: generic failure")

	rowA := renderer.model.rows["localtest-pdf3"]
	rowB := renderer.model.rows["localtest"]
	if rowA == nil || rowB == nil {
		t.Fatal("expected both rows")
	}
	if rowA.message != "specific failure" {
		t.Fatalf("unexpected specific failure message %q", rowA.message)
	}
	if rowB.state != stateCanceled {
		t.Fatalf("rowB.state = %q, want %q", rowB.state, stateCanceled)
	}
	if rowB.message != "canceled after another resource failed" {
		t.Fatalf("unexpected canceled message %q", rowB.message)
	}
	if !renderer.model.operationFailed {
		t.Fatal("expected operationFailed to be true")
	}
	if renderer.model.operationFailure != "" {
		t.Fatalf("unexpected operationFailure %q", renderer.model.operationFailure)
	}

	rendered := out.String()
	if !strings.Contains(rendered, "failed 2 | canceled 1 | active 0") {
		t.Fatalf("rendered output %q missing footer counts", rendered)
	}
}

func TestTableRenderer_StopFlushesDirtyState(t *testing.T) {
	t.Setenv("NO_COLOR", "1")
	restoreTermFuncs := stubTerminalFuncsForTest(
		func(int) bool { return true },
		func(int) (int, int, error) { return 160, 24, nil },
	)
	defer restoreTermFuncs()

	image := &resource.RemoteImage{Ref: "ghcr.io/altinn/test:latest"}
	container := &resource.Container{Name: "container-a", Image: resource.Ref(image)}
	out := &fakeFDBuffer{fd: 7}
	renderer := NewTable(
		ui.NewOutput(out, io.Discard, false),
		[]resource.Resource{image, container},
		OperationApply,
	)

	renderer.Start()
	renderer.OnEvent(resource.Event{Type: resource.EventApplyDone, Resource: image.ID()})
	renderer.OnEvent(resource.Event{Type: resource.EventApplyDone, Resource: container.ID()})
	renderer.Stop()

	rendered := out.String()
	if !strings.Contains(rendered, "container-a") || !strings.Contains(rendered, "[ok] ready") {
		t.Fatalf("rendered output %q missing final ready row", rendered)
	}
	if !strings.Contains(rendered, "ready 1/1 | failed 0 | active 0") {
		t.Fatalf("rendered output %q missing final footer", rendered)
	}
}

func TestTableRenderer_DestroyUsesRemovedState(t *testing.T) {
	t.Setenv("NO_COLOR", "1")
	restoreTermFuncs := stubTerminalFuncsForTest(
		func(int) bool { return true },
		func(int) (int, int, error) { return 160, 24, nil },
	)
	defer restoreTermFuncs()

	image := &resource.RemoteImage{Ref: "ghcr.io/altinn/test:latest"}
	container := &resource.Container{Name: "localtest", Image: resource.Ref(image)}
	out := &fakeFDBuffer{fd: 7}
	renderer := NewTable(
		ui.NewOutput(out, io.Discard, false),
		[]resource.Resource{image, container},
		OperationDestroy,
	)

	renderer.OnEvent(resource.Event{Type: resource.EventDestroyStart, Resource: container.ID()})
	renderer.OnEvent(resource.Event{Type: resource.EventDestroyDone, Resource: container.ID()})
	renderer.mu.Lock()
	renderer.renderLocked()
	renderer.mu.Unlock()

	rendered := out.String()
	if !strings.Contains(rendered, "[ok] removed") {
		t.Fatalf("rendered output %q missing removed state", rendered)
	}
	if !strings.Contains(rendered, "removed 1/1 | failed 0 | active 0") {
		t.Fatalf("rendered output %q missing removed footer", rendered)
	}
}

func TestDestroyRenderer_OmitsAlreadyDestroyedRows(t *testing.T) {
	t.Parallel()

	image := &resource.RemoteImage{Ref: "ghcr.io/altinn/test:latest"}
	running := &resource.Container{Name: "localtest", Image: resource.Ref(image)}
	destroyed := &resource.Container{Name: "localtest-pgadmin", Image: resource.Ref(image)}
	resources := []resource.PlannedResource{
		{Resource: running, ID: running.ID()},
		{Resource: destroyed, ID: destroyed.ID()},
	}
	statuses := map[resource.ResourceID]resource.Status{
		running.ID():   resource.StatusReady,
		destroyed.ID(): resource.StatusDestroyed,
	}

	renderer := NewTableWithPlan(
		ui.NewOutput(io.Discard, io.Discard, false),
		resources,
		OperationDestroy,
		statuses,
	)

	if renderer.model.rows[running.Name] == nil {
		t.Fatalf("expected row for %q", running.Name)
	}
	if renderer.model.rows[destroyed.Name] != nil {
		t.Fatalf("unexpected row for already destroyed resource %q", destroyed.Name)
	}
}

func TestApplyRenderer_InitializesReadyRowsFromStatus(t *testing.T) {
	t.Parallel()

	image := &resource.RemoteImage{Ref: "ghcr.io/altinn/test:latest"}
	container := &resource.Container{Name: "localtest", Image: resource.Ref(image)}
	resources := []resource.PlannedResource{
		{Resource: container, ID: container.ID()},
	}
	statuses := map[resource.ResourceID]resource.Status{
		container.ID(): resource.StatusReady,
	}

	renderer := NewTableWithPlan(
		ui.NewOutput(io.Discard, io.Discard, false),
		resources,
		OperationApply,
		statuses,
	)

	row := renderer.model.rows[container.Name]
	if row == nil {
		t.Fatalf("expected row for %q", container.Name)
	}
	if row.state != stateReady || row.current != rowProgressComplete || row.total != rowProgressComplete {
		t.Fatalf("unexpected initial row state: state=%q current=%d total=%d", row.state, row.current, row.total)
	}
}

func TestTableRenderer_DestroyGlobalFailureAppearsInFooter(t *testing.T) {
	t.Setenv("NO_COLOR", "1")
	restoreTermFuncs := stubTerminalFuncsForTest(
		func(int) bool { return true },
		func(int) (int, int, error) { return 160, 24, nil },
	)
	defer restoreTermFuncs()

	image := &resource.RemoteImage{Ref: "ghcr.io/altinn/test:latest"}
	container := &resource.Container{Name: "localtest", Image: resource.Ref(image)}
	out := &fakeFDBuffer{fd: 7}
	renderer := NewTable(
		ui.NewOutput(out, io.Discard, false),
		[]resource.Resource{image, container},
		OperationDestroy,
	)

	renderer.OnEvent(resource.Event{Type: resource.EventDestroyDone, Resource: container.ID()})
	renderer.FailAll("destroy level: network failure")

	rendered := out.String()
	if !strings.Contains(rendered, "removed 1/1 | failed 1 | active 0") {
		t.Fatalf("rendered output %q missing global failure count", rendered)
	}
}

func TestCompactRenderer_RendersPerContainerRows(t *testing.T) {
	t.Setenv("NO_COLOR", "1")

	image := &resource.RemoteImage{Ref: "ghcr.io/altinn/test:latest"}
	containerA := &resource.Container{Name: "localtest", Image: resource.Ref(image)}
	containerB := &resource.Container{Name: "localtest-pdf3", Image: resource.Ref(image)}
	out := &bytes.Buffer{}
	renderer := NewCompact(
		ui.NewOutput(out, io.Discard, false),
		[]resource.Resource{image, containerA, containerB},
		OperationApply,
	)

	renderer.OnEvent(resource.Event{
		Type:     resource.EventApplyProgress,
		Resource: image.ID(),
		Progress: &resource.Progress{Message: "pulling", Current: 2, Total: 4},
	})
	renderer.mu.Lock()
	lines := renderer.layout.renderLines(renderer.model, 50, time.Unix(1000, 0))
	renderer.mu.Unlock()

	rendered := strings.Join(lines, "\n")
	if !strings.Contains(rendered, "localtest") || !strings.Contains(rendered, "localtest-pdf3") {
		t.Fatalf("compact output %q missing expected rows", rendered)
	}
	if strings.Contains(rendered, "[====") {
		t.Fatalf("compact output %q should not contain full progress bars", rendered)
	}
}

func TestRenderCompactRow_StaysWithinRequestedWidth(t *testing.T) {
	t.Setenv("NO_COLOR", "1")

	model := &renderModel{operation: OperationApply}
	row := &progressRow{
		name:    "localtest",
		state:   statePulling,
		message: "pulling layers from registry",
	}

	line := renderCompactRow(model, row, 32)
	if len(line) > 32 {
		t.Fatalf("len(renderCompactRow()) = %d, want <= 32: %q", len(line), line)
	}
}

func TestLogRenderer_PrintsMilestoneLines(t *testing.T) {
	image := &resource.RemoteImage{Ref: "ghcr.io/altinn/test:latest"}
	container := &resource.Container{Name: "localtest", Image: resource.Ref(image)}
	out := &bytes.Buffer{}
	renderer := NewLog(
		ui.NewOutput(out, io.Discard, false),
		[]resource.Resource{image, container},
		OperationApply,
		"Starting localtest environment...",
	)

	renderer.Start()
	renderer.OnEvent(resource.Event{Type: resource.EventApplyStart, Resource: image.ID()})
	renderer.OnEvent(resource.Event{
		Type:     resource.EventApplyProgress,
		Resource: image.ID(),
		Progress: &resource.Progress{Message: "pulling layers", Current: 2, Total: 10},
	})
	renderer.OnEvent(resource.Event{Type: resource.EventApplyDone, Resource: container.ID()})
	renderer.OnEvent(resource.Event{
		Type:     resource.EventApplyFailed,
		Resource: container.ID(),
		Error:    errSpecificFailure,
	})
	renderer.FailAll("apply level: generic failure")

	rendered := out.String()
	if !strings.Contains(rendered, "Starting localtest environment...") {
		t.Fatalf("log output %q missing start line", rendered)
	}
	if !strings.Contains(rendered, "localtest: pulling") {
		t.Fatalf("log output %q missing active state line", rendered)
	}
	if !strings.Contains(rendered, "20%") {
		t.Fatalf("log output %q missing progress milestone", rendered)
	}
	if !strings.Contains(rendered, "localtest: ready") {
		t.Fatalf("log output %q missing ready line", rendered)
	}
	if !strings.Contains(rendered, "localtest: failed: specific failure") {
		t.Fatalf("log output %q missing failure line", rendered)
	}
}

func TestLogRenderer_DeduplicatesProgressMilestones(t *testing.T) {
	image := &resource.RemoteImage{Ref: "ghcr.io/altinn/test:latest"}
	container := &resource.Container{Name: "localtest", Image: resource.Ref(image)}
	out := &bytes.Buffer{}
	renderer := NewLog(
		ui.NewOutput(out, io.Discard, false),
		[]resource.Resource{image, container},
		OperationApply,
		"",
	)

	renderer.OnEvent(resource.Event{Type: resource.EventApplyStart, Resource: image.ID()})
	renderer.OnEvent(resource.Event{
		Type:     resource.EventApplyProgress,
		Resource: image.ID(),
		Progress: &resource.Progress{Message: "pulling layers", Current: 2, Total: 10},
	})
	renderer.OnEvent(resource.Event{
		Type:     resource.EventApplyProgress,
		Resource: image.ID(),
		Progress: &resource.Progress{Message: "pulling layers", Current: 2, Total: 10},
	})

	rendered := out.String()
	if strings.Count(rendered, "20%") != 1 {
		t.Fatalf("log output %q should contain exactly one deduped 20%% milestone", rendered)
	}
}

func TestLogRenderer_PrintsPlannedResourceWithoutDesiredResource(t *testing.T) {
	id := resource.ContainerID("stale-container")
	out := &bytes.Buffer{}
	renderer := NewLogWithPlan(
		ui.NewOutput(out, io.Discard, false),
		[]resource.PlannedResource{{
			Resource: nil,
			ID:       id,
		}},
		OperationApply,
		nil,
		"",
	)

	renderer.OnEvent(resource.Event{Type: resource.EventDestroyStart, Resource: id})
	renderer.OnEvent(resource.Event{Type: resource.EventDestroyDone, Resource: id})

	rendered := out.String()
	if !strings.Contains(rendered, "stale-container: stopping") {
		t.Fatalf("log output %q missing stopping line", rendered)
	}
	if !strings.Contains(rendered, "stale-container: removed") {
		t.Fatalf("log output %q missing removed line", rendered)
	}
}

func TestStatsIncludeEtaAndRate(t *testing.T) {
	t.Parallel()

	now := time.Unix(1000, 0)
	row := newProgressRow("container-a")
	row.startedAt = now.Add(-10 * time.Second)
	row.current = 50
	row.total = 100
	stats := statsForRow(row, now)
	if !strings.Contains(stats, "eta 10s") {
		t.Fatalf("stats = %q, want eta", stats)
	}
	if !strings.Contains(stats, "5.0/s") {
		t.Fatalf("stats = %q, want rate", stats)
	}
}

func TestScreenRenderer_PrintLinesRepositionsCursorWhenShrinking(t *testing.T) {
	t.Parallel()

	var out bytes.Buffer
	renderer := NewTable(ui.NewOutput(&out, io.Discard, false), nil, OperationApply)
	renderer.renderedLines = 3

	renderer.mu.Lock()
	renderer.printLinesLocked([]string{"summary", "footer"})
	renderer.mu.Unlock()

	got := out.String()
	if !strings.Contains(got, "\033[3A") {
		t.Fatalf("output %q missing initial cursor rewind", got)
	}
	if !strings.Contains(got, "\033[1A\r") {
		t.Fatalf("output %q missing shrink cursor adjustment", got)
	}
	if !strings.HasSuffix(got, "\r") {
		t.Fatalf("output %q missing trailing carriage return", got)
	}
	if renderer.renderedLines != 2 {
		t.Fatalf("renderedLines = %d, want 2", renderer.renderedLines)
	}
}

func TestScreenRenderer_StopLeavesCursorAtLineStartForFollowupOutput(t *testing.T) {
	t.Parallel()

	restoreTermFuncs := stubTerminalFuncsForTest(
		func(int) bool { return true },
		func(int) (int, int, error) { return 160, 24, nil },
	)
	defer restoreTermFuncs()

	out := &fakeFDBuffer{fd: 7}
	image := &resource.RemoteImage{Ref: "ghcr.io/altinn/test:latest"}
	container := &resource.Container{Name: "localtest", Image: resource.Ref(image)}
	output := ui.NewOutput(out, io.Discard, false)
	renderer := NewTable(output, []resource.Resource{image, container}, OperationApply)

	renderer.Start()
	renderer.OnEvent(resource.Event{Type: resource.EventApplyDone, Resource: image.ID()})
	renderer.OnEvent(resource.Event{Type: resource.EventApplyDone, Resource: container.ID()})
	renderer.Stop()
	output.Success("Environment started")

	got := out.String()
	ansiSGR := regexp.MustCompile(`\x1b\[[0-9;]*m`)
	if !strings.Contains(ansiSGR.ReplaceAllString(got, ""), "\rEnvironment started"+osutil.LineBreak) {
		t.Fatalf("output %q missing flush-left follow-up success line", got)
	}
}

func TestDetectMode(t *testing.T) {
	tests := []struct {
		name     string
		verbose  bool
		isTTY    bool
		width    int
		expected Mode
	}{
		{name: "verbose uses log", verbose: true, isTTY: true, width: 200, expected: ModeLog},
		{name: "non tty uses log", isTTY: false, width: 200, expected: ModeLog},
		{name: "wide tty uses table", isTTY: true, width: minProgressWidth, expected: ModeTable},
		{name: "narrow tty uses compact", isTTY: true, width: minProgressWidth - 1, expected: ModeCompact},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			restoreTermFuncs := stubTerminalFuncsForTest(
				func(int) bool { return tt.isTTY },
				func(int) (int, int, error) { return tt.width, 24, nil },
			)
			defer restoreTermFuncs()

			got := DetectMode(ui.NewOutput(fakeFDWriter{fd: 7}, io.Discard, tt.verbose), tt.verbose)
			if got != tt.expected {
				t.Fatalf("DetectMode() = %v, want %v", got, tt.expected)
			}
		})
	}
}

func TestTerminalWidth_UsesOutputFD(t *testing.T) {
	restoreTermFuncs := stubTerminalFuncsForTest(
		func(int) bool { return true },
		func(int) (int, int, error) { return 123, 45, nil },
	)
	defer restoreTermFuncs()

	got := terminalWidth(ui.NewOutput(fakeFDWriter{fd: 99}, io.Discard, false))
	if got != 123 {
		t.Fatalf("terminalWidth() = %d, want 123", got)
	}
}

func TestTerminalWidth_DefaultsWhenOutputHasNoFD(t *testing.T) {
	const defaultTermWidth = 100

	got := terminalWidth(ui.NewOutput(&bytes.Buffer{}, io.Discard, false))
	if got != defaultTermWidth {
		t.Fatalf("terminalWidth() = %d, want %d", got, defaultTermWidth)
	}
}

func stubTerminalFuncsForTest(
	isTerminal func(int) bool,
	getSize func(int) (int, int, error),
) func() {
	prevIsTerminal := outputIsTTYFn
	prevGetSize := outputTerminalSizeFn
	outputIsTTYFn = func(*ui.Output) bool {
		return isTerminal(0)
	}
	outputTerminalSizeFn = func(*ui.Output) (int, int, bool) {
		width, height, err := getSize(0)
		if err != nil || width <= 0 || height <= 0 {
			return 0, 0, false
		}
		return width, height, true
	}
	return func() {
		outputIsTTYFn = prevIsTerminal
		outputTerminalSizeFn = prevGetSize
	}
}

type fakeFDWriter struct {
	fd uintptr
}

func (f fakeFDWriter) Write(p []byte) (int, error) {
	return len(p), nil
}

func (f fakeFDWriter) Fd() uintptr {
	return f.fd
}

type fakeFDBuffer struct {
	bytes.Buffer

	fd uintptr
}

func (f *fakeFDBuffer) Fd() uintptr {
	return f.fd
}
