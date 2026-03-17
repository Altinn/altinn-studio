package internal_test

import (
	"bytes"
	"testing"

	"altinn.studio/releaser/internal"
)

func TestConsoleLoggerCommand_QuotesAndEscapesArgs(t *testing.T) {
	t.Parallel()

	var out bytes.Buffer
	log := internal.NewConsoleLogger(internal.WithWriters(&out, &out))

	log.Command("gh", []string{
		"pr",
		"create",
		"--body",
		"- [Fixed] one\n- [Added] two",
		"--label",
		"release/studioctl",
	})

	const want = "    [gh] \"pr\" \"create\" \"--body\" \"- [Fixed] one\\n- [Added] two\" \"--label\" \"release/studioctl\"\n"
	if got := out.String(); got != want {
		t.Fatalf("command log mismatch\nwant:\n%s\ngot:\n%s", want, got)
	}
}

func TestConsoleLoggerCommand_NoArgs(t *testing.T) {
	t.Parallel()

	var out bytes.Buffer
	log := internal.NewConsoleLogger(internal.WithWriters(&out, &out))

	log.Command("git", nil)

	const want = "    [git]\n"
	if got := out.String(); got != want {
		t.Fatalf("command log mismatch\nwant:\n%s\ngot:\n%s", want, got)
	}
}
