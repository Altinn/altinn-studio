package cmd

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"time"

	"golang.org/x/term"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/studioctl/internal/appdetect"
	"altinn.studio/studioctl/internal/auth"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/networking"
	"altinn.studio/studioctl/internal/ui"
)

const (
	minDotnetMajorVersion = 8
	hoursPerDay           = 24
	unknownValue          = "unknown"
	doctorKeyWidth        = 14

	// minWindowsBuild is Windows 10 1803, first version with AF_UNIX support.
	minWindowsBuild = 17134

	// minWindowsVersionParts is the minimum number of parts in a Windows version string (major.minor.build).
	minWindowsVersionParts = 3

	// osWindows is the runtime.GOOS value for Windows.
	osWindows = "windows"
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
	return `Usage: studioctl doctor [options]

Diagnose the development environment and show any issues.

Options:
  -c, --checks   Run active checks (probe host gateway, validate connectivity)
  --json         Output as JSON
  -h             Show this help
`
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

	c.out.Println("studioctl doctor")
	c.out.Println("")

	sec := c.out.NewSection(doctorKeyWidth)
	var hasIssues bool

	// Section 1: CLI info
	c.printCLISection(sec)

	// Section 2: System info
	c.printSystemSection(ctx, sec)

	// Section 3: Prerequisites
	sec.Header("Prerequisites")
	if err := c.checkDotnet(ctx, sec); err != nil {
		hasIssues = true
	}
	if err := c.checkContainerRuntime(ctx, sec); err != nil {
		hasIssues = true
	}
	if runtime.GOOS == osWindows {
		if err := c.checkWindowsVersion(ctx, sec); err != nil {
			hasIssues = true
		}
	}
	c.out.Println("")

	// Section 4: Network
	c.printNetworkSection(ctx, sec, runChecks)

	// Section 5: Auth
	c.printAuthSection(sec)

	// Section 6: App detection
	sec.Header("App")
	if err := c.checkAppDetection(sec); err != nil {
		hasIssues = true
	}
	c.out.Println("")

	if hasIssues {
		c.out.Warning("Some issues were found. See above for details.")
		return nil
	}

	c.out.Success("All checks passed!")
	return nil
}

func (c *DoctorCommand) printCLISection(sec *ui.Section) {
	sec.Header("studioctl")
	sec.KeyValue("Version", c.cfg.Version)
	c.out.Println("")
}

func (c *DoctorCommand) printSystemSection(ctx context.Context, sec *ui.Section) {
	sec.Header("System")

	sec.KeyValue("OS", runtime.GOOS)
	sec.KeyValue("Architecture", runtime.GOARCH)

	// OS version details
	if osName, osVersion := getOSVersion(ctx); osName != "" || osVersion != "" {
		if osName != "" {
			sec.KeyValue("OS Name", osName)
		}
		if osVersion != "" {
			sec.KeyValue("OS Version", osVersion)
		}
	}

	termType := os.Getenv("TERM")
	if termType == "" {
		termType = unknownValue
	}
	sec.KeyValue("Terminal", termType)

	colorStatus := "disabled"
	if ui.Colors() {
		colorStatus = "enabled"
	}
	sec.KeyValue("Color", colorStatus)

	ttyStatus := "no"
	if term.IsTerminal(int(os.Stdout.Fd())) {
		ttyStatus = "yes"
	}
	sec.KeyValue("TTY", ttyStatus)

	c.out.Println("")
}

func (c *DoctorCommand) printNetworkSection(ctx context.Context, sec *ui.Section, runChecks bool) {
	sec.Header("Network")

	if runChecks {
		c.printNetworkRefresh(ctx, sec)
		return
	}

	c.printNetworkCached(sec)
}

func (c *DoctorCommand) printNetworkRefresh(ctx context.Context, sec *ui.Section) {
	client, err := container.Detect(ctx)
	if err != nil {
		sec.KeyValue("Host Gateway", "no container runtime: "+err.Error())
		c.out.Println("")
		return
	}
	defer func() {
		if cerr := client.Close(); cerr != nil {
			c.out.Debugf("failed to close container client: %v", cerr)
		}
	}()

	n := networking.NewNetworking(client, c.cfg, c.out)

	metadata, err := n.RefreshNetworkMetadata(ctx)
	if err != nil {
		sec.KeyValueStatus(false, "Host Gateway", "probe failed: "+err.Error())
		c.out.Println("")
		return
	}

	sec.KeyValueStatus(true, "Host Gateway", metadata.HostGateway)

	if metadata.PingOK {
		sec.KeyValueStatus(true, "Connectivity", "ping ok")
	} else {
		sec.KeyValueStatus(false, "Connectivity", "ping failed")
	}

	if metadata.HostDNS != "" {
		sec.KeyValueStatus(true, "Host DNS", networking.LocalDomain+" -> "+metadata.HostDNS)
	} else {
		sec.KeyValueStatus(false, "Host DNS", networking.LocalDomain+" unresolvable")
		c.out.Println("    Add to /etc/hosts: 127.0.0.1 " + networking.LocalDomain)
	}

	if metadata.LocalDNS != "" {
		sec.KeyValueStatus(true, "Container DNS", networking.LocalDomain+" -> "+metadata.LocalDNS)
	} else {
		sec.KeyValueStatus(false, "Container DNS", networking.LocalDomain+" unresolvable")
	}

	c.out.Println("")
}

func (c *DoctorCommand) printNetworkCached(sec *ui.Section) {
	status := networking.GetCacheStatus(c.cfg.Home)

	switch {
	case !status.Exists:
		sec.KeyValue("Host Gateway", "not cached")
		sec.KeyValue("Cache", "missing (run 'studioctl env up' to probe)")
	case status.IP == "":
		sec.KeyValue("Host Gateway", "invalid")
		sec.KeyValue("Cache", "corrupted")
	default:
		sec.KeyValue("Host Gateway", status.IP)

		if status.HostDNS != "" {
			sec.KeyValue("Host DNS", networking.LocalDomain+" -> "+status.HostDNS)
		} else {
			sec.KeyValue("Host DNS", networking.LocalDomain+" unresolvable")
		}

		ageStr := formatDuration(status.Age)
		if status.Fresh {
			sec.KeyValue("Cache", "fresh ("+ageStr+" ago)")
		} else {
			sec.KeyValue("Cache", "stale ("+ageStr+" ago)")
		}
	}

	c.out.Println("")
}

func (c *DoctorCommand) printAuthSection(sec *ui.Section) {
	sec.Header("Auth")

	creds, err := auth.LoadCredentials(c.cfg.Home)
	if err != nil {
		sec.KeyValue("Status", "error loading credentials: "+err.Error())
		c.out.Println("")
		return
	}

	envNames := creds.EnvNames()
	if len(envNames) == 0 {
		sec.KeyValue("Status", "not logged in")
		c.out.Println("")
		return
	}

	sec.KeyValue("Status", "logged in ("+strconv.Itoa(len(envNames))+" env)")

	for _, env := range envNames {
		envCreds, err := creds.Get(env)
		if err != nil {
			continue
		}

		// Format: "env: username @ host (PAT)"
		info := envCreds.Username + " @ " + envCreds.Host + " (PAT)"
		sec.KeyValue(env, info)
	}

	c.out.Println("")
}

func (c *DoctorCommand) checkDotnet(ctx context.Context, sec *ui.Section) error {
	output, err := exec.CommandContext(ctx, "dotnet", "--version").Output()
	if err != nil {
		sec.KeyValueStatus(false, ".NET SDK", "not found")
		c.out.Println("    Install from: https://dotnet.microsoft.com/download")
		return fmt.Errorf("checking dotnet version: %w", err)
	}

	version := strings.TrimSpace(string(output))
	major := extractMajorVersion(version)

	if major < minDotnetMajorVersion {
		sec.KeyValueStatus(false, ".NET SDK", version+" (8.0+ required)")
		return ErrDotnetVersionTooOld
	}

	sec.KeyValueStatus(true, ".NET SDK", version)
	return nil
}

func (c *DoctorCommand) checkContainerRuntime(ctx context.Context, sec *ui.Section) error {
	// Try docker first
	if err := exec.CommandContext(ctx, "docker", "info").Run(); err == nil {
		version := unknownValue
		if output, err := exec.CommandContext(ctx, "docker", "--version").Output(); err == nil {
			version = extractVersionFromOutput(strings.TrimSpace(string(output)))
		} else {
			c.out.Debugf("docker --version failed: %v", err)
		}
		sec.KeyValueStatus(true, "Container", "Docker ("+version+")")
		return nil
	}

	// Try podman
	if err := exec.CommandContext(ctx, "podman", "info").Run(); err == nil {
		version := unknownValue
		if output, err := exec.CommandContext(ctx, "podman", "--version").Output(); err == nil {
			version = extractVersionFromOutput(strings.TrimSpace(string(output)))
		} else {
			c.out.Debugf("podman --version failed: %v", err)
		}
		sec.KeyValueStatus(true, "Container", "Podman ("+version+")")
		return nil
	}

	sec.KeyValueStatus(false, "Container", "not found")
	c.out.Println("    Install Docker: https://docs.docker.com/get-docker/")
	c.out.Println("    Or Podman: https://podman.io/getting-started/installation")
	return ErrNoContainerRuntime
}

func (c *DoctorCommand) checkWindowsVersion(ctx context.Context, sec *ui.Section) error {
	_, osVersion := getWindowsVersion(ctx)
	if osVersion == "" {
		sec.KeyValueStatus(false, "Windows", "unable to detect version")
		return ErrWindowsVersionUnknown
	}

	build := extractWindowsBuild(osVersion)
	if build < minWindowsBuild {
		sec.KeyValueStatus(false, "Windows", osVersion+" (1803+ required for Unix Domain Sockets)")
		return ErrWindowsVersionTooOld
	}

	sec.KeyValueStatus(true, "Windows", osVersion)
	return nil
}

// extractWindowsBuild extracts the build number from a Windows version string.
// Input format: "10.0.17134.xxx" or "10.0.22631.4890".
// Returns 0 if parsing fails.
func extractWindowsBuild(version string) int {
	parts := strings.Split(version, ".")
	if len(parts) < minWindowsVersionParts {
		return 0
	}
	build, err := strconv.Atoi(parts[2])
	if err != nil {
		return 0
	}
	return build
}

func (c *DoctorCommand) checkAppDetection(sec *ui.Section) error {
	detector := appdetect.NewDetector()
	result, err := detector.DetectFromCwd("")
	if err != nil {
		if errors.Is(err, appdetect.ErrNotFound) {
			sec.KeyValue("App", "not detected in current directory")
			return nil
		}
		sec.KeyValueStatus(false, "App", "error: "+err.Error())
		return fmt.Errorf("detecting app: %w", err)
	}

	sec.KeyValue("App found", result.Path)
	sec.KeyValue("Detected via", result.DetectedFrom.String())
	return nil
}

// formatDuration formats a duration in human-readable form.
func formatDuration(d time.Duration) string {
	if d >= hoursPerDay*time.Hour {
		days := int(d / (hoursPerDay * time.Hour))
		return strconv.Itoa(days) + "d"
	}
	if d >= time.Hour {
		hours := int(d / time.Hour)
		return strconv.Itoa(hours) + "h"
	}
	if d >= time.Minute {
		minutes := int(d / time.Minute)
		return strconv.Itoa(minutes) + "m"
	}
	return "<1m"
}

func extractMajorVersion(version string) int {
	parts := strings.Split(version, ".")
	if len(parts) == 0 {
		return 0
	}
	major, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0
	}
	return major
}

func extractVersionFromOutput(output string) string {
	// Handle "Docker version 24.0.7, build afdd53b" or "podman version 4.9.0"
	parts := strings.Fields(output)
	for i, part := range parts {
		if part == "version" && i+1 < len(parts) {
			return strings.TrimSuffix(parts[i+1], ",")
		}
	}
	return output
}

// getOSVersion returns the OS name and version.
func getOSVersion(ctx context.Context) (osName, osVersion string) {
	switch runtime.GOOS {
	case "linux":
		return getLinuxVersion(ctx)
	case "darwin":
		return getDarwinVersion(ctx)
	case osWindows:
		return getWindowsVersion(ctx)
	default:
		return "", ""
	}
}

func getLinuxVersion(ctx context.Context) (osName, osVersion string) {
	// Get distribution name from /etc/os-release
	data, err := os.ReadFile("/etc/os-release")
	if err == nil {
		for line := range strings.SplitSeq(string(data), "\n") {
			if value, found := strings.CutPrefix(line, "PRETTY_NAME="); found {
				osName = strings.Trim(value, "\"")
				break
			}
		}
	}

	// Get version (kernel) using uname -r
	output, err := exec.CommandContext(ctx, "uname", "-r").Output()
	if err == nil {
		osVersion = strings.TrimSpace(string(output))
	}

	return osName, osVersion
}

func getDarwinVersion(ctx context.Context) (osName, osVersion string) {
	// Get macOS product version
	output, err := exec.CommandContext(ctx, "sw_vers", "-productVersion").Output()
	if err == nil {
		osVersion = strings.TrimSpace(string(output))
	}

	// Get macOS product name (e.g., "macOS")
	output, err = exec.CommandContext(ctx, "sw_vers", "-productName").Output()
	if err == nil {
		osName = strings.TrimSpace(string(output))
	}

	return osName, osVersion
}

func getWindowsVersion(ctx context.Context) (osName, osVersion string) {
	// Get Windows version using ver command (e.g., "Microsoft Windows [Version 10.0.22631.4890]")
	output, err := exec.CommandContext(ctx, "cmd", "/c", "ver").Output()
	if err != nil {
		return "", ""
	}

	ver := strings.TrimSpace(string(output))
	osName, osVersion = parseWindowsVersion(ver)
	return osName, osVersion
}

// parseWindowsVersion extracts name and version from Windows ver output.
// Input: "Microsoft Windows [Version 10.0.22631.4890]".
// Output: "Microsoft Windows", "10.0.22631.4890".
func parseWindowsVersion(ver string) (osName, osVersion string) {
	bracketStart := strings.Index(ver, "[")
	bracketEnd := strings.Index(ver, "]")

	if bracketStart > 0 {
		osName = strings.TrimSpace(ver[:bracketStart])
	}
	if bracketStart != -1 && bracketEnd > bracketStart {
		osVersion = strings.TrimPrefix(ver[bracketStart+1:bracketEnd], "Version ")
	}

	return osName, osVersion
}
