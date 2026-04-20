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
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/networking"
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
		"  -c, --checks   Run active checks (probe host gateway, validate connectivity)",
		"  --json         Output as JSON",
		"  -h             Show this help",
	)
}

// Run executes the command.
func (c *DoctorCommand) Run(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("doctor", flag.ContinueOnError)
	var jsonOutput bool
	var runChecks bool
	fs.BoolVar(&jsonOutput, "json", false, "Output as JSON")
	fs.BoolVar(&runChecks, "checks", false, "Run active checks")
	fs.BoolVar(&runChecks, "c", false, "Run active checks")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			c.out.Print(c.Usage())
			return nil
		}
		return fmt.Errorf("parsing flags: %w", err)
	}

	service := doctorsvc.New(c.cfg, c.out.Verbosef)
	report := service.BuildReport(ctx, runChecks)
	issues := service.HasIssues(report)

	if jsonOutput {
		payload, err := json.Marshal(map[string]any{
			"hasIssues":     issues,
			"cli":           report.CLI,
			"system":        report.System,
			"prerequisites": report.Prerequisites,
			"network":       report.Network,
			"auth":          report.Auth,
			"app":           report.App,
			"disk":          report.Disk,
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
	c.renderDoctorNetworkSection(table, report.Network)
	c.renderDoctorAuthSection(table, report.Auth)
	c.renderDoctorDiskSection(table, report.Disk)
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

func (c *DoctorCommand) renderDoctorNetworkSection(table *ui.Table, network *doctorsvc.Network) {
	table.Section("Network")
	defer table.Spacer()

	if network == nil {
		doctorKeyValue(table, "Status", unknownValue)
		return
	}

	if network.Mode == "cached" {
		c.renderDoctorCachedNetworkSection(table, network)
		return
	}

	c.renderDoctorActiveNetworkSection(table, network)
}

func (c *DoctorCommand) renderDoctorCachedNetworkSection(table *ui.Table, network *doctorsvc.Network) {
	switch {
	case network.CacheExists != nil && !*network.CacheExists:
		doctorKeyValue(table, "Host Gateway", "not cached")
		doctorKeyValue(table, "Cache", fmt.Sprintf("missing (run '%s env up' to probe)", osutil.CurrentBin()))
	case network.HostGateway == "":
		doctorKeyValue(table, "Host Gateway", "invalid")
		doctorKeyValue(table, "Cache", "corrupted")
	default:
		doctorKeyValue(table, "Host Gateway", network.HostGateway)
		if network.HostDNS != "" {
			doctorKeyValue(table, "Host DNS", networking.LocalDomain+" -> "+network.HostDNS)
		} else {
			doctorKeyValue(table, "Host DNS", networking.LocalDomain+" unresolvable")
		}
		doctorKeyValue(table, "Cache", doctorCacheStateLabel(network))
	}

	c.renderDoctorLocalhostSection(table, network)
}

func doctorCacheStateLabel(network *doctorsvc.Network) string {
	cacheState := unknownValue
	if network.CacheFresh != nil {
		if *network.CacheFresh {
			cacheState = "fresh"
		} else {
			cacheState = "stale"
		}
	}

	if network.CacheAge == "" {
		return cacheState
	}
	return cacheState + " (" + network.CacheAge + " ago)"
}

func (c *DoctorCommand) renderDoctorActiveNetworkSection(table *ui.Table, network *doctorsvc.Network) {
	if network.Error != "" {
		doctorKeyValueStatus(table, false, "Host Gateway", network.Error)
		c.renderDoctorLocalhostSection(table, network)
		c.renderDoctorLoopbackSection(table, network)
		return
	}

	doctorKeyValueStatus(table, true, "Host Gateway", network.HostGateway)
	if network.PingOK != nil && *network.PingOK {
		doctorKeyValueStatus(table, true, "Connectivity", "ping ok")
	} else {
		doctorKeyValueStatus(table, false, "Connectivity", "ping failed")
	}

	if network.HostDNS != "" {
		doctorKeyValueStatus(table, true, "Host DNS", networking.LocalDomain+" -> "+network.HostDNS)
	} else {
		doctorKeyValueStatus(table, false, "Host DNS", networking.LocalDomain+" unresolvable")
	}

	if network.ContainerDNS != "" {
		doctorKeyValueStatus(table, true, "Container DNS", networking.LocalDomain+" -> "+network.ContainerDNS)
	} else {
		doctorKeyValueStatus(table, false, "Container DNS", networking.LocalDomain+" unresolvable")
	}

	c.renderDoctorLocalhostSection(table, network)
	c.renderDoctorLoopbackSection(table, network)
}

func (c *DoctorCommand) renderDoctorLocalhostSection(table *ui.Table, network *doctorsvc.Network) {
	switch {
	case network.LocalhostError != "":
		doctorKeyValueStatus(table, false, "Localhost", network.LocalhostError)
	case len(network.LocalhostAddrs) == 0:
		doctorKeyValueStatus(table, false, "Localhost", "unresolvable")
	default:
		doctorKeyValueStatus(table, true, "Localhost", "localhost -> "+strings.Join(network.LocalhostAddrs, ", "))
	}
}

func (c *DoctorCommand) renderDoctorLoopbackSection(table *ui.Table, network *doctorsvc.Network) {
	for _, probe := range network.LoopbackEndpoints {
		label := "Loopback " + strings.ToUpper(probe.Family)
		if probe.Reachable {
			doctorKeyValueStatus(table, true, label, probe.Endpoint+" reachable")
			continue
		}
		msg := probe.Endpoint + " unreachable"
		if probe.Error != "" {
			msg += " (" + probe.Error + ")"
		}
		doctorKeyValueStatus(table, false, label, msg)
	}
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
