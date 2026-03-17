package renderer

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"altinn.studio/studioctl/internal/ui"
)

func footerLine(
	model *renderModel,
	now time.Time,
	readyCount, failedCount, canceledCount, activeCount int,
) string {
	elapsed := "0s"
	if !model.startedAt.IsZero() {
		elapsed = formatDuration(now.Sub(model.startedAt))
	}

	successLabel := model.operation.successLabel()
	totalCount := len(model.order)
	parts := []string{
		fmt.Sprintf("%s %d/%d", successLabel, readyCount, totalCount),
		fmt.Sprintf("failed %d", failedCount+boolToInt(model.operationFailed)),
	}
	if canceledCount > 0 {
		parts = append(parts, fmt.Sprintf("canceled %d", canceledCount))
	}
	parts = append(parts,
		fmt.Sprintf("active %d", activeCount),
		"elapsed "+elapsed,
	)
	if !ui.Colors() {
		return strings.Join(parts, " | ")
	}

	coloredParts := []string{
		footerReadyStyle.Render(parts[0]),
		footerFailedStyle.Render(parts[1]),
	}
	nextPart := 2
	if canceledCount > 0 {
		coloredParts = append(coloredParts, footerLabelStyle.Render(parts[nextPart]))
		nextPart++
	}
	coloredParts = append(coloredParts,
		footerLabelStyle.Render(parts[nextPart]),
		footerLabelStyle.Render(parts[nextPart+1]),
	)
	return strings.Join(coloredParts, " | ")
}

func rawStateLabel(model *renderModel, row *progressRow) string {
	spinFrames := []string{"-", "\\", "|", "/"}
	spin := spinFrames[model.frame%len(spinFrames)]

	switch {
	case isTerminalUnsuccessfulState(row.state):
		return "[!!] " + row.state
	case row.state == model.operation.successState():
		return "[ok] " + row.state
	case row.state == stateImageReady:
		return "[~] image"
	case row.state == statePending:
		return "[..] " + statePending
	case row.indeterminate:
		return "[" + spin + "] " + row.state
	default:
		return "[~] " + row.state
	}
}

func styleStateLabel(row *progressRow, label string) string {
	switch row.state {
	case stateFailed:
		return stateFailedStyle.Render(label)
	case stateCanceled:
		return stateCanceledStyle.Render(label)
	case stateReady, stateRemoved:
		return stateReadyStyle.Render(label)
	case statePending:
		return statePendingStyle.Render(label)
	default:
		return stateWorkingStyle.Render(label)
	}
}

func statsForRow(row *progressRow, now time.Time) string {
	elapsed := rowElapsed(row, now)
	if elapsed <= 0 {
		return ""
	}

	if row.total > rowProgressEmpty && row.current > rowProgressEmpty && row.current < row.total {
		rate := float64(row.current) / elapsed.Seconds()
		if rate > 0 {
			remaining := row.total - row.current
			eta := time.Duration(float64(time.Second) * (float64(remaining) / rate))
			return "t " + formatDuration(elapsed) + " eta " + formatDuration(eta) + " " + formatRate(rate) + "/s"
		}
	}

	return "t " + formatDuration(elapsed)
}

func rowElapsed(row *progressRow, now time.Time) time.Duration {
	if row.startedAt.IsZero() {
		return 0
	}
	end := now
	if !row.finishedAt.IsZero() {
		end = row.finishedAt
	}
	if end.Before(row.startedAt) {
		return 0
	}
	return end.Sub(row.startedAt)
}

func normalizedProgress(current, total int64) (int64, int64) {
	if current < rowProgressEmpty {
		current = rowProgressEmpty
	}
	if total <= rowProgressEmpty {
		total = rowProgressComplete
	}
	if current > total {
		current = total
	}
	return current, total
}

func determinateBar(current, total int64) string {
	current, total = normalizedProgress(current, total)
	ratio := float64(current) / float64(total)
	filled := int(ratio * float64(progressBarWidth))
	if current > rowProgressEmpty && filled == 0 {
		filled = 1
	}
	if filled > progressBarWidth {
		filled = progressBarWidth
	}

	bar := make([]byte, progressBarWidth)
	for i := range bar {
		bar[i] = ' '
	}
	for i := range filled {
		bar[i] = '='
	}
	if filled > 0 && filled < progressBarWidth {
		bar[filled] = '>'
	}
	percent := min(int(ratio*maxProgressPercent), maxProgressPercent)
	return fmt.Sprintf("[%s] %3d%%", string(bar), percent)
}

func indeterminateBar(frame int) string {
	const indeterminateTrailWidth = 4

	period := max(indeterminateAnimationPeriod(progressBarWidth), int(rowProgressComplete))
	pos := frame % period
	if pos >= progressBarWidth {
		pos = period - pos
	}

	bar := make([]byte, progressBarWidth)
	for i := range bar {
		bar[i] = ' '
	}
	for i := range indeterminateTrailWidth {
		idx := pos - i
		if idx >= 0 && idx < progressBarWidth {
			bar[idx] = '='
		}
	}
	bar[pos] = '>'
	return fmt.Sprintf("[%s] ...", string(bar))
}

func compactMessage(row *progressRow) string {
	if row.message == "" && row.total > rowProgressEmpty && row.current >= rowProgressEmpty && row.current < row.total {
		current, total := normalizedProgress(row.current, row.total)
		percent := min(int((float64(current)/float64(total))*maxProgressPercent), maxProgressPercent)
		return strconv.Itoa(percent) + "%"
	}
	if row.message == "" {
		return ""
	}
	if row.total > rowProgressEmpty &&
		row.current >= rowProgressEmpty &&
		row.current < row.total &&
		!row.indeterminate {
		current, total := normalizedProgress(row.current, row.total)
		percent := min(int((float64(current)/float64(total))*maxProgressPercent), maxProgressPercent)
		return strconv.Itoa(percent) + "% " + row.message
	}
	return row.message
}

func indeterminateAnimationPeriod(width int) int {
	return (width - 1) * 2
}

func formatDuration(d time.Duration) string {
	const (
		secondsPerMinute = 60
		secondsPerHour   = 60 * secondsPerMinute
	)

	if d <= 0 {
		return "0s"
	}
	seconds := int(d.Round(time.Second).Seconds())
	seconds = max(seconds, int(rowProgressComplete))
	hours := seconds / secondsPerHour
	minutes := (seconds % secondsPerHour) / secondsPerMinute
	secs := seconds % secondsPerMinute

	switch {
	case hours > 0:
		return fmt.Sprintf("%dh%dm", hours, minutes)
	case minutes > 0:
		return fmt.Sprintf("%dm%02ds", minutes, secs)
	default:
		return strconv.Itoa(secs) + "s"
	}
}

func formatRate(v float64) string {
	const (
		rateLowThreshold  = 10
		rateKiloThreshold = 1000
		rateMegaThreshold = 1_000_000
	)

	switch {
	case v < rateLowThreshold:
		return strconv.FormatFloat(v, 'f', 1, 64)
	case v < rateKiloThreshold:
		return strconv.FormatFloat(v, 'f', 0, 64)
	case v < rateMegaThreshold:
		return strconv.FormatFloat(v/float64(rateKiloThreshold), 'f', 1, 64) + "k"
	default:
		return strconv.FormatFloat(v/float64(rateMegaThreshold), 'f', 1, 64) + "m"
	}
}

func fitWidth(s string, width int) string {
	const truncateEllipsisWidth = 3

	if width <= 0 {
		return ""
	}
	if len(s) <= width {
		return s
	}
	if width <= truncateEllipsisWidth {
		return s[:width]
	}
	return s[:width-truncateEllipsisWidth] + "..."
}

func boolToInt(v bool) int {
	if v {
		return 1
	}
	return 0
}
