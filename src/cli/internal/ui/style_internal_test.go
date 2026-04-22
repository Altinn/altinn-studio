package ui

import "testing"

func TestDisplayWidthIgnoresANSIAndSupportsWideRunes(t *testing.T) {
	text := ColorStyle(ColorRed).Render("a\u754c")

	if got := DisplayWidth(text); got != 3 {
		t.Fatalf("DisplayWidth() = %d, want 3", got)
	}
}
