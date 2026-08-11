package cmd

import (
	"strings"

	"altinn.studio/studioctl/internal/studioctlserver"
	"altinn.studio/studioctl/internal/ui"
)

// appUpgradeStatusWidth is the display width of the status column: every label fits in four cells.
const appUpgradeStatusWidth = 4

// printUpgradeResult prints an upgrade result: the structured report with errors and a closing verdict,
// or the raw output for results that do not use the structured format.
func printUpgradeResult(out *ui.Output, result studioctlserver.AppUpgradeResult) {
	if len(result.Steps) == 0 {
		if result.Output != "" {
			out.Print(result.Output)
		}
		if result.Error != "" {
			out.Error(result.Error)
		}
		return
	}

	renderUpgradeReport(out, result.Steps)
	if result.Error != "" {
		out.Error(result.Error)
	}
	printUpgradeVerdict(out, result.ExitCode)
}

// renderUpgradeReport prints the structured report from studioctl-server: one bold header per migration
// step, and one status-labelled line per message. For example:
//
// OK   **Project file**  Altinn.App packages set to 9.0.1
// SKIP **Dockerfile**    Already targets net10.0
func renderUpgradeReport(out *ui.Output, steps []studioctlserver.AppUpgradeStep) {
	table := ui.NewTable(
		ui.NewColumn("").WithWidth(appUpgradeStatusWidth),
        ui.NewColumn(""),
		ui.NewColumn(""),
	).Indent(1).Gaps(2)

	for _, step := range steps {
		for _, message := range step.Messages {
			label, labelStyle, textStyle := appUpgradeStatusStyle(message.Status)
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
func appUpgradeStatusStyle(status studioctlserver.AppUpgradeStatus) (string, ui.CellStyle, ui.CellStyle) {
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

// Closing advice, keyed off the upgrade's exit code.
const (
	appUpgradeVerdictSuccess = "Please verify that the application is still working as expected."
	appUpgradeVerdictManual  = "Upgrade completed, but some steps need manual follow-up. " +
		"Please review the warnings above."
	appUpgradeVerdictError = "Upgrade completed with errors. Please check for errors in the log above."

	// Exit codes studioctl-server reports for an upgrade. Severity does not follow numeric order: 3 means
	// the upgrade did everything it safely could but left work for a human.
	appUpgradeExitSuccess        = 0
	appUpgradeExitManualRequired = 3
)

// printUpgradeVerdict writes the closing advice for a rendered report.
func printUpgradeVerdict(out *ui.Output, exitCode int) {
	switch exitCode {
	case appUpgradeExitSuccess:
		out.Success(appUpgradeVerdictSuccess)
	case appUpgradeExitManualRequired:
		out.Warning(appUpgradeVerdictManual)
	default:
		out.Warning(appUpgradeVerdictError)
	}
}
