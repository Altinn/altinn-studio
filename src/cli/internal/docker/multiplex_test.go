package docker_test

import (
	"testing"

	"altinn.studio/studioctl/internal/docker"
)

func TestStripMultiplexedHeader(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{
			name:  "empty string",
			input: "",
			want:  "",
		},
		{
			name:  "short string - no header",
			input: "short",
			want:  "short",
		},
		{
			name:  "stdout header",
			input: "\x01\x00\x00\x00\x00\x00\x00\x05hello",
			want:  "hello",
		},
		{
			name:  "stderr header",
			input: "\x02\x00\x00\x00\x00\x00\x00\x05error",
			want:  "error",
		},
		{
			name:  "no header - regular text",
			input: "regular log line without header",
			want:  "regular log line without header",
		},
		{
			name:  "exactly 8 bytes - stdout header only",
			input: "\x01\x00\x00\x00\x00\x00\x00\x00",
			want:  "",
		},
		{
			name:  "7 bytes - too short for header",
			input: "\x01\x00\x00\x00\x00\x00\x00",
			want:  "\x01\x00\x00\x00\x00\x00\x00",
		},
		{
			name:  "invalid stream type",
			input: "\x03\x00\x00\x00\x00\x00\x00\x05hello",
			want:  "\x03\x00\x00\x00\x00\x00\x00\x05hello",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := docker.StripMultiplexedHeader(tt.input)
			if got != tt.want {
				t.Errorf("StripMultiplexedHeader() = %q, want %q", got, tt.want)
			}
		})
	}
}
