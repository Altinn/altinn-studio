package osutil

import (
	"os"
	"testing"
)

func TestCurrentBin(t *testing.T) {
	originalArgs := os.Args
	t.Cleanup(func() {
		os.Args = originalArgs
	})

	tests := []struct {
		name string
		args []string
		want string
	}{
		{name: "empty args", args: nil, want: fallbackCommandName},
		{name: "empty binary", args: []string{""}, want: fallbackCommandName},
		{name: "plain binary", args: []string{"/tmp/studioctl"}, want: "studioctl"},
		{name: "exe suffix stripped", args: []string{"/tmp/studioctl.exe"}, want: "studioctl"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			os.Args = tt.args

			if got := CurrentBin(); got != tt.want {
				t.Fatalf("CurrentBin() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestDisplayCommandName(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		input string
		want  string
	}{
		{name: "unchanged", input: "studioctl", want: "studioctl"},
		{name: "strips exe", input: "studioctl.exe", want: "studioctl"},
		{name: "strips exe case insensitive", input: "STUDIOCTL.EXE", want: "STUDIOCTL"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			if got := displayCommandName(tt.input); got != tt.want {
				t.Fatalf("displayCommandName() = %q, want %q", got, tt.want)
			}
		})
	}
}
