package resourcegraph

import (
	"fmt"
	"time"

	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/ui"
)

// NewCompact creates the narrow interactive row renderer.
func NewCompact(out *ui.Output, resources []resource.Resource, operation Operation) *CompactRenderer {
	return &CompactRenderer{
		screenRenderer: newScreenRenderer(out, resources, operation, nil, compactLayout{}),
	}
}

// NewCompactWithPlan creates the narrow interactive row renderer from planned resources.
func NewCompactWithPlan(
	out *ui.Output,
	resources []resource.PlannedResource,
	operation Operation,
	statuses map[resource.ResourceID]resource.Status,
) *CompactRenderer {
	return &CompactRenderer{
		screenRenderer: newScreenRendererPlanned(out, resources, operation, statuses, compactLayout{}),
	}
}

func (compactLayout) renderLines(model *renderModel, width int, now time.Time) []string {
	lines := make([]string, 0, len(model.order)+1)
	readyCount, failedCount, canceledCount, activeCount := 0, 0, 0, 0
	for _, name := range model.order {
		row := model.rows[name]
		if row == nil {
			continue
		}
		switch {
		case isSuccessfulState(row.state):
			readyCount++
		case row.state == stateFailed:
			failedCount++
		case row.state == stateCanceled:
			canceledCount++
		}
		if isActiveState(row.state) {
			activeCount++
		}
		lines = append(lines, renderCompactRow(model, row, width))
	}

	lines = append(lines, footerLine(model, now, readyCount, failedCount, canceledCount, activeCount))
	return lines
}

func renderCompactRow(model *renderModel, row *progressRow, width int) string {
	const (
		compactNameDivisor    = 3
		compactMinNameWidth   = 12
		compactSeparatorWidth = len(" ") + len(" ")
	)

	nameWidth := min(nameColumnWidth, max(width/compactNameDivisor, compactMinNameWidth))
	nameCell := fmt.Sprintf("%-*s", nameWidth, fitWidth(row.name, nameWidth))
	stateRaw := rawStateLabel(model, row)
	stateCell := stateRaw
	if ui.Colors() {
		stateCell = styleStateLabel(row, stateRaw)
	}

	line := nameCell + " " + stateCell
	messageWidth := max(width-nameWidth-len(stateRaw)-compactSeparatorWidth, 0)
	message := compactMessage(row)
	if messageWidth > 0 && message != "" {
		line += " " + fitWidth(message, messageWidth)
	}
	return line
}
