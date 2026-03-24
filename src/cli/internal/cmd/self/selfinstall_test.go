package self

import (
	"strings"
	"testing"
)

func TestPathInstructionsWindowsUsesTrailingBackslash(t *testing.T) {
	t.Parallel()

	const dir = `C:\Users\alice\AppData\Roaming\altinn-studio\bin`

	got := pathInstructions(osWindows, dir)

	if !strings.Contains(got, dir+`\`) {
		t.Fatalf("pathInstructions() = %q, want trailing backslash for %q", got, dir)
	}
}
