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

func TestParseAppUpgradeFlagsAcceptsSupportedKinds(t *testing.T) {
	t.Parallel()

	command := &AppCommand{}
	for _, kind := range []string{appUpgradeKindFrontendV4, appUpgradeKindBackendV8, appUpgradeKindV10} {
		t.Run(kind, func(t *testing.T) {
			t.Parallel()

			flags, help, err := command.parseAppUpgradeFlags([]string{kind, "-p", "/tmp/app"})
			if err != nil {
				t.Fatalf("parseAppUpgradeFlags() error = %v", err)
			}
			if help {
				t.Fatal("parseAppUpgradeFlags() help = true, want false")
			}
			if flags.kind != kind {
				t.Fatalf("kind = %q, want %q", flags.kind, kind)
			}
			if flags.appPath != "/tmp/app" {
				t.Fatalf("appPath = %q, want /tmp/app", flags.appPath)
			}
		})
	}
}

func TestParseAppUpgradeFlagsDefaultsToV10(t *testing.T) {
	t.Parallel()

	flags, help, err := (&AppCommand{}).parseAppUpgradeFlags([]string{"-p", "/tmp/app"})
	if err != nil {
		t.Fatalf("parseAppUpgradeFlags() error = %v", err)
	}
	if help {
		t.Fatal("parseAppUpgradeFlags() help = true, want false")
	}
	if flags.kind != appUpgradeKindV10 {
		t.Fatalf("kind = %q, want %q", flags.kind, appUpgradeKindV10)
	}
}

func TestParseAppUpgradeFlagsRejectsUnsupportedKind(t *testing.T) {
	t.Parallel()

	_, _, err := (&AppCommand{}).parseAppUpgradeFlags([]string{"backend-v9"})
	if err == nil {
		t.Fatal("parseAppUpgradeFlags() error = nil, want error")
	}
}
