package ui

import (
	"fmt"
	"strings"

	"github.com/mattn/go-runewidth"
)

// Color identifies a 256-color ANSI foreground color.
type Color int

const (
	// ColorGray is the bright gray terminal color.
	ColorGray Color = 8
	// ColorRed is the bright red terminal color.
	ColorRed Color = 9
	// ColorGreen is the bright green terminal color.
	ColorGreen Color = 10
	// ColorYellow is the bright yellow terminal color.
	ColorYellow Color = 11
	// ColorBlue is the bright blue terminal color.
	ColorBlue Color = 12
	// ColorMagenta is the bright magenta terminal color.
	ColorMagenta Color = 13
	// ColorCyan is the bright cyan terminal color.
	ColorCyan Color = 14
)

// Style renders terminal text with ANSI escape sequences.
type Style struct {
	prefix string
}

// ColorStyle returns a style for the given ANSI foreground color.
func ColorStyle(color Color) Style {
	return Style{prefix: fmt.Sprintf("\x1b[38;5;%dm", color)}
}

// BoldStyle returns a bold text style.
func BoldStyle() Style {
	return Style{prefix: "\x1b[1m"}
}

// Render applies the style to text.
func (s Style) Render(text string) string {
	if s.prefix == "" || text == "" {
		return text
	}
	return s.prefix + text + "\x1b[0m"
}

// DisplayWidth returns the terminal cell width of text, ignoring ANSI escapes.
func DisplayWidth(text string) int {
	width := 0
	for line := range strings.SplitSeq(text, "\n") {
		width = max(width, runewidth.StringWidth(stripANSI(line)))
	}
	return width
}

func stripANSI(text string) string {
	escapeIndex := strings.IndexByte(text, '\x1b')
	if escapeIndex < 0 {
		return text
	}

	var builder strings.Builder
	builder.Grow(len(text))
	builder.WriteString(text[:escapeIndex])

	for i := escapeIndex; i < len(text); i++ {
		if text[i] != '\x1b' {
			builder.WriteByte(text[i])
			continue
		}

		i++
		if i >= len(text) {
			break
		}

		switch text[i] {
		case '[':
			i = consumeCSI(text, i+1)
		case ']':
			i = consumeOSC(text, i+1)
		default:
			// Two-byte escape sequence.
		}
	}

	return builder.String()
}

func consumeCSI(text string, i int) int {
	for ; i < len(text); i++ {
		if text[i] >= 0x40 && text[i] <= 0x7e {
			return i
		}
	}
	return len(text)
}

func consumeOSC(text string, i int) int {
	for ; i < len(text); i++ {
		if text[i] == '\a' {
			return i
		}
		if text[i] == '\x1b' && i+1 < len(text) && text[i+1] == '\\' {
			return i + 1
		}
	}
	return len(text)
}
