package internal_test

import (
	"bytes"
	"testing"

	"altinn.studio/releaser/internal"
)

func TestConsolePrompterConfirm(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		input    string
		expected bool
	}{
		{name: "lowercase y", input: "y\n", expected: true},
		{name: "uppercase y", input: "Y\n", expected: true},
		{name: "yes not accepted", input: "yes\n", expected: false},
		{name: "empty defaults to no", input: "\n", expected: false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			in := bytes.NewBufferString(tc.input)
			out := &bytes.Buffer{}
			p := internal.NewConsolePrompter(internal.WithPromptIO(in, out))
			confirmed, err := p.Confirm("test action", []string{"line one", "line two"})
			if err != nil {
				t.Fatalf("Confirm() error = %v", err)
			}
			if confirmed != tc.expected {
				t.Fatalf("Confirm() = %v, want %v", confirmed, tc.expected)
			}
		})
	}
}
