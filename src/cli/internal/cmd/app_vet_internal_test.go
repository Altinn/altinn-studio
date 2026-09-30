package cmd

import (
	"bytes"
	"encoding/json"
	"errors"
	"strings"
	"testing"

	"altinn.studio/studioctl/internal/studioctlserver"
	"altinn.studio/studioctl/internal/ui"
)

func TestAppVetExitStatus(t *testing.T) {
	t.Parallel()

	failing := studioctlserver.ValidateResponse{
		Findings: []studioctlserver.ValidateFinding{{
			RuleID:   "REF-PAGE-FILE",
			Severity: studioctlserver.ValidateSeverityError,
			Message:  `page "Missing" is not a layout file`,
			File:     "App/ui/Task_1/Settings.json",
			Line:     1,
			Column:   29,
		}},
		SchemaValidation: studioctlserver.ValidateSchemaValidation{Ran: true},
		Summary:          studioctlserver.ValidateSummary{Errors: 1, RulesRun: 1},
	}
	passing := studioctlserver.ValidateResponse{
		SchemaValidation: studioctlserver.ValidateSchemaValidation{Ran: true},
		Summary:          studioctlserver.ValidateSummary{Warnings: 1, RulesRun: 1},
	}

	tests := []struct {
		wantErr  error
		name     string
		args     []string
		response studioctlserver.ValidateResponse
	}{
		{name: "json with errors", args: []string{"--json"}, response: failing, wantErr: ErrReportedFailure},
		{name: "text with errors", args: nil, response: failing, wantErr: ErrReportedFailure},
		{name: "json without errors", args: []string{"--json"}, response: passing, wantErr: nil},
		{name: "text without errors", args: nil, response: passing, wantErr: nil},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			command, out := newVetCommand(tt.response)
			args := append([]string{"-p", writeEnvCommandApp(t)}, tt.args...)

			err := command.runVet(t.Context(), args)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("runVet() error = %v, want %v", err, tt.wantErr)
			}
			if out.Len() == 0 {
				t.Fatal("runVet() printed nothing, want the vet report")
			}
		})
	}
}

func TestAppVetJSONPrintsResponse(t *testing.T) {
	t.Parallel()

	response := studioctlserver.ValidateResponse{
		Findings: []studioctlserver.ValidateFinding{{
			RuleID:   "REF-PAGE-FILE",
			Severity: studioctlserver.ValidateSeverityError,
			Message:  "missing page",
			File:     "App/ui/Task_1/Settings.json",
		}},
		Summary: studioctlserver.ValidateSummary{Errors: 1, RulesRun: 1},
	}
	command, out := newVetCommand(response)

	err := command.runVet(t.Context(), []string{"-p", writeEnvCommandApp(t), "--json"})
	if !errors.Is(err, ErrReportedFailure) {
		t.Fatalf("runVet() error = %v, want %v", err, ErrReportedFailure)
	}

	var got studioctlserver.ValidateResponse
	if err := json.Unmarshal([]byte(strings.TrimSpace(out.String())), &got); err != nil {
		t.Fatalf("json.Unmarshal() error = %v, output = %q", err, out.String())
	}
	if got.Summary.Errors != 1 || len(got.Findings) != 1 || got.Findings[0].RuleID != "REF-PAGE-FILE" {
		t.Fatalf("output = %+v, want the server's response", got)
	}
}

func newVetCommand(response studioctlserver.ValidateResponse) (*AppCommand, *bytes.Buffer) {
	var out bytes.Buffer
	return &AppCommand{
		out: ui.NewOutput(&out, &out, false),
		server: studioctlServerAccess{
			client: &fakeStudioctlServerClient{validateResponse: response},
		},
	}, &out
}
