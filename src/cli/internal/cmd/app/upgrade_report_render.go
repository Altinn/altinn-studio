package app

import (
	"strings"

	"altinn.studio/studioctl/internal/studioctlserver"
	"altinn.studio/studioctl/internal/ui"
)

// upgradeStatusWidth fixes the width of the status column, so it stays four cells wide - the widest
// label - even in a run that only reported OK.
const upgradeStatusWidth = 4

// PrintUpgradeResult prints what an upgrade reported, in turn: its steps, any free text, any error, and
// the closing verdict.
func PrintUpgradeResult(out *ui.Output, result studioctlserver.AppUpgradeResult) {
	renderUpgradeSteps(out, result.Steps)
	if result.Output != "" {
		out.Print(result.Output)
	}
	if result.Error != "" {
		out.Error(result.Error)
	}
	printUpgradeVerdict(out, result.ExitCode)
}

// renderUpgradeSteps prints the steps studioctl-server reported: one line per message, with its status
// label and the migration step it belongs to. For example:
//
//	OK    Project file  Altinn.App packages set to 9.0.1
//	WARN  Project file  Verify that the project restores
//	SKIP  Dockerfile    Already targets net10.0
func renderUpgradeSteps(out *ui.Output, steps []studioctlserver.AppUpgradeStep) {
	table := ui.NewTable(
		ui.NewColumn("").WithWidth(upgradeStatusWidth),
		ui.NewColumn(""),
		ui.NewColumn(""),
	).Indent(1)

	for _, step := range steps {
		for _, message := range step.Messages {
			label, labelStyle, textStyle := upgradeStatusStyle(message.Status)
			for i, line := range splitByNewLines(message.Text) {
				labelCell := ui.Empty()
				stepNameCell := ui.Empty()
				if i == 0 {
					labelCell = ui.Cell{Text: label, Style: labelStyle}
					stepNameCell = ui.Cell{Text: step.Name, Style: ui.CellStyleBold}
				}
				table.Row(labelCell, stepNameCell, ui.Cell{Text: line, Style: textStyle})
			}
		}
	}

	out.RenderTable(table)
}

func splitByNewLines(text string) []string {
	normalized := strings.ReplaceAll(strings.ReplaceAll(text, "\r\n", "\n"), "\r", "\n")
	return strings.Split(strings.TrimSuffix(normalized, "\n"), "\n")
}

// upgradeStatusStyle gives a status the label to print and the styles for that label and for the message
// text.
func upgradeStatusStyle(status studioctlserver.AppUpgradeStatus) (string, ui.CellStyle, ui.CellStyle) {
	switch status {
	case studioctlserver.AppUpgradeStatusOK:
		return string(status), ui.CellStyleSuccess, ui.CellStyleDefault
	case studioctlserver.AppUpgradeStatusSkip:
		// Dim the text as well: a migration that was not needed is a non-event, and there are many.
		return string(status), ui.CellStyleDim, ui.CellStyleDim
	case studioctlserver.AppUpgradeStatusWarn:
		return string(status), ui.CellStyleWarning, ui.CellStyleDefault
	case studioctlserver.AppUpgradeStatusTodo:
		return string(status), ui.CellStyleAction, ui.CellStyleDefault
	case studioctlserver.AppUpgradeStatusFail:
		return string(status), ui.CellStyleError, ui.CellStyleDefault
	case studioctlserver.AppUpgradeStatusInfo:
		return string(status), ui.CellStyleInfo, ui.CellStyleDefault
	default:
		return string(studioctlserver.AppUpgradeStatusInfo), ui.CellStyleInfo, ui.CellStyleDefault
	}
}

// printUpgradeVerdict closes every upgrade with what its exit code means.
func printUpgradeVerdict(out *ui.Output, exitCode int) {
	switch exitCode {
	case studioctlserver.AppUpgradeExitSuccess:
		out.Success("Please verify that the application is still working as expected.")
	case studioctlserver.AppUpgradeExitManualRequired:
		out.Warning("Upgrade completed, but some steps need manual follow-up. Please review the warnings above.")
	default:
		out.Warning("Upgrade completed with errors. Please check for errors in the log above.")
	}
}
