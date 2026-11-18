package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestAppDevelopmentSkillDirHasSkill(t *testing.T) {
	t.Parallel()

	// The dev command runs from the module root, two levels above this package.
	skillPath := filepath.Join("..", "..", appDevelopmentSkillDir, "SKILL.md")
	if _, err := os.Stat(skillPath); err != nil {
		t.Fatalf("shipped skill not found: %v", err)
	}
}
