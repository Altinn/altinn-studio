package cmd

import (
	"bytes"
	"encoding/json"
	"io"
	"strings"
	"testing"

	"altinn.studio/studioctl/internal/ui"
)

func TestAppBuildOutputPrintText(t *testing.T) {
	t.Parallel()

	var out bytes.Buffer
	output := appBuildOutput{ImageTag: "example/app:test", Pushed: true}
	if err := output.PrintImage(ui.NewOutput(&out, io.Discard, false)); err != nil {
		t.Fatalf("PrintImage() error = %v", err)
	}
	if err := output.PrintFinal(ui.NewOutput(&out, io.Discard, false)); err != nil {
		t.Fatalf("PrintFinal() error = %v", err)
	}

	got := out.String()
	if !strings.Contains(got, "Image: example/app:test") {
		t.Fatalf("output = %q, want image line", got)
	}
	if !strings.Contains(got, "Pushed: example/app:test") {
		t.Fatalf("output = %q, want pushed line", got)
	}
}

func TestAppBuildOutputPrintJSON(t *testing.T) {
	t.Parallel()

	var out bytes.Buffer
	output := appBuildOutput{ImageTag: "example/app:test", Pushed: true, JSONOutput: true}
	writer := ui.NewOutput(&out, io.Discard, false)
	if err := output.PrintImage(writer); err != nil {
		t.Fatalf("PrintImage() error = %v", err)
	}
	if err := output.PrintFinal(writer); err != nil {
		t.Fatalf("PrintFinal() error = %v", err)
	}

	var got appBuildOutput
	if err := json.Unmarshal([]byte(strings.TrimSpace(out.String())), &got); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if got.ImageTag != output.ImageTag || !got.Pushed {
		t.Fatalf("output = %+v, want image tag and pushed true", got)
	}
}
