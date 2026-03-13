package renderer

import (
	"fmt"
	"time"

	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/ui"
)

// NewCompact creates the narrow interactive row renderer.
func NewCompact(out *ui.Output, resources []resource.Resource, operation Operation) *CompactRenderer {
	return &CompactRenderer{
		screenRenderer: newScreenRenderer(out, resources, operation, compactLayout{}),
	}
}

func (compactLayout) renderLines(model *renderModel, width int, now time.Time) []string {
	lines := make([]string, 0, len(model.order)+1)
	readyCount, failedCount, canceledCount, activeCount := 0, 0, 0, 0
	successState := model.operation.successState()

	for _, name := range model.order {
		row := model.rows[name]
		if row == nil {
			continue
		}
		switch row.state {
		case successState:
			readyCount++
		case stateFailed:
			failedCount++
		case stateCanceled:
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
	stateRaw := compactStateLabel(model, row)
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

func compactStateLabel(model *renderModel, row *progressRow) string {
	return rawStateLabel(model, row)
}
