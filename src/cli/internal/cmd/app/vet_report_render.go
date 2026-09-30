package app

import (
	"fmt"
	"sort"
	"strings"

	"altinn.studio/studioctl/internal/studioctlserver"
	"altinn.studio/studioctl/internal/ui"
)

// vetSeverityWidth fixes the width of the severity column to the widest label, "warning".
const vetSeverityWidth = 7

const (
	vetIndent          = 1
	vetColumnGap       = 2
	vetMessageIndent   = vetIndent + vetSeverityWidth + vetColumnGap
	vetMinMessageWidth = 30
)

// PrintVetResult prints what a vet run reported: schema-validation notices, the findings ordered by
// severity, and the closing verdict.
func PrintVetResult(out *ui.Output, resp studioctlserver.ValidateResponse) {
	if !resp.SchemaValidation.Ran {
		out.Warning("Schema validation skipped: " + resp.SchemaValidation.Reason)
	}
	for _, warning := range resp.SchemaValidation.Warnings {
		out.Warning("Schema validation: " + warning)
	}
	renderVetFindings(out, resp.Findings, vetTerminalWidth(out))
	printVetVerdict(out, resp.Summary)
}

// PrintVetRules prints the rule catalogue: one line per rule with its id, default severity and title.
func PrintVetRules(out *ui.Output, rules []studioctlserver.ValidateRule) {
	table := ui.NewTable(
		ui.NewColumn(""),
		ui.NewColumn("").WithWidth(vetSeverityWidth),
		ui.NewColumn(""),
	).Indent(1)
	for _, rule := range rules {
		table.Row(
			ui.Cell{Text: rule.ID, Style: ui.CellStyleBold},
			ui.Cell{Text: string(rule.Severity), Style: vetSeverityStyle(rule.Severity)},
			ui.Text(rule.Title),
		)
	}
	out.RenderTable(table)
}

// renderVetFindings prints the findings, most severe first: a line with the severity, rule and location, then
// the message indented under the rule and wrapped to the terminal width. For example:
//
//	error    REF-PAGE-FILE      App/ui/Task_1/Settings.json:1:29
//	         page "Missing" is not a layout file
//	warning  SELECTION-OPTIONS  App/ui/Task_1/layouts/P1.json:4:7
//	         Dropdown "d" has no options source
func renderVetFindings(out *ui.Output, findings []studioctlserver.ValidateFinding, terminalWidth int) {
	if len(findings) == 0 {
		return
	}
	ordered := make([]studioctlserver.ValidateFinding, len(findings))
	copy(ordered, findings)
	sort.SliceStable(ordered, func(i, j int) bool {
		return vetSeverityRank(ordered[i].Severity) < vetSeverityRank(ordered[j].Severity)
	})

	headings := ui.NewTable(
		ui.NewColumn("").WithWidth(vetSeverityWidth),
		ui.NewColumn(""),
		ui.NewColumn(""),
	).Indent(vetIndent).Gap(vetColumnGap)
	for _, finding := range ordered {
		headings.Row(
			ui.Cell{Text: string(finding.Severity), Style: vetSeverityStyle(finding.Severity)},
			ui.Cell{Text: finding.RuleID, Style: ui.CellStyleBold},
			ui.Dim(vetLocation(finding)),
		)
	}

	messageIndent := strings.Repeat(" ", vetMessageIndent)
	messageWidth := vetMessageWidth(terminalWidth)
	for i, heading := range headings.Lines() {
		out.Println(heading)
		for _, line := range ui.WrapText(ordered[i].Message, messageWidth) {
			out.Println(messageIndent + line)
		}
	}
}

func vetTerminalWidth(out *ui.Output) int {
	width, _, ok := out.TerminalSize()
	if !ok {
		return 0
	}
	return width
}

func vetMessageWidth(terminalWidth int) int {
	if terminalWidth <= 0 {
		return 0
	}
	return max(terminalWidth-vetMessageIndent, vetMinMessageWidth)
}

func vetLocation(finding studioctlserver.ValidateFinding) string {
	if finding.Line > 0 {
		return fmt.Sprintf("%s:%d:%d", finding.File, finding.Line, finding.Column)
	}
	if finding.Pointer != "" {
		return finding.File + "#" + finding.Pointer
	}
	return finding.File
}

func vetSeverityStyle(severity studioctlserver.ValidateSeverity) ui.CellStyle {
	switch severity {
	case studioctlserver.ValidateSeverityError:
		return ui.CellStyleError
	case studioctlserver.ValidateSeverityWarning:
		return ui.CellStyleWarning
	case studioctlserver.ValidateSeverityInfo:
		return ui.CellStyleInfo
	default:
		return ui.CellStyleDefault
	}
}

const (
	vetRankError = iota
	vetRankWarning
	vetRankInfo
	vetRankUnknown
)

func vetSeverityRank(severity studioctlserver.ValidateSeverity) int {
	switch severity {
	case studioctlserver.ValidateSeverityError:
		return vetRankError
	case studioctlserver.ValidateSeverityWarning:
		return vetRankWarning
	case studioctlserver.ValidateSeverityInfo:
		return vetRankInfo
	default:
		return vetRankUnknown
	}
}

// printVetVerdict closes every run with the counts and whether they fail the app.
func printVetVerdict(out *ui.Output, summary studioctlserver.ValidateSummary) {
	counts := fmt.Sprintf(
		"%d errors, %d warnings, %d info from %d rules",
		summary.Errors, summary.Warnings, summary.Info, summary.RulesRun,
	)
	switch {
	case summary.Errors > 0:
		out.Error("Vet failed: " + counts)
	case summary.Warnings > 0:
		out.Warning("Vet passed with warnings: " + counts)
	default:
		out.Success("Vet passed: " + counts)
	}
}
