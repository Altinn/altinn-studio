package app

import (
	"strings"

	"altinn.studio/studioctl/internal/studioctlserver"
	"altinn.studio/studioctl/internal/ui"
)

// upgradeStatusWidth is the display width of the status column: every label fits in four cells.
const upgradeStatusWidth = 4

// PrintUpgradeResult prints everything an upgrade reported, in turn: the reported steps, any free text,
// any error, and the closing verdict. An upgrade kind reports steps or free text, so in practice only one
// of the first two prints anything - but neither can swallow the other.
func PrintUpgradeResult(out *ui.Output, result studioctlserver.AppUpgradeResult) {
	if len(result.Steps) > 0 {
		renderUpgradeSteps(out, result.Steps)
	}
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
	).Indent(1).Gaps(2)

	for _, step := range steps {
		for _, message := range step.Messages {
			label, labelStyle, textStyle := upgradeStatusStyle(message.Status)
			for i, line := range splitByNewlines(message.Text) {
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

func splitByNewlines(text string) []string {
	return strings.FieldsFunc(text, func(r rune) bool { return r == '\n' || r == '\r' })
}

// maps status to a label and two styles: one for the label itself, and one for the message text.
func upgradeStatusStyle(status studioctlserver.AppUpgradeStatus) (string, ui.CellStyle, ui.CellStyle) {
	switch studioctlserver.AppUpgradeStatus(strings.ToUpper(strings.TrimSpace(string(status)))) {
	case studioctlserver.AppUpgradeStatusOK:
		return "OK", ui.CellStyleSuccess, ui.CellStyleDefault
	case studioctlserver.AppUpgradeStatusSkip:
		// Dim the text as well: a migration that was not needed is a non-event, and there are many.
		return "SKIP", ui.CellStyleDim, ui.CellStyleDim
	case studioctlserver.AppUpgradeStatusWarn:
		return "WARN", ui.CellStyleWarning, ui.CellStyleDefault
	case studioctlserver.AppUpgradeStatusTodo:
		return "TODO", ui.CellStyleAction, ui.CellStyleDefault
	case studioctlserver.AppUpgradeStatusFail:
		return "FAIL", ui.CellStyleError, ui.CellStyleDefault
	case studioctlserver.AppUpgradeStatusInfo:
		return "INFO", ui.CellStyleInfo, ui.CellStyleDefault
	default:
		return "INFO", ui.CellStyleInfo, ui.CellStyleDefault
	}
}

const (
	upgradeExitSuccess        = 0
	upgradeExitManualRequired = 3
)

// printUpgradeVerdict closes every upgrade with what its exit code means for the reader. This is the one
// place any upgrade kind says how it went, so they all end the same way.
func printUpgradeVerdict(out *ui.Output, exitCode int) {
	switch exitCode {
	case upgradeExitSuccess:
		out.Success("Please verify that the application is still working as expected.")
	case upgradeExitManualRequired:
		out.Warning("Upgrade completed, but some steps need manual follow-up. Please review the warnings above.")
	default:
		out.Warning("Upgrade completed with errors. Please check for errors in the log above.")
	}
}
