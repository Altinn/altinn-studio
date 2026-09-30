package ui_test

import (
	"slices"
	"testing"

	"altinn.studio/studioctl/internal/ui"
)

func TestWrapText(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		text  string
		want  []string
		width int
	}{
		{
			name:  "fits on one line",
			text:  "short message",
			width: 20,
			want:  []string{"short message"},
		},
		{
			name:  "breaks at the last space that fits",
			text:  "the quick brown fox jumps over the lazy dog",
			width: 15,
			want:  []string{"the quick brown", "fox jumps over", "the lazy dog"},
		},
		{
			name:  "fills a line to exactly the width",
			text:  "abcd efgh ijkl",
			width: 9,
			want:  []string{"abcd efgh", "ijkl"},
		},
		{
			name:  "keeps a word that fits on a line of its own whole",
			text:  "see App/models/model.schema.json",
			width: 30,
			want:  []string{"see", "App/models/model.schema.json"},
		},
		{
			name:  "splits a word wider than the width",
			text:  "path abcdefghijklmnopqrstuvwxyz end",
			width: 10,
			want:  []string{"path", "abcdefghij", "klmnopqrst", "uvwxyz end"},
		},
		{
			name:  "measures wide characters by their display width",
			text:  "\u4e16\u754c \u754c\u4e16 \u754c\u754c",
			width: 9,
			want:  []string{"\u4e16\u754c \u754c\u4e16", "\u754c\u754c"},
		},
		{
			name:  "splits a word of wide characters between characters",
			text:  "\u754c\u754c\u754c",
			width: 5,
			want:  []string{"\u754c\u754c", "\u754c"},
		},
		{
			name:  "keeps spaces inside a line and drops them at a break",
			text:  "a  b    c",
			width: 5,
			want:  []string{"a  b", "c"},
		},
		{
			name:  "keeps line breaks in the text",
			text:  "first line\n\nsecond line",
			width: 20,
			want:  []string{"first line", "", "second line"},
		},
		{
			name:  "leaves lines whole without a width",
			text:  "the quick brown fox\njumps over the lazy dog",
			width: 0,
			want:  []string{"the quick brown fox", "jumps over the lazy dog"},
		},
		{
			name:  "puts at least one character on each line",
			text:  "\u754c\u754c",
			width: 1,
			want:  []string{"\u754c", "\u754c"},
		},
		{
			name:  "returns no lines for empty text",
			text:  "",
			width: 20,
			want:  nil,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()

			got := ui.WrapText(test.text, test.width)
			if !slices.Equal(got, test.want) {
				t.Fatalf("WrapText(%q, %d) = %q, want %q", test.text, test.width, got, test.want)
			}
		})
	}
}
