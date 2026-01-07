// Package main is the entry point for studioctl.
package main

import (
	"os"

	"altinn.studio/studioctl/internal/cmd"
)

func main() {
	os.Exit(cmd.Main())
}
