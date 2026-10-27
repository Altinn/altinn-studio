package app

import (
	"bytes"
	"io"
	"slices"
	"strings"
	"testing"

	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/studioctlserver"
	"altinn.studio/studioctl/internal/ui"
)

func renderedVetFindings(
	t *testing.T,
	findings []studioctlserver.ValidateFinding,
	terminalWidth int,
) []string {
	t.Helper()
	t.Setenv("NO_COLOR", "1")

	var stdout bytes.Buffer
	renderVetFindings(ui.NewOutput(&stdout, io.Discard, false), findings, terminalWidth)
	rendered := strings.TrimSuffix(stdout.String(), osutil.LineBreak)
	return strings.Split(rendered, osutil.LineBreak)
}

func sampleVetFindings() []studioctlserver.ValidateFinding {
	return []studioctlserver.ValidateFinding{
		{
			RuleID:   "REF-TEXT-RESOURCE-KEY",
			Severity: studioctlserver.ValidateSeverityWarning,
			Message: `text-resource key "soker.epost.titel" (title on component "soker-epost") ` +
				`is not declared in any resource.<lang>.json`,
			File:   "App/ui/Task_1/layouts/Soker.json",
			Line:   31,
			Column: 20,
		},
		{
			RuleID:   "JSONSCHEMA-VALID",
			Severity: studioctlserver.ValidateSeverityError,
			Message: "layout.schema.v1.json /data/layout/0/size: enum: " +
				"Value should match one of the values specified by the enum",
			File:   "App/ui/Task_1/layouts/Soker.json",
			Line:   8,
			Column: 17,
		},
		{
			RuleID:   "REF-DATAMODEL-PATH",
			Severity: studioctlserver.ValidateSeverityError,
			Message: `data-model binding "prosjekt.belp" (simpleBinding on component "prosjekt-belop") ` +
				`is not declared in dataType "model"'s schema (App/models/model.schema.json)`,
			File:   "App/ui/Task_1/layouts/Prosjekt.json",
			Line:   28,
			Column: 28,
		},
	}
}

func TestRenderVetFindingsWrapsMessagesUnderTheRuleID(t *testing.T) {
	got := renderedVetFindings(t, sampleVetFindings(), 120)

	want := []string{
		" error    JSONSCHEMA-VALID       App/ui/Task_1/layouts/Soker.json:8:17",
		"          layout.schema.v1.json /data/layout/0/size: enum: Value should match one of the values " +
			"specified by the enum",
		" error    REF-DATAMODEL-PATH     App/ui/Task_1/layouts/Prosjekt.json:28:28",
		`          data-model binding "prosjekt.belp" (simpleBinding on component "prosjekt-belop") is not ` +
			`declared in dataType`,
		`          "model"'s schema (App/models/model.schema.json)`,
		" warning  REF-TEXT-RESOURCE-KEY  App/ui/Task_1/layouts/Soker.json:31:20",
		`          text-resource key "soker.epost.titel" (title on component "soker-epost") is not declared in any`,
		"          resource.<lang>.json",
	}
	if !slices.Equal(got, want) {
		t.Errorf("lines = %q, want %q", got, want)
	}
}

func TestRenderVetFindingsWrapsToANarrowTerminalAndKeepsLocationsWhole(t *testing.T) {
	got := renderedVetFindings(t, sampleVetFindings()[2:], 50)

	want := []string{
		" error    REF-DATAMODEL-PATH  App/ui/Task_1/layouts/Prosjekt.json:28:28",
		`          data-model binding "prosjekt.belp"`,
		`          (simpleBinding on component`,
		`          "prosjekt-belop") is not declared in`,
		`          dataType "model"'s schema`,
		"          (App/models/model.schema.json)",
	}
	if !slices.Equal(got, want) {
		t.Errorf("lines = %q, want %q", got, want)
	}
}

func TestRenderVetFindingsKeepsAMinimumMessageWidthOnATinyTerminal(t *testing.T) {
	got := renderedVetFindings(t, sampleVetFindings()[2:], 20)

	want := []string{
		" error    REF-DATAMODEL-PATH  App/ui/Task_1/layouts/Prosjekt.json:28:28",
		`          data-model binding`,
		`          "prosjekt.belp" (simpleBinding`,
		`          on component "prosjekt-belop")`,
		`          is not declared in dataType`,
		`          "model"'s schema`,
		"          (App/models/model.schema.json)",
	}
	if !slices.Equal(got, want) {
		t.Errorf("lines = %q, want %q", got, want)
	}
}

func TestPrintVetResultKeepsMessagesOnOneLineWhenOutputIsNotATerminal(t *testing.T) {
	t.Setenv("NO_COLOR", "1")

	var stdout bytes.Buffer
	PrintVetResult(ui.NewOutput(&stdout, io.Discard, false), studioctlserver.ValidateResponse{
		Findings: append(sampleVetFindings()[2:], []studioctlserver.ValidateFinding{
			{
				RuleID:   "APPMETA-DATATYPE",
				Severity: studioctlserver.ValidateSeverityInfo,
				Message:  `data type "model" has no allowed content types`,
				File:     "App/config/applicationmetadata.json",
				Pointer:  "/dataTypes/0",
			},
			{
				RuleID:   "POLICY-FILE",
				Severity: studioctlserver.ValidateSeverityWarning,
				Message:  "policy file has no rules",
				File:     "App/config/authorization/policy.xml",
			},
		}...),
		SchemaValidation: studioctlserver.ValidateSchemaValidation{Ran: true},
		Summary:          studioctlserver.ValidateSummary{Errors: 1, Warnings: 1, Info: 1, RulesRun: 3},
	})
	got := strings.Split(strings.TrimSuffix(stdout.String(), osutil.LineBreak), osutil.LineBreak)

	want := []string{
		" error    REF-DATAMODEL-PATH  App/ui/Task_1/layouts/Prosjekt.json:28:28",
		`          data-model binding "prosjekt.belp" (simpleBinding on component "prosjekt-belop") ` +
			`is not declared in dataType "model"'s schema (App/models/model.schema.json)`,
		" warning  POLICY-FILE         App/config/authorization/policy.xml",
		"          policy file has no rules",
		" info     APPMETA-DATATYPE    App/config/applicationmetadata.json#/dataTypes/0",
		`          data type "model" has no allowed content types`,
	}
	if !slices.Equal(got, want) {
		t.Errorf("lines = %q, want %q", got, want)
	}
}
