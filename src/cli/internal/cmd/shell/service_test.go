package shell_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	shellsvc "altinn.studio/studioctl/internal/cmd/shell"
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
			err := shellsvc.ValidateAliasName(tt.alias)
			if (err != nil) != tt.wantErr {
				t.Fatalf("ValidateAliasName() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestFormatAliasLine_Bash_EscapesSingleQuote(t *testing.T) {
	t.Parallel()

	got := shellsvc.FormatAliasLine("bash", "s", "/tmp/ab'cd")
	want := "alias s='/tmp/ab'\"'\"'cd'"
	if got != want {
		t.Fatalf("FormatAliasLine() = %q, want %q", got, want)
	}
}

func TestConfigureAlias_CreatesMissingConfigFile(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("HOME", tmp)
	t.Setenv("USERPROFILE", tmp)
	t.Setenv("HOMEDRIVE", "")
	t.Setenv("HOMEPATH", "")

	result, err := shellsvc.NewService().ConfigureAlias(context.Background(), shellsvc.AliasOptions{
		AliasName: "s",
		Shell:     "bash",
	})
	if err != nil {
		t.Fatalf("ConfigureAlias() error = %v", err)
	}

	wantPath := filepath.Join(tmp, ".bashrc")
	if result.Status != shellsvc.AliasStatusAdded {
		t.Fatalf("ConfigureAlias() status = %q, want %q", result.Status, shellsvc.AliasStatusAdded)
	}
	if result.ConfigPath != wantPath {
		t.Fatalf("ConfigureAlias() config path = %q, want %q", result.ConfigPath, wantPath)
	}

	content, err := os.ReadFile(wantPath)
	if err != nil {
		t.Fatalf("ReadFile(%q) error = %v", wantPath, err)
	}
	if string(content) != result.AliasLine+"\n" {
		t.Fatalf("config file content = %q, want %q", string(content), result.AliasLine+"\n")
	}
}
