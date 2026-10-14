// Package main runs the alert checks and fault scenarios against the fixture's full monitoring
// profile, which loads Studio's alert rules from Altinn/altinn-dashboards-grafana (or
// DEVENV_DASHBOARDS_REPOSITORY) into the local Grafana.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"altinn.studio/devenv/pkg/alerttest"
	"altinn.studio/devenv/pkg/runtimes/kind"
)

const (
	checkTimeout = 25 * time.Minute
	runTimeout   = 60 * time.Minute
)

var (
	errUnknownScenario = errors.New("unknown scenario")
	errUnknownCommand  = errors.New("unknown command")
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
	scenario := flags.String("scenario", "", "The scenario to run (default: all)")
	skipFixture := flags.Bool("skip-fixture", false,
		"Use the running fixture as it is instead of starting or updating it")
	if err := flags.Parse(os.Args[2:]); err != nil {
		return 2
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	if err := run(ctx, command, *cacheDir, *evidenceDir, *scenario, *skipFixture); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		return 1
	}
	return 0
}

func usage() {
	fmt.Fprintln(os.Stderr, "Usage: alerttest <command> [options]")
	fmt.Fprintln(os.Stderr, "")
	fmt.Fprintln(os.Stderr, "Commands:")
	fmt.Fprintln(os.Stderr, "  check     Check every alert rule's queries and notification template (fires nothing)")
	fmt.Fprintln(os.Stderr, "  run       Fire and resolve rules with real faults, checking the notifications")
	fmt.Fprintln(os.Stderr, "  cleanup   Remove what an interrupted run left behind")
	fmt.Fprintln(os.Stderr, "")
	fmt.Fprintln(os.Stderr, "Scenarios:")
	for _, s := range alerttest.Scenarios() {
		fmt.Fprintf(os.Stderr, "  %-10s %s (%s)\n", s.Name(), s.Description(), s.RuleUID())
	}
	fmt.Fprintln(os.Stderr, "")
	fmt.Fprintln(os.Stderr, "Environment:")
	fmt.Fprintln(os.Stderr, "  "+kind.EnvDashboardsRepository+"  a local checkout of Altinn/altinn-dashboards-grafana")
}

func run(ctx context.Context, command, cacheDir, evidenceDir, scenarioName string, skipFixture bool) error {
	var timeout time.Duration
	switch command {
	case "check":
		timeout = checkTimeout
	case "run", "cleanup":
		timeout = runTimeout
	default:
		usage()
		return fmt.Errorf("%w %q", errUnknownCommand, command)
	}
	scenarios, err := selectScenarios(scenarioName)
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	// The fixture's containers mount files from the cache, which needs an absolute path.
	cacheDir, err = filepath.Abs(cacheDir)
	if err != nil {
		return fmt.Errorf("resolve cache directory: %w", err)
	}
	if evidenceDir == "" {
		evidenceDir = filepath.Join(cacheDir, "alert-evidence",
			time.Now().UTC().Format("20060102T150405Z")+"-"+command)
	}
	evidence, err := alerttest.NewEvidence(evidenceDir, func(line string) {
		if _, writeErr := os.Stdout.WriteString(line + "\n"); writeErr != nil {
			fmt.Fprintf(os.Stderr, "write output: %v\n", writeErr)
		}
	})
	if err != nil {
		return fmt.Errorf("prepare evidence: %w", err)
	}
	env, err := fixture(ctx, cacheDir, skipFixture, evidence)
	if err != nil {
		return err
	}
	evidence.Logf("evidence is saved in %s", evidenceDir)

	switch command {
	case "check":
		if err := alerttest.Check(ctx, env); err != nil {
			return fmt.Errorf("check: %w", err)
		}
		return nil
	case "cleanup":
		var errs []error
		for _, scenario := range scenarios {
			errs = append(errs, scenario.Cleanup(ctx, env))
		}
		return errors.Join(errs...)
	default:
		var errs []error
		for _, scenario := range scenarios {
			if err := alerttest.RunScenario(ctx, env, scenario, alerttest.DefaultTiming()); err != nil {
				evidence.Logf("FAIL %s: %v", scenario.Name(), err)
				errs = append(errs, fmt.Errorf("%s: %w", scenario.Name(), err))
			}
		}
		return errors.Join(errs...)
	}
}

func selectScenarios(name string) ([]alerttest.Scenario, error) {
	all := alerttest.Scenarios()
	if name == "" {
		return all, nil
	}
	names := make([]string, 0, len(all))
	for _, scenario := range all {
		if scenario.Name() == name {
			return []alerttest.Scenario{scenario}, nil
		}
		names = append(names, scenario.Name())
	}
	return nil, fmt.Errorf("%w %q: one of %s", errUnknownScenario, name, strings.Join(names, ", "))
}

// fixture starts or updates the standard fixture with the full monitoring profile, which is
// idempotent, and returns clients for its Grafana and recorder.
func fixture(
	ctx context.Context,
	cacheDir string,
	skip bool,
	evidence *alerttest.Evidence,
) (*alerttest.Env, error) {
	options := kind.DefaultOptions()
	options.IncludeMonitoring = true
	options.MonitoringProfile = kind.MonitoringProfileFull
	//nolint:contextcheck // The runtime's constructor takes no context; it only reads local state.
	runtime, err := kind.New(kind.KindContainerRuntimeVariantStandard, cacheDir, options)
	if err != nil {
		return nil, fmt.Errorf("create fixture runtime: %w", err)
	}
	if !skip {
		evidence.Logf("starting the fixture with the full monitoring profile (unchanged parts are skipped)")
		start := time.Now()
		graph, err := runtime.Graph()
		if err != nil {
			return nil, fmt.Errorf("build fixture graph: %w", err)
		}
		executor, err := runtime.Executor()
		if err != nil {
			return nil, fmt.Errorf("create fixture executor: %w", err)
		}
		if _, err := executor.Apply(ctx, graph); err != nil {
			return nil, fmt.Errorf("start fixture: %w", err)
		}
		evidence.Logf("fixture ready in %s", time.Since(start).Round(time.Second))
	}
	if runtime.KubernetesClient == nil {
		if err := runtime.InitializeClients(); err != nil {
			return nil, fmt.Errorf("connect to fixture: %w", err)
		}
	}
	kube := runtime.KubernetesClient
	return &alerttest.Env{
		Kube:     kube,
		Grafana:  alerttest.NewGrafana(kube),
		Recorder: alerttest.NewRecorder(kube),
		Evidence: evidence,
	}, nil
}
