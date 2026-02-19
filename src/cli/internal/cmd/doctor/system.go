package doctor

import (
	"context"
	"os"
	"os/exec"
	"runtime"
	"strings"

	"golang.org/x/term"
)

func buildSystem(ctx context.Context) *System {
	system := &System{
		OS:           runtime.GOOS,
		Architecture: runtime.GOARCH,
		OSName:       "",
		OSVersion:    "",
		Terminal:     os.Getenv("TERM"),
		ColorEnabled: os.Getenv("NO_COLOR") == "",
		TTY:          term.IsTerminal(int(os.Stdout.Fd())),
	}

	if system.Terminal == "" {
		system.Terminal = unknownValue
	}

	if osName, osVersion := getOSVersion(ctx); osName != "" || osVersion != "" {
		system.OSName = osName
		system.OSVersion = osVersion
	}

	return system
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
