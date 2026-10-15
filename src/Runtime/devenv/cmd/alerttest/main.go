// Package main checks and fires Studio's alert rules in the fixture's full monitoring profile,
// which grafana-operator syncs from Altinn/altinn-dashboards-grafana (or
// DEVENV_DASHBOARDS_REPOSITORY) into the local Grafana. Start the fixture first, with
// make run-monitoring-full.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"path/filepath"
	"slices"
	"strings"
	"syscall"
	"time"

	"altinn.studio/devenv/pkg/alerttest"
	"altinn.studio/devenv/pkg/runtimes/kind"
)

const (
	checkTimeout   = 10 * time.Minute
	runTimeout     = time.Hour
	quietTimeout   = 40 * time.Minute
	cleanupTimeout = 15 * time.Minute
)

// timeouts bound each command; run's is per scenario, the longest of which waits half an hour
// before its rule fires.
var timeouts = map[string]time.Duration{
	"check":   checkTimeout,
	"run":     runTimeout,
	"quiet":   quietTimeout,
	"cleanup": cleanupTimeout,
}

var (
	errUnknownCommand  = errors.New("unknown command")
	errUnknownScenario = errors.New("unknown scenario")
)

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
	scenario := flags.String("scenario", "", "The scenarios to run or clean up, separated by commas (default: all)")
	if err := flags.Parse(os.Args[2:]); err != nil {
		return 2
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	if err := run(ctx, command, *cacheDir, *evidenceDir, *scenario); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		return 1
	}
	return 0
}

func usage() {
	scenarios := alerttest.Scenarios()
	lines := make([]string, 0, len(scenarios)+12)
	lines = append(lines,
		"Usage: alerttest <command> [options]",
		"",
		"Commands:",
		"  check     Check every alert rule, contact point and self-monitoring target (fires nothing)",
		"  run       Fire and resolve rules with real faults, checking the notifications",
		"  quiet     Check that no rule fires while the proxy, scraper and agents restart",
		"  cleanup   Undo what an interrupted run left behind",
		"",
		"Scenarios:",
	)
	for _, s := range scenarios {
		lines = append(lines, fmt.Sprintf("  %-19s %s (%s)", s.Name(), s.Description(), s.RuleUID()))
	}
	lines = append(lines, "", "Environment:",
		"  "+kind.EnvDashboardsRepository+"  a local checkout of Altinn/altinn-dashboards-grafana")
	fmt.Fprintln(os.Stderr, strings.Join(lines, "\n"))
}

func run(ctx context.Context, command, cacheDir, evidenceDir, names string) (err error) {
	timeout, ok := timeouts[command]
	if !ok {
		usage()
		return fmt.Errorf("%w %q", errUnknownCommand, command)
	}
	scenarios, err := selectScenarios(names)
	if err != nil {
		return err
	}
	if command == "run" {
		timeout *= time.Duration(len(scenarios))
	}
	ctx, cancel := context.WithTimeout(ctx, timeout)
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
	env := alerttest.NewEnv(runtime.KubernetesClient, evidence)

	var errs []error
	switch command {
	case "check":
		errs = append(errs, alerttest.Check(ctx, env))
	case "quiet":
		errs = append(errs, alerttest.CheckQuiet(ctx, env))
	case "cleanup":
		for _, s := range scenarios {
			errs = append(errs, s.Cleanup(ctx, env, alerttest.DefaultTiming()))
		}
	default:
		for _, s := range scenarios {
			if ctx.Err() != nil {
				break
			}
			if err := alerttest.RunScenario(ctx, env, s, alerttest.DefaultTiming()); err != nil {
				evidence.Logf("FAIL %s: %v", s.Name(), err)
				errs = append(errs, fmt.Errorf("%s: %w", s.Name(), err))
			}
		}
	}
	if err := errors.Join(errs...); err != nil {
		return fmt.Errorf("%s: %w", command, err)
	}
	return nil
}

func selectScenarios(names string) ([]*alerttest.Scenario, error) {
	all := alerttest.Scenarios()
	if names == "" {
		return all, nil
	}
	var selected []*alerttest.Scenario
	for name := range strings.SplitSeq(names, ",") {
		index := slices.IndexFunc(all, func(s *alerttest.Scenario) bool { return s.Name() == name })
		if index < 0 {
			return nil, fmt.Errorf("%w %q", errUnknownScenario, name)
		}
		selected = append(selected, all[index])
	}
	return selected, nil
}
