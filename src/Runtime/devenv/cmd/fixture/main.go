// Package main provides the fixture CLI entrypoint for devenv.
package main

import (
	"errors"
	"flag"
	"fmt"
	"os"
	"strings"

	"altinn.studio/devenv/pkg/runtimes/kind"
)

const defaultCacheDir = ".cache"

var (
	errActionRequired = errors.New("action is required (use --action or -a)")
	errInvalidAction  = errors.New("invalid action")
	errInvalidVariant = errors.New("invalid variant")
)

func main() {
	var (
		action   string
		variant  string
		cacheDir string
		verbose  bool
	)

	flag.StringVar(&action, "action", "", "Action to perform: run, stop (required)")
	flag.StringVar(&action, "a", "", "Action to perform: run, stop (shorthand)")
	flag.StringVar(&variant, "variant", "standard", "Runtime variant: standard, minimal")
	flag.StringVar(&variant, "t", "standard", "Runtime variant: standard, minimal (shorthand)")
	flag.StringVar(&cacheDir, "cache-dir", defaultCacheDir, "Cache directory for config and certs")
	flag.StringVar(&cacheDir, "c", defaultCacheDir, "Cache directory for config and certs (shorthand)")
	flag.BoolVar(&verbose, "verbose", false, "Enable verbose output")
	flag.BoolVar(&verbose, "v", false, "Enable verbose output (shorthand)")

	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, "Usage: %s [options]\n\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "Options:\n")
		flag.PrintDefaults()
		fmt.Fprintf(os.Stderr, "\nExamples:\n")
		fmt.Fprintf(os.Stderr, "  %s --action run --variant standard\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "  %s -a run -t minimal\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "  %s -a stop -t standard\n", os.Args[0])
	}

	flag.Parse()

	if err := run(action, variant, cacheDir, verbose); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

func run(action, variant, cacheDir string, verbose bool) (runErr error) {
	// Validate action
	action = strings.ToLower(strings.TrimSpace(action))
	if action == "" {
		return errActionRequired
	}

	if action != "run" && action != "stop" {
		return fmt.Errorf("%w %q: must be 'run' or 'stop'", errInvalidAction, action)
	}

	// Validate and parse variant
	variant = strings.ToLower(strings.TrimSpace(variant))
	var runtimeVariant kind.KindContainerRuntimeVariant

	switch variant {
	case "standard":
		runtimeVariant = kind.KindContainerRuntimeVariantStandard
	case "minimal":
		runtimeVariant = kind.KindContainerRuntimeVariantMinimal
	default:
		return fmt.Errorf("%w %q: must be 'standard' or 'minimal'", errInvalidVariant, variant)
	}

	if verbose {
		writeStdoutf("Action: %s\n", action)
		writeStdoutf("Variant: %s\n", variant)
		writeStdoutf("Cache directory: %s\n", cacheDir)
		writeStdoutln("")
	}

	// Create the container runtime
	runtime, err := kind.New(runtimeVariant, cacheDir, kind.DefaultOptions())
	if err != nil {
		return fmt.Errorf("failed to create container runtime: %w", err)
	}
	defer func() {
		if closeErr := runtime.Close(); closeErr != nil && runErr == nil {
			runErr = fmt.Errorf("failed to close container runtime: %w", closeErr)
		}
	}()

	// Execute the action
	switch action {
	case "run":
		if err := runtime.Run(); err != nil {
			return fmt.Errorf("failed to run container runtime: %w", err)
		}
	case "stop":
		if err := runtime.Stop(); err != nil {
			return fmt.Errorf("failed to stop container runtime: %w", err)
		}
	}

	return nil
}

func writeStdoutf(format string, args ...any) {
	writeStdout(fmt.Sprintf(format, args...))
}

func writeStdoutln(message string) {
	writeStdout(message + "\n")
}

func writeStdout(message string) {
	if _, err := os.Stdout.WriteString(message); err != nil {
		os.Exit(1)
	}
}
