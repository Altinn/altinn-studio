package cmd_test

import (
	"testing"

	cmd "altinn.studio/studioctl/internal/cmd"
)

func TestValidateAliasName(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		alias   string
		wantErr bool
	}{
		{name: "ok", alias: "s", wantErr: false},
		{name: "ok underscore", alias: "_s1", wantErr: false},
		{name: "empty", alias: "", wantErr: true},
		{name: "starts digit", alias: "1s", wantErr: true},
		{name: "dash", alias: "s-dev", wantErr: true},
		{name: "space", alias: "s dev", wantErr: true},
		{name: "quote", alias: "s'", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			err := cmd.ExportValidateAliasName(tt.alias)
			if (err != nil) != tt.wantErr {
				t.Fatalf("error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestFormatAliasLine_Bash_EscapesSingleQuote(t *testing.T) {
	t.Parallel()

	got := cmd.ExportFormatAliasLine("bash", "s", "/tmp/ab'cd")
	want := "alias s='/tmp/ab'\"'\"'cd'"
	if got != want {
		t.Fatalf("formatAliasLine() = %q, want %q", got, want)
	}
}
