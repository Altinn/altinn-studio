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
			name:  "plain line unchanged",
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
			name:  "invalid stream type unchanged",
			input: "\x03\x00\x00\x00\x00\x00\x00\x05hello",
			want:  "\x03\x00\x00\x00\x00\x00\x00\x05hello",
		},
		{
			name:  "non-zero padding unchanged",
			input: "\x01\x01\x00\x00\x00\x00\x00\x05hello",
			want:  "\x01\x01\x00\x00\x00\x00\x00\x05hello",
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
