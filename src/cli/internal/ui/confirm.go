package ui

import (
	"context"
	"fmt"
	"io"
	"strings"
)

// Confirm prompts for a y/N confirmation.
// Returns (confirmed, error) where error is ErrInterrupted on Ctrl+C.
func Confirm(ctx context.Context, out *Output, in io.Reader, prompt string) (bool, error) {
	out.Print(prompt)
	response, err := ReadLine(ctx, in)
	if err != nil {
		out.Println("")
		return false, fmt.Errorf("read confirmation: %w", err)
	}
	answer := strings.TrimSpace(strings.ToLower(string(response)))
	return answer == "y" || answer == "yes", nil
}
