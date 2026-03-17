package renderer

import (
	"fmt"
	"strings"
	"time"

	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/ui"
)

// NewTable creates the wide interactive table renderer.
func NewTable(out *ui.Output, resources []resource.Resource, operation Operation) *TableRenderer {
	return &TableRenderer{
		screenRenderer: newScreenRenderer(out, resources, operation, tableLayout{}),
	}
}

func (tableLayout) renderLines(model *renderModel, width int, now time.Time) []string {
	const maxLeftWidth = 72

	rightWidth := statsColumnWidth + rightSectionGapWidth + progressBarWidth + progressLabelWidth
	leftWidth := min(max(width-rightWidth-rightSectionGapWidth, minLeftWidth), maxLeftWidth)

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
		lines = append(lines, renderTableRow(model, row, leftWidth, now))
	}

	lines = append(lines, footerLine(model, now, readyCount, failedCount, canceledCount, activeCount))
	return lines
}

func renderTableRow(model *renderModel, row *progressRow, leftWidth int, now time.Time) string {
	nameCell := fmt.Sprintf("%-*s", nameColumnWidth, fitWidth(row.name, nameColumnWidth))
	stateRaw := tableStateLabel(model, row)
	stateCell := stateRaw
	if ui.Colors() {
		stateCell = styleStateLabel(row, stateRaw)
	}

	messageWidth := max(leftWidth-nameColumnWidth-stateColumnWidth-(2*stateMessageGapWidth), 0)
	messageCell := fitWidth(row.message, messageWidth)
	if len(messageCell) < messageWidth {
		messageCell += strings.Repeat(" ", messageWidth-len(messageCell))
	}
	left := nameCell + " " + stateCell + " " + messageCell

	stats := fitWidth(statsForRow(row, now), statsColumnWidth)
	stats = fmt.Sprintf("%*s", statsColumnWidth, stats)
	if ui.Colors() {
		stats = progressStatsStyle.Render(stats)
	}

	return left + " " + stats + " " + tableBar(model, row)
}

func tableStateLabel(model *renderModel, row *progressRow) string {
	label := rawStateLabel(model, row)
	label = fitWidth(label, stateColumnWidth)
	if len(label) < stateColumnWidth {
		label += strings.Repeat(" ", stateColumnWidth-len(label))
	}
	return label
}

func tableBar(model *renderModel, row *progressRow) string {
	if row.state == stateFailed {
		return "[" + strings.Repeat("!", progressBarWidth) + "] ERR"
	}
	if row.state == stateCanceled {
		return "[" + strings.Repeat("!", progressBarWidth) + "] CXL"
	}
	if row.indeterminate || row.total <= rowProgressEmpty {
		return indeterminateBar(model.frame)
	}
	return determinateBar(row.current, row.total)
}
