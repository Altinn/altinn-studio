// Package main checks Studio's alert rules in the fixture's full monitoring profile, which
// grafana-operator syncs from Altinn/altinn-dashboards-grafana (or DEVENV_DASHBOARDS_REPOSITORY)
// into the local Grafana. Start the fixture first, with make run-monitoring-full.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"altinn.studio/devenv/pkg/alerttest"
	"altinn.studio/devenv/pkg/runtimes/kind"
)

const checkTimeout = 10 * time.Minute

var errUnknownCommand = errors.New("unknown command")

func main() {
	os.Exit(mainExitCode())
}

func mainExitCode() int {
	if len(os.Args) < 2 {
		usage()
		return 2
	}
	command := os.Args[1]
	flags := flag.NewFlagSet(command, flag.ExitOnError)
	cacheDir := flags.String("cache-dir", ".cache", "The fixture's cache directory")
	evidenceDir := flags.String("evidence-dir", "",
		"Where to save the evidence (default: <cache-dir>/alert-evidence/<time>-<command>)")
	if err := flags.Parse(os.Args[2:]); err != nil {
		return 2
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	if err := run(ctx, command, *cacheDir, *evidenceDir); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		return 1
	}
	return 0
}

func usage() {
	fmt.Fprintln(os.Stderr, "Usage: alerttest <command> [options]")
	fmt.Fprintln(os.Stderr, "")
	fmt.Fprintln(os.Stderr, "Commands:")
	fmt.Fprintln(
		os.Stderr,
		"  check   Check every alert rule, contact point and self-monitoring target (fires nothing)",
	)
	fmt.Fprintln(os.Stderr, "")
	fmt.Fprintln(os.Stderr, "Environment:")
	fmt.Fprintln(os.Stderr, "  "+kind.EnvDashboardsRepository+"  a local checkout of Altinn/altinn-dashboards-grafana")
}

func run(ctx context.Context, command, cacheDir, evidenceDir string) (err error) {
	if command != "check" {
		usage()
		return fmt.Errorf("%w %q", errUnknownCommand, command)
	}
	ctx, cancel := context.WithTimeout(ctx, checkTimeout)
	defer cancel()

	//nolint:contextcheck // The runtime's loader takes no context; it only reads local state.
	runtime, err := kind.Load(kind.KindContainerRuntimeVariantStandard, cacheDir, kind.DefaultOptions())
	if err != nil {
		return fmt.Errorf("connect to the fixture: %w", err)
	}
	if evidenceDir == "" {
		evidenceDir = filepath.Join(cacheDir, "alert-evidence", time.Now().UTC().Format("20060102T150405Z")+"-"+command)
	}
	evidence, err := alerttest.NewEvidence(evidenceDir, func(line string) {
		if _, writeErr := os.Stdout.WriteString(line + "\n"); writeErr != nil {
			fmt.Fprintf(os.Stderr, "write output: %v\n", writeErr)
		}
	})
	if err != nil {
		return fmt.Errorf("prepare evidence: %w", err)
	}
	defer func() { err = errors.Join(err, evidence.Close()) }()
	evidence.Logf("evidence is saved in %s", evidenceDir)
	if err := alerttest.Check(ctx, alerttest.NewEnv(runtime.KubernetesClient, evidence)); err != nil {
		return fmt.Errorf("check: %w", err)
	}
	return nil
}
