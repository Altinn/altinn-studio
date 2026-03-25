package self_test

import (
	"runtime"
	"strings"
	"testing"

	"altinn.studio/studioctl/internal/cmd/self"
)

func TestPathInstructionsWindowsUsesTrailingBackslash(t *testing.T) {
	t.Parallel()
	if runtime.GOOS != "windows" {
		t.Skip("windows-specific PATH instructions")
	}

	const dir = `C:\Users\alice\AppData\Roaming\altinn-studio\bin`

	got := self.PathInstructions(dir)

	if !strings.Contains(got, dir+`\`) {
		t.Fatalf("PathInstructions() = %q, want trailing backslash for %q", got, dir)
	}
}
