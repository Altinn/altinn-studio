package app

import (
	"fmt"
	"sort"

	"altinn.studio/studioctl/internal/studioctlserver"
	"altinn.studio/studioctl/internal/ui"
)

// vetSeverityWidth fixes the width of the severity column to the widest label, "warning".
const vetSeverityWidth = 7

// PrintVetResult prints what a vet run reported: schema-validation notices, the findings ordered by
// severity, and the closing verdict.
func PrintVetResult(out *ui.Output, resp studioctlserver.ValidateResponse) {
	if !resp.SchemaValidation.Ran {
		out.Warning("Schema validation skipped: " + resp.SchemaValidation.Reason)
	}
	for _, warning := range resp.SchemaValidation.Warnings {
		out.Warning("Schema validation: " + warning)
	}
	renderVetFindings(out, resp.Findings)
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

// renderVetFindings prints one finding per line, most severe first. For example:
//
//	error    REF-PAGE-FILE   page "Missing" is not a layout file  App/ui/Task_1/Settings.json:1:29
//	warning  SELECTION-OPTIONS  Dropdown "d" has no options source  App/ui/Task_1/layouts/P1.json:4:7
func renderVetFindings(out *ui.Output, findings []studioctlserver.ValidateFinding) {
	if len(findings) == 0 {
		return
	}
	ordered := make([]studioctlserver.ValidateFinding, len(findings))
	copy(ordered, findings)
	sort.SliceStable(ordered, func(i, j int) bool {
		return vetSeverityRank(ordered[i].Severity) < vetSeverityRank(ordered[j].Severity)
	})

	table := ui.NewTable(
		ui.NewColumn("").WithWidth(vetSeverityWidth),
		ui.NewColumn(""),
		ui.NewColumn(""),
		ui.NewColumn(""),
	).Indent(1)
	for _, finding := range ordered {
		table.Row(
			ui.Cell{Text: string(finding.Severity), Style: vetSeverityStyle(finding.Severity)},
			ui.Cell{Text: finding.RuleID, Style: ui.CellStyleBold},
			ui.Text(finding.Message),
			ui.Dim(vetLocation(finding)),
		)
	}
	out.RenderTable(table)
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
