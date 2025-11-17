package main

import (
	"context"
	"flag"
	"fmt"
	"os"

	"altinn.studio/runtime-fixture/pkg/tools"
)

const defaultCachePath = ".cache"

func main() {
	var (
		verbose   bool
		cachePath string
		tools     string
	)

	flag.BoolVar(&verbose, "verbose", false, "Enable verbose output")
	flag.BoolVar(&verbose, "v", false, "Enable verbose output (shorthand)")
	flag.StringVar(&cachePath, "cache", defaultCachePath, "Cache path (.cache)")
	flag.StringVar(&tools, "tools", "", "Comma-separated list of tools to install (default: install all)")
	flag.Parse()

	if err := run(verbose, cachePath, tools); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

func run(verbose bool, cachePath, toolsList string) error {
	// Create installer
	installer, err := tools.NewInstaller(cachePath, verbose, false)
	if err != nil {
		return fmt.Errorf("failed to create installer: %w", err)
	}

	// Install tools
	ctx := context.Background()
	installedCount, err := installer.Install(ctx, toolsList)
	if err != nil {
		return err
	}

	if installedCount == 0 {
		fmt.Println("✓ All tools up to date")
	} else {
		fmt.Println("\n✓ Setup complete!")
	}
	return nil
}
