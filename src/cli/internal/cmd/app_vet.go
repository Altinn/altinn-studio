package cmd

// `studioctl app vet`: validation by RPC into studioctl-server, which hosts the engine.

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"sort"

	repocontext "altinn.studio/studioctl/internal/context"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/studioctlserver"
	"altinn.studio/studioctl/internal/ui"
)

type appVetFlags struct {
	appPath    string
	severity   string
	jsonOutput bool
	listRules  bool
}

type appVetOutJSON struct {
	Findings         []studioctlserver.ValidateFinding        `json:"findings"`
	SchemaValidation studioctlserver.ValidateSchemaValidation `json:"schemaValidation"`
	Summary          studioctlserver.ValidateSummary          `json:"summary"`
}

func (c *AppCommand) runVet(ctx context.Context, args []string) error {
	if len(args) > 0 && args[0] == "explain" {
		return c.runVetExplain(ctx, args[1:])
	}
	flags, help, err := parseAppVetFlags(args)
	if err != nil {
		return err
	}
	if help {
		c.out.Print(appVetUsage())
		return nil
	}
	if flags.listRules {
		return c.printRulesList(ctx, flags.jsonOutput)
	}
	return c.runVetChecks(ctx, flags)
}

func (c *AppCommand) runVetChecks(ctx context.Context, flags appVetFlags) error {
	detection, err := repocontext.DetectFromCwd(ctx, flags.appPath)
	if err != nil {
		return fmt.Errorf("detect app: %w", err)
	}
	if !detection.InAppRepo {
		return fmt.Errorf("%w: run from an app directory or use -p to specify path", ErrNoAppFound)
	}

	if err := c.server.ensure(ctx); err != nil {
		return startStudioctlServerError(err)
	}
	resp, rpcErr := c.server.client.Validate(ctx, studioctlserver.ValidateRequest{
		Path:     detection.AppRoot,
		Severity: flags.severity,
	})
	if rpcErr != nil {
		return fmt.Errorf("vet: %w", rpcErr)
	}
	if printErr := printVetOutput(c.out, resp, flags.jsonOutput); printErr != nil {
		return printErr
	}
	if resp.Summary.Errors > 0 {
		return ErrSilentExit
	}
	return nil
}

func parseAppVetFlags(args []string) (appVetFlags, bool, error) {
	fs := flag.NewFlagSet("app vet", flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	var flags appVetFlags
	fs.StringVar(&flags.appPath, "p", "", "App directory path")
	fs.StringVar(&flags.appPath, "path", "", "App directory path")
	fs.BoolVar(&flags.jsonOutput, "json", false, "Emit findings as JSON")
	fs.BoolVar(&flags.listRules, "list-rules", false, "List all registered rules and exit")
	fs.StringVar(&flags.severity, "severity", "warning", "Min severity (error|warning|info)")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return flags, true, nil
		}
		return flags, false, fmt.Errorf("parsing flags: %w", err)
	}
	return flags, false, nil
}

func appVetUsage() string {
	return joinLines(
		fmt.Sprintf(
			"Usage: %s app vet [-p PATH] [--json] [--list-rules] [--severity=…]",
			osutil.CurrentBin(),
		),
		fmt.Sprintf("       %s app vet explain RULE-ID", osutil.CurrentBin()),
		"",
		"Validate an app. Supports V9+.",
		"",
		"Options:",
		"  -p, --path PATH       App directory (defaults to auto-detect from cwd)",
		"  --json                Emit findings as JSON",
		"  --list-rules          List all registered rules and exit",
		"  --severity LEVEL      Min severity to report (error|warning|info; default: warning)",
		"  -h, --help            Show this help",
		"",
		"Subcommands:",
		"  explain RULE-ID       Print one rule's full description",
	)
}

func (c *AppCommand) printRulesList(ctx context.Context, asJSON bool) error {
	if err := c.server.ensure(ctx); err != nil {
		return startStudioctlServerError(err)
	}
	rules, err := c.server.client.ListValidationRules(ctx)
	if err != nil {
		return fmt.Errorf("list rules: %w", err)
	}
	sort.Slice(rules, func(i, j int) bool { return rules[i].ID < rules[j].ID })
	if asJSON {
		data, err := json.MarshalIndent(rules, "", "  ")
		if err != nil {
			return fmt.Errorf("marshal rules: %w", err)
		}
		c.out.Println(string(data))
		return nil
	}
	for _, r := range rules {
		c.out.Printlnf("%s  [%s]  %s", r.ID, r.Severity, r.Title)
	}
	return nil
}

func printVetOutput(out *ui.Output, resp studioctlserver.ValidateResponse, asJSON bool) error {
	if asJSON {
		payload := appVetOutJSON{
			Findings:         resp.Findings,
			Summary:          resp.Summary,
			SchemaValidation: resp.SchemaValidation,
		}
		data, err := json.MarshalIndent(payload, "", "  ")
		if err != nil {
			return fmt.Errorf("marshal findings: %w", err)
		}
		out.Println(string(data))
		return nil
	}
	if !resp.SchemaValidation.Ran {
		out.Printlnf("warning: schema validation skipped: %s", resp.SchemaValidation.Reason)
	}
	for _, warning := range resp.SchemaValidation.Warnings {
		out.Printlnf("warning: schema validation: %s", warning)
	}
	findings := resp.Findings
	if len(findings) == 0 {
		return nil
	}
	displayOrder := make([]studioctlserver.ValidateFinding, len(findings))
	copy(displayOrder, findings)
	sort.SliceStable(displayOrder, func(i, j int) bool {
		return severityRank(displayOrder[i].Severity) < severityRank(displayOrder[j].Severity)
	})
	for _, f := range displayOrder {
		loc := f.File
		if f.Line > 0 {
			loc = fmt.Sprintf("%s:%d:%d", f.File, f.Line, f.Column)
		} else if f.Pointer != "" {
			loc = f.File + "#" + f.Pointer
		}
		out.Printlnf("%s: [%s] %s (%s)", f.Severity, f.RuleID, f.Message, loc)
	}
	return nil
}

func severityRank(s string) int {
	const (
		rankError = iota + 1
		rankWarning
		rankInfo
		rankUnknown
	)
	switch s {
	case "error":
		return rankError
	case "warning":
		return rankWarning
	case "info":
		return rankInfo
	}
	return rankUnknown
}

func (c *AppCommand) runVetExplain(ctx context.Context, args []string) error {
	if len(args) == 0 {
		return fmt.Errorf("%w: app vet explain RULE-ID", ErrMissingArgument)
	}
	if err := c.server.ensure(ctx); err != nil {
		return startStudioctlServerError(err)
	}
	rules, err := c.server.client.ListValidationRules(ctx)
	if err != nil {
		return fmt.Errorf("list rules: %w", err)
	}
	id := args[0]
	for _, r := range rules {
		if r.ID == id {
			c.out.Printlnf("%s", r.ID)
			c.out.Println("")
			c.out.Printlnf("  Title:       %s", r.Title)
			c.out.Printlnf("  Severity:    %s", r.Severity)
			c.out.Println("")
			c.out.Printlnf("%s", r.Description)
			return nil
		}
	}
	return fmt.Errorf("%w: %s (try 'app vet --list-rules')", ErrInvalidFlagValue, id)
}
