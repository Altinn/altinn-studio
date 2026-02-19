package cmd

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"strconv"

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
	return fmt.Sprintf(`Usage: %s doctor [options]

Diagnose the development environment and show any issues.

Options:
  -c, --checks   Run active checks (probe host gateway, validate connectivity)
  --json         Output as JSON
  -h             Show this help
`, osutil.CurrentBin())
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
		c.out.Printf("%s\n", payload)
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
	c.out.Printf("%s doctor\n", osutil.CurrentBin())
	c.out.Println("")

	sec := c.out.NewSection(doctorKeyWidth)
	c.renderDoctorCLISection(sec, report.CLI)
	c.renderDoctorSystemSection(sec, report.System)
	c.renderDoctorPrerequisitesSection(sec, report.Prerequisites)
	c.renderDoctorNetworkSection(sec, report.Network)
	c.renderDoctorAuthSection(sec, report.Auth)
	c.renderDoctorDiskSection(sec, report.Disk)
	c.renderDoctorAppSection(sec, report.App)
}

func (c *DoctorCommand) renderDoctorCLISection(sec *ui.Section, cli *doctorsvc.CLI) {
	sec.Header(osutil.CurrentBin())
	defer c.out.Println("")

	if cli == nil {
		sec.KeyValue("Version", unknownValue)
	} else {
		sec.KeyValue("Version", cli.Version)
	}
}

func (c *DoctorCommand) renderDoctorSystemSection(sec *ui.Section, system *doctorsvc.System) {
	sec.Header("System")
	defer c.out.Println("")

	if system == nil {
		sec.KeyValue("Status", unknownValue)
		return
	}

	sec.KeyValue("OS", system.OS)
	sec.KeyValue("Architecture", system.Architecture)
	if system.OSName != "" {
		sec.KeyValue("OS Name", system.OSName)
	}
	if system.OSVersion != "" {
		sec.KeyValue("OS Version", system.OSVersion)
	}
	sec.KeyValue("Terminal", system.Terminal)

	colorStatus := "disabled"
	if system.ColorEnabled {
		colorStatus = "enabled"
	}
	sec.KeyValue("Color", colorStatus)

	ttyStatus := "no"
	if system.TTY {
		ttyStatus = "yes"
	}
	sec.KeyValue("TTY", ttyStatus)
}

func (c *DoctorCommand) renderDoctorPrerequisitesSection(sec *ui.Section, prerequisites *doctorsvc.Prerequisites) {
	sec.Header("Prerequisites")
	defer c.out.Println("")

	if prerequisites == nil {
		sec.KeyValueStatus(false, "Status", "unknown")
		return
	}

	dotnetValue := prerequisites.DotnetValue
	if dotnetValue == "" {
		dotnetValue = unknownValue
	}
	if prerequisites.Dotnet.OK {
		sec.KeyValueStatus(true, ".NET SDK", dotnetValue)
	} else {
		msg := "not found"
		if dotnetValue != unknownValue {
			msg = dotnetValue + " (8.0+ required)"
		}
		sec.KeyValueStatus(false, ".NET SDK", msg)
	}

	containerValue := prerequisites.ContainerValue
	if containerValue == "" {
		containerValue = unknownValue
	}
	if prerequisites.Container.OK {
		sec.KeyValueStatus(true, "Container", containerValue)
	} else {
		sec.KeyValueStatus(false, "Container", "not found")
	}

	c.renderDoctorWindowsPrerequisite(sec, prerequisites)
}

func (c *DoctorCommand) renderDoctorWindowsPrerequisite(sec *ui.Section, prerequisites *doctorsvc.Prerequisites) {
	if prerequisites.Windows == nil {
		return
	}

	windowsValue := prerequisites.WindowsValue
	if windowsValue == "" {
		windowsValue = unknownValue
	}
	if prerequisites.Windows.OK {
		sec.KeyValueStatus(true, "Windows", windowsValue)
		return
	}

	msg := windowsValue
	if windowsValue != unknownValue {
		msg += " (1803+ required for Unix Domain Sockets)"
	}
	sec.KeyValueStatus(false, "Windows", msg)
}

func (c *DoctorCommand) renderDoctorNetworkSection(sec *ui.Section, network *doctorsvc.Network) {
	sec.Header("Network")
	defer c.out.Println("")

	if network == nil {
		sec.KeyValue("Status", unknownValue)
		return
	}

	if network.Mode == "cached" {
		c.renderDoctorCachedNetworkSection(sec, network)
		return
	}

	c.renderDoctorActiveNetworkSection(sec, network)
}

func (c *DoctorCommand) renderDoctorCachedNetworkSection(sec *ui.Section, network *doctorsvc.Network) {
	switch {
	case network.CacheExists != nil && !*network.CacheExists:
		sec.KeyValue("Host Gateway", "not cached")
		sec.KeyValue("Cache", fmt.Sprintf("missing (run '%s env up' to probe)", osutil.CurrentBin()))
	case network.HostGateway == "":
		sec.KeyValue("Host Gateway", "invalid")
		sec.KeyValue("Cache", "corrupted")
	default:
		sec.KeyValue("Host Gateway", network.HostGateway)
		if network.HostDNS != "" {
			sec.KeyValue("Host DNS", networking.LocalDomain+" -> "+network.HostDNS)
		} else {
			sec.KeyValue("Host DNS", networking.LocalDomain+" unresolvable")
		}
		sec.KeyValue("Cache", doctorCacheStateLabel(network))
	}
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

func (c *DoctorCommand) renderDoctorActiveNetworkSection(sec *ui.Section, network *doctorsvc.Network) {
	if network.Error != "" {
		sec.KeyValueStatus(false, "Host Gateway", network.Error)
		return
	}

	sec.KeyValueStatus(true, "Host Gateway", network.HostGateway)
	if network.PingOK != nil && *network.PingOK {
		sec.KeyValueStatus(true, "Connectivity", "ping ok")
	} else {
		sec.KeyValueStatus(false, "Connectivity", "ping failed")
	}

	if network.HostDNS != "" {
		sec.KeyValueStatus(true, "Host DNS", networking.LocalDomain+" -> "+network.HostDNS)
	} else {
		sec.KeyValueStatus(false, "Host DNS", networking.LocalDomain+" unresolvable")
	}

	if network.ContainerDNS != "" {
		sec.KeyValueStatus(true, "Container DNS", networking.LocalDomain+" -> "+network.ContainerDNS)
	} else {
		sec.KeyValueStatus(false, "Container DNS", networking.LocalDomain+" unresolvable")
	}
}

func (c *DoctorCommand) renderDoctorAuthSection(sec *ui.Section, authJSON *doctorsvc.Auth) {
	sec.Header("Auth")
	defer c.out.Println("")

	if authJSON == nil {
		sec.KeyValue("Status", unknownValue)
		return
	}
	if authJSON.Error != "" {
		sec.KeyValue("Status", authJSON.Error)
		return
	}
	if !authJSON.LoggedIn {
		sec.KeyValue("Status", "not logged in")
		return
	}

	sec.KeyValue("Status", "logged in ("+strconv.Itoa(len(authJSON.Environments))+" env)")
	for _, env := range authJSON.Environments {
		sec.KeyValue(env.Env, env.Username+" @ "+env.Host+" (PAT)")
	}
}

func (c *DoctorCommand) renderDoctorDiskSection(sec *ui.Section, disk *doctorsvc.Disk) {
	sec.Header("Disk")
	defer c.out.Println("")

	if disk == nil {
		sec.KeyValue("Status", unknownValue)
		return
	}

	diskKeyWidth := doctorKeyWidth
	for _, check := range disk.Checks {
		if idLen := len(check.ID); idLen > diskKeyWidth {
			diskKeyWidth = idLen
		}
	}
	diskSec := c.out.NewSection(diskKeyWidth)
	diskInfoSec := c.out.NewSection(diskKeyWidth + 2)

	for _, check := range disk.Checks {
		value := check.Message
		if check.Path != "" {
			value += " (" + check.Path + ")"
		}

		switch check.Level {
		case "ok":
			diskSec.KeyValueStatus(true, check.ID, value)
		case "info":
			diskInfoSec.KeyValue(check.ID, value)
		case "warn":
			diskSec.KeyValueStatus(false, check.ID, "WARN: "+value)
		case "error":
			diskSec.KeyValueStatus(false, check.ID, "ERROR: "+value)
		default:
			diskSec.KeyValue(check.ID, value)
		}
	}
}

func (c *DoctorCommand) renderDoctorAppSection(sec *ui.Section, app *doctorsvc.App) {
	sec.Header("App")
	defer c.out.Println("")

	if app == nil {
		sec.KeyValueStatus(false, "App", unknownValue)
		return
	}
	if app.Error != "" {
		sec.KeyValueStatus(false, "App", "error: "+app.Error)
		return
	}
	if !app.Found {
		sec.KeyValue("App", "not detected in current directory")
		return
	}

	sec.KeyValue("App found", app.Path)
	sec.KeyValue("Detected via", app.DetectedVia)
}
