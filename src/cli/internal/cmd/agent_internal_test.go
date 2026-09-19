package cmd

import (
	"bytes"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/ui"
)

func TestAgentSkillsCommands(t *testing.T) {
	t.Parallel()

	home := t.TempDir()
	cfg := &config.Config{Home: home, Version: config.NewVersion("v1.2.3")}
	skillDir := filepath.Join(cfg.AgentSkillsDir(), "altinn-studio-app-development")
	if err := os.MkdirAll(skillDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(
		filepath.Join(skillDir, "SKILL.md"),
		[]byte("---\nname: altinn-studio-app-development\ndescription: Develop Altinn Studio apps\n---\n"),
		0o644,
	); err != nil {
		t.Fatal(err)
	}

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	command := NewAgentCommand(cfg, ui.NewOutput(&stdout, &stderr, false))

	if err := command.Run(t.Context(), []string{"skills", "list"}); err != nil {
		t.Fatalf("skills list error = %v", err)
	}
	got := stdout.String()
	if !strings.Contains(got, "altinn-studio-app-development") || !strings.Contains(got, "Develop Altinn Studio apps") {
		t.Fatalf("skills list output = %q", got)
	}

	stdout.Reset()
	if err := command.Run(t.Context(), []string{"skills", "path", "altinn-studio-app-development"}); err != nil {
		t.Fatalf("skills path error = %v", err)
	}
	if got := strings.TrimSpace(stdout.String()); got != skillDir {
		t.Fatalf("skills path output = %q, want %q", got, skillDir)
	}

	stdout.Reset()
	target := filepath.Join(t.TempDir(), "skills")
	if err := command.Run(t.Context(), []string{
		"skills", "install", "--target", target, "altinn-studio-app-development",
	}); err != nil {
		t.Fatalf("skills install error = %v", err)
	}
	if got := stdout.String(); !strings.Contains(got, "Installed custom skill") {
		t.Fatalf("skills install output = %q", got)
	}
	if _, err := os.Stat(filepath.Join(target, "altinn-studio-app-development", "SKILL.md")); err != nil {
		t.Fatalf("installed skill missing: %v", err)
	}
}

func TestAgentSkillsInstallHelpDocumentsSafeTargets(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{Home: t.TempDir(), Version: config.NewVersion("v1.2.3")}
	var stdout bytes.Buffer
	command := NewAgentCommand(cfg, ui.NewOutput(&stdout, &bytes.Buffer{}, false))
	if err := command.Run(t.Context(), []string{"skills", "install", "--help"}); err != nil {
		t.Fatalf("skills install --help error = %v", err)
	}
	for _, want := range []string{"--scope user|repo", "--harness codex|claude", "--target DIR", "only when"} {
		if !strings.Contains(stdout.String(), want) {
			t.Errorf("help output does not contain %q:\n%s", want, stdout.String())
		}
	}
}

func TestAgentSkillsInstallRejectsAmbiguousTargetFlags(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{Home: t.TempDir(), Version: config.NewVersion("v1.2.3")}
	command := NewAgentCommand(cfg, ui.NewOutput(&bytes.Buffer{}, &bytes.Buffer{}, false))
	err := command.Run(t.Context(), []string{
		"skills", "install", "--target", "somewhere", "--scope", "repo", "altinn-studio-app-development",
	})
	if !errors.Is(err, ErrInvalidFlagValue) {
		t.Fatalf("skills install error = %v, want ErrInvalidFlagValue", err)
	}
}
