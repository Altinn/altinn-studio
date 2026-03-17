// Package renderer contains the localtest resource renderers used by env up/down.
package renderer

import (
	"sync"
	"time"

	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/ui"

	"github.com/charmbracelet/lipgloss"
	"golang.org/x/term"
)

const (
	nameColumnWidth  = 28
	stateColumnWidth = 13
	statsColumnWidth = 28
	progressBarWidth = 20
	minLeftWidth     = nameColumnWidth + stateColumnWidth + stateMessageGapWidth
	minProgressWidth = minLeftWidth + (2 * rightSectionGapWidth) + statsColumnWidth + progressBarWidth + progressLabelWidth

	stateMessageGapWidth = 2
	rightSectionGapWidth = 1
	progressLabelWidth   = len("[] 100%")
	maxProgressPercent   = 100

	rowProgressEmpty    = int64(0)
	rowProgressComplete = int64(1)
)

const (
	statePending    = "pending"
	stateCreating   = "creating"
	stateBuilding   = "building"
	statePulling    = "pulling"
	stateStarting   = "starting"
	stateStopping   = "stopping"
	stateRemoving   = "removing"
	stateWorking    = "working"
	stateImageReady = "image ready"
	stateReady      = "ready"
	stateRemoved    = "removed"
	stateFailed     = "failed"
	stateCanceled   = "canceled"
)

// Mode identifies the rendering mode to use for a localtest resource operation.
type Mode int

const (
	// ModeTable renders the full table layout for wide interactive terminals.
	ModeTable Mode = iota
	// ModeCompact renders a narrower row-based layout for interactive terminals.
	ModeCompact
	// ModeLog renders plain log lines for non-interactive output.
	ModeLog
)

// Operation identifies the lifecycle operation being rendered.
type Operation int

const (
	// OperationApply renders environment startup progress.
	OperationApply Operation = iota
	// OperationDestroy renders environment teardown progress.
	OperationDestroy
)

// Renderer observes resource events and renders them to the configured output.
type Renderer interface {
	resource.Observer
	Start()
	Stop()
	FailAll(message string)
}

//nolint:gochecknoglobals // These styles are immutable presentation constants; package scope keeps the renderer readable.
var (
	statePendingStyle  = lipgloss.NewStyle().Foreground(lipgloss.Color("8"))
	stateWorkingStyle  = lipgloss.NewStyle().Foreground(lipgloss.Color("12"))
	stateReadyStyle    = lipgloss.NewStyle().Foreground(lipgloss.Color("10"))
	stateFailedStyle   = lipgloss.NewStyle().Foreground(lipgloss.Color("9"))
	stateCanceledStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("8"))
	footerLabelStyle   = lipgloss.NewStyle().Foreground(lipgloss.Color("8"))
	footerReadyStyle   = lipgloss.NewStyle().Foreground(lipgloss.Color("10"))
	footerFailedStyle  = lipgloss.NewStyle().Foreground(lipgloss.Color("9"))
	progressStatsStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("8"))
)

//nolint:gochecknoglobals // Test seams for terminal detection keep the production code simple and the behavior unit-testable.
var (
	termGetSizeFn    = term.GetSize
	termIsTerminalFn = term.IsTerminal
)

//nolint:govet // fieldalignment: keep model state grouped by concern; this is short-lived CLI state.
type renderModel struct {
	order            []string
	rows             map[string]*progressRow
	resourceToRows   map[resource.ResourceID][]string
	operation        Operation
	operationFailed  bool
	operationFailure string
	startedAt        time.Time
	frame            int
}

//nolint:govet // fieldalignment: keep row state readable; optimizing this CLI struct adds noise without value.
type progressRow struct {
	name          string
	state         string
	message       string
	startedAt     time.Time
	finishedAt    time.Time
	current       int64
	total         int64
	indeterminate bool
}

type layout interface {
	renderLines(model *renderModel, width int, now time.Time) []string
}

type screenRenderer struct {
	out           *ui.Output
	model         *renderModel
	layout        layout
	done          chan struct{}
	mu            sync.Mutex
	renderedLines int
	running       bool
	dirty         bool
}

// TableRenderer renders the wide interactive table layout.
type TableRenderer struct {
	*screenRenderer
}

// CompactRenderer renders the narrow interactive row layout.
type CompactRenderer struct {
	*screenRenderer
}

// LogRenderer renders plain log lines for non-interactive output.
type LogRenderer struct {
	out          *ui.Output
	model        *renderModel
	emitted      map[string]string
	startMessage string
	mu           sync.Mutex
}

type tableLayout struct{}

type compactLayout struct{}
