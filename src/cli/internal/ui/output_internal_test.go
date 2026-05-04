package ui

import (
	"bytes"
	"io"
	"os"
	"testing"

	"altinn.studio/studioctl/internal/osutil"
)

func TestColors_DefaultEnabledWhenNoColorUnset(t *testing.T) {
	if _, hasNoColor := os.LookupEnv("NO_COLOR"); hasNoColor {
		t.Skip("NO_COLOR is set in the test environment")
	}

	if !Colors() {
		t.Fatal("Colors() = false, want true when NO_COLOR is unset")
	}
}

func TestColors_DisabledWhenNoColorIsEmpty(t *testing.T) {
	t.Setenv("NO_COLOR", "")

	if Colors() {
		t.Fatal("Colors() = true, want false when NO_COLOR is present with empty value")
	}
}

func TestColors_DisabledWhenNoColorIsSet(t *testing.T) {
	t.Setenv("NO_COLOR", "1")

	if Colors() {
		t.Fatal("Colors() = true, want false when NO_COLOR is present")
	}
}

func TestOutputPrintlnUsesPlatformLineBreak(t *testing.T) {
	var out bytes.Buffer
	output := NewOutput(&out, &out, false)

	output.Println("line one")

	got := out.String()
	want := "line one" + osutil.LineBreak
	if got != want {
		t.Fatalf("Println() wrote %q, want %q", got, want)
	}
}

func TestOutputPrintlnfUsesPlatformLineBreak(t *testing.T) {
	var out bytes.Buffer
	output := NewOutput(&out, &out, false)

	output.Printlnf("line %d", 2)

	got := out.String()
	want := "line 2" + osutil.LineBreak
	if got != want {
		t.Fatalf("Printlnf() wrote %q, want %q", got, want)
	}
}

func TestOutputErrorlnfUsesPlatformLineBreak(t *testing.T) {
	t.Setenv("NO_COLOR", "1")

	var errOut bytes.Buffer
	output := NewOutput(io.Discard, &errOut, false)

	output.Errorlnf("problem %d", 3)

	got := errOut.String()
	want := "problem 3" + osutil.LineBreak
	if got != want {
		t.Fatalf("Errorlnf() wrote %q, want %q", got, want)
	}
}
