package ui

import (
	"strings"
	"unicode/utf8"

	"github.com/mattn/go-runewidth"
)

// WrapText breaks plain text into lines at most width terminal cells wide. It breaks at spaces, splits a word
// only when the word alone is wider than width, and keeps the line breaks already in the text. A width of zero
// or less leaves every line whole.
func WrapText(text string, width int) []string {
	if text == "" {
		return nil
	}
	lines := strings.Split(text, "\n")
	if width <= 0 {
		return lines
	}
	wrapped := make([]string, 0, len(lines))
	for _, line := range lines {
		wrapped = append(wrapped, wrapLine(line, width)...)
	}
	return wrapped
}

func wrapLine(line string, width int) []string {
	var wrapped []string
	current, currentWidth := "", 0
	rest := line
	for {
		word := strings.TrimLeft(rest, " ")
		if word == "" {
			return append(wrapped, current)
		}
		spaces := rest[:len(rest)-len(word)]
		word, rest = splitAtSpace(word)
		wordWidth := DisplayWidth(word)
		if currentWidth+len(spaces)+wordWidth <= width {
			current += spaces + word
			currentWidth += len(spaces) + wordWidth
			continue
		}
		if current != "" {
			wrapped = append(wrapped, current)
		}
		chunks := breakWord(word, width)
		wrapped = append(wrapped, chunks[:len(chunks)-1]...)
		current = chunks[len(chunks)-1]
		currentWidth = DisplayWidth(current)
	}
}

func splitAtSpace(text string) (string, string) {
	end := strings.IndexByte(text, ' ')
	if end < 0 {
		return text, ""
	}
	return text[:end], text[end:]
}

func breakWord(word string, width int) []string {
	var chunks []string
	for word != "" {
		chunk := runewidth.Truncate(word, width, "")
		if chunk == "" {
			_, size := utf8.DecodeRuneInString(word)
			chunk = word[:size]
		}
		chunks = append(chunks, chunk)
		word = word[len(chunk):]
	}
	return chunks
}
