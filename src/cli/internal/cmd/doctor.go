package cmd

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"strconv"
	"strings"

	doctorsvc "altinn.studio/studioctl/internal/cmd/doctor"
	envlocaltest "altinn.studio/studioctl/internal/cmd/env/localtest"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

const (
	doctorKeyWidth = 14
	unknownValue   = "unknown"
)

// DoctorCommand implements the 'doctor' subcommand.
type DoctorCommand struct {
	cfg *config.Config
	out *ui.Output
}

// NewDoctorCommand creates a new doctor command.
func NewDoctorCommand(cfg *config.Config, out *ui.Output) *DoctorCommand {
	return &DoctorCommand{cfg: cfg, out: out}
}

// Name returns the command name.
func (c *DoctorCommand) Name() string { return "doctor" }

// Synopsis returns a short description.
func (c *DoctorCommand) Synopsis() string { return "Diagnose environment and configuration" }

// Usage returns the full help text.
func (c *DoctorCommand) Usage() string {
	return joinLines(
		fmt.Sprintf("Usage: %s doctor [options]", osutil.CurrentBin()),
		"",
		"Diagnose the development environment and show any issues.",
		"",
		"Options:",
		"  --json         Output as JSON",
		"  -h             Show this help",
	)
}

// Run executes the command.
func (c *DoctorCommand) Run(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("doctor", flag.ContinueOnError)
	var jsonOutput bool
	fs.BoolVar(&jsonOutput, "json", false, "Output as JSON")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			c.out.Print(c.Usage())
			return nil
		}
		return fmt.Errorf("parsing flags: %w", err)
	}

	service := doctorsvc.New(c.cfg, c.out.Verbosef)
	report := service.BuildReport(ctx)
	issues := service.HasIssues(report)

	if jsonOutput {
		payload, err := json.Marshal(map[string]any{
			"hasIssues":     issues,
			"cli":           report.CLI,
			"system":        report.System,
			"prerequisites": report.Prerequisites,
			"auth":          report.Auth,
			"app":           report.App,
			"disk":          report.Disk,
			"localtestEnv":  report.LocaltestEnv,
		})
		if err != nil {
			return fmt.Errorf("marshal doctor json: %w", err)
		}
		c.out.Println(string(payload))
		return nil
	}

	c.renderDoctorText(report)
	if issues {
		c.out.Warning("Some issues were found. See above for details.")
		return nil
	}

	c.out.Success("All checks passed!")
	return nil
}

func (c *DoctorCommand) renderDoctorText(report doctorsvc.Report) {
	c.out.Printlnf("%s doctor", osutil.CurrentBin())
	c.out.Println("")

	table := newDoctorTable(doctorKeyWidth)
	c.renderDoctorCLISection(table, report.CLI)
	c.renderDoctorSystemSection(table, report.System)
	c.renderDoctorPrerequisitesSection(table, report.Prerequisites)
	c.renderDoctorAuthSection(table, report.Auth)
	c.renderDoctorDiskSection(table, report.Disk)
	c.renderDoctorLocaltestEnvSection(table, report.LocaltestEnv)
	c.renderDoctorAppSection(table, report.App)
	c.out.RenderTable(table)
}

func newDoctorTable(keyWidth int) *ui.Table {
	return ui.NewTable(
		ui.NewColumn("").WithWidth(1),
		ui.NewColumn("").WithMinWidth(keyWidth).WithStyle(ui.CellStyleDim),
		ui.NewColumn(""),
	).Indent(2).Gaps(1, 2)
}

func doctorKeyValue(table *ui.Table, key, value string) {
	table.Row(ui.Empty(), ui.Text(key), ui.Text(value))
}

func doctorKeyValueStatus(table *ui.Table, ok bool, key, value string) {
	table.Row(ui.Status(ok), ui.Text(key), ui.Text(value))
}

func (c *DoctorCommand) renderDoctorCLISection(table *ui.Table, cli *doctorsvc.CLI) {
	table.Section(osutil.CurrentBin())
	defer table.Spacer()

	if cli == nil {
		doctorKeyValue(table, "Version", unknownValue)
	} else {
		doctorKeyValue(table, "Version", cli.Version)
	}
}

func (c *DoctorCommand) renderDoctorSystemSection(table *ui.Table, system *doctorsvc.System) {
	table.Section("System")
	defer table.Spacer()

	if system == nil {
		doctorKeyValue(table, "Status", unknownValue)
		return
	}

	doctorKeyValue(table, "OS", system.OS)
	doctorKeyValue(table, "Architecture", system.Architecture)
	if system.OSName != "" {
		doctorKeyValue(table, "OS Name", system.OSName)
	}
	if system.OSVersion != "" {
		doctorKeyValue(table, "OS Version", system.OSVersion)
	}
	doctorKeyValue(table, "Terminal", system.Terminal)

	colorStatus := "disabled"
	if system.ColorEnabled {
		colorStatus = "enabled"
	}
	doctorKeyValue(table, "Color", colorStatus)

	ttyStatus := "no"
	if system.TTY {
		ttyStatus = "yes"
	}
	doctorKeyValue(table, "TTY", ttyStatus)
}

func (c *DoctorCommand) renderDoctorPrerequisitesSection(table *ui.Table, prerequisites *doctorsvc.Prerequisites) {
	table.Section("Prerequisites")
	defer table.Spacer()

	if prerequisites == nil {
		doctorKeyValueStatus(table, false, "Status", "unknown")
		return
	}

	dotnetValue := prerequisites.DotnetValue
	if dotnetValue == "" {
		dotnetValue = unknownValue
	}
	if prerequisites.Dotnet.OK {
		doctorKeyValueStatus(table, true, ".NET SDK", dotnetValue)
	} else {
		msg := "not found"
		if dotnetValue != unknownValue {
			msg = dotnetValue + " (8.0+ required)"
		}
		doctorKeyValueStatus(table, false, ".NET SDK", msg)
	}

	containerValue := prerequisites.ContainerValue
	if containerValue == "" {
		containerValue = unknownValue
	}
	if prerequisites.Container.OK {
		doctorKeyValueStatus(table, true, "Container", containerValue)
	} else {
		doctorKeyValueStatus(table, false, "Container", "not found")
	}
	if prerequisites.ContainerResolved != "" {
		doctorKeyValue(table, "Resolved", prerequisites.ContainerResolved)
	}
	if tools := doctorContainerToolsLabel(prerequisites.ContainerTools); tools != "" {
		doctorKeyValue(table, "Tools", tools)
	}
	if prerequisites.ContainerHost != "" {
		doctorKeyValue(table, "DOCKER_HOST", prerequisites.ContainerHost)
	}

	c.renderDoctorWindowsPrerequisite(table, prerequisites)
}

func doctorContainerToolsLabel(tools []doctorsvc.ContainerTool) string {
	if len(tools) == 0 {
		return ""
	}

	parts := make([]string, 0, len(tools))
	for _, tool := range tools {
		if tool.Version != "" {
			parts = append(parts, tool.Name+" ("+tool.Version+")")
			continue
		}
		parts = append(parts, tool.Name)
	}
	return strings.Join(parts, ", ")
}

func (c *DoctorCommand) renderDoctorWindowsPrerequisite(table *ui.Table, prerequisites *doctorsvc.Prerequisites) {
	if prerequisites.Windows == nil {
		return
	}

	windowsValue := prerequisites.WindowsValue
	if windowsValue == "" {
		windowsValue = unknownValue
	}
	if prerequisites.Windows.OK {
		doctorKeyValueStatus(table, true, "Windows", windowsValue)
		return
	}

	msg := windowsValue
	if windowsValue != unknownValue {
		msg += " (1803+ required for Unix Domain Sockets)"
	}
	doctorKeyValueStatus(table, false, "Windows", msg)
}

func (c *DoctorCommand) renderDoctorAuthSection(table *ui.Table, authJSON *doctorsvc.Auth) {
	table.Section("Auth")
	defer table.Spacer()

	if authJSON == nil {
		doctorKeyValue(table, "Status", unknownValue)
		return
	}
	if authJSON.Error != "" {
		doctorKeyValue(table, "Status", authJSON.Error)
		return
	}
	if !authJSON.LoggedIn {
		doctorKeyValue(table, "Status", "not logged in")
		return
	}

	doctorKeyValue(table, "Status", "logged in ("+strconv.Itoa(len(authJSON.Environments))+" env)")
	for _, env := range authJSON.Environments {
		doctorKeyValue(table, env.Env, env.Username+" @ "+env.Host+" (PAT)")
	}
}

func (c *DoctorCommand) renderDoctorDiskSection(table *ui.Table, disk *doctorsvc.Disk) {
	table.Section("Disk")
	defer table.Spacer()

	if disk == nil {
		doctorKeyValue(table, "Status", unknownValue)
		return
	}

	for _, check := range disk.Checks {
		value := check.Message
		if check.Path != "" {
			value += " (" + check.Path + ")"
		}

		switch check.Level {
		case "ok":
			doctorKeyValueStatus(table, true, check.ID, value)
		case "info":
			doctorKeyValue(table, check.ID, value)
		case "warn":
			doctorKeyValueStatus(table, false, check.ID, "WARN: "+value)
		case "error":
			doctorKeyValueStatus(table, false, check.ID, "ERROR: "+value)
		default:
			doctorKeyValue(table, check.ID, value)
		}
	}
}

func (c *DoctorCommand) renderDoctorLocaltestEnvSection(
	table *ui.Table,
	localtestEnv *envlocaltest.DiagnosticReport,
) {
	table.Section("Env - localtest")
	defer table.Spacer()

	if localtestEnv == nil {
		doctorKeyValue(table, "Status", unknownValue)
		return
	}

	for _, service := range localtestEnv.Services {
		table.Row(ui.Empty(), ui.Text(service.Name), ui.Empty())
		for _, check := range service.Checks {
			value := check.Message
			if check.URL != "" {
				value += " (" + check.URL + ")"
			}
			showHostsHint := check.Label == "DNS:" && check.Level == envlocaltest.DiagnosticLevelError

			label := "  " + check.Label
			switch check.Level {
			case envlocaltest.DiagnosticLevelOK:
				doctorKeyValueStatus(table, true, label, value)
			case envlocaltest.DiagnosticLevelInfo:
				doctorKeyValue(table, label, value)
			case envlocaltest.DiagnosticLevelWarn:
				doctorKeyValueStatus(table, false, label, "WARN: "+value)
			case envlocaltest.DiagnosticLevelError:
				doctorKeyValueStatus(table, false, label, "ERROR: "+value)
			default:
				doctorKeyValue(table, label, value)
			}
			if showHostsHint {
				table.Row(ui.Empty(), ui.Empty(), ui.Dim("run '"+osutil.CurrentBin()+" env hosts add'"))
			}
		}
	}
}

func (c *DoctorCommand) renderDoctorAppSection(table *ui.Table, app *doctorsvc.App) {
	table.Section("App")
	defer table.Spacer()

	if app == nil {
		doctorKeyValueStatus(table, false, "App", unknownValue)
		return
	}
	if app.Error != "" {
		doctorKeyValueStatus(table, false, "App", "error: "+app.Error)
		return
	}
	if !app.Found {
		doctorKeyValue(table, "App", "not detected in current directory")
		return
	}

	doctorKeyValue(table, "App found", app.Path)
	doctorKeyValue(table, "Detected via", app.DetectedVia)
}
