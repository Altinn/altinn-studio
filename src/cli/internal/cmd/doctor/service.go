// Package doctor contains command-specific doctor application logic.
package doctor

import (
	"context"
	"errors"
	"fmt"
	"sort"

	"altinn.studio/studioctl/internal/auth"
	"altinn.studio/studioctl/internal/config"
	repocontext "altinn.studio/studioctl/internal/context"
)

const (
	minDotnetMajorVersion = 8
	hoursPerDay           = 24
	unknownValue          = "unknown"

	// minWindowsBuild is Windows 10 1803, first version with AF_UNIX support.
	minWindowsBuild = 17134

	// minWindowsVersionParts is the minimum number of parts in a Windows version string (major.minor.build).
	minWindowsVersionParts = 3

	// osWindows is the runtime.GOOS value for Windows.
	osWindows = "windows"

	// On-disk state file names used by CLI components.
	doctorConfigFileName       = "config.yaml"
	doctorNetworkCacheFileName = "network-metadata.yaml"
	doctorResourcesPlatformDir = "AltinnPlatformLocal"

	// Disk check levels.
	diskLevelOK    = "ok"
	diskLevelInfo  = "info"
	diskLevelWarn  = "warn"
	diskLevelError = "error"

	networkModeChecks = "checks"
)

var (
	errDotnetVersionTooOld = errors.New("dotnet version too old")
	errNoContainerRuntime  = errors.New("no container runtime found")
	errWindowsVersionOld   = errors.New("windows version too old")
	errWindowsVersionUnk   = errors.New("windows version unknown")
)

type diskLevelRank uint8

const (
	diskRankInfo diskLevelRank = iota
	diskRankOK
	diskRankWarn
	diskRankError
)

// Service contains doctor application logic.
type Service struct {
	cfg    *config.Config
	debugf func(format string, args ...any)
}

// Report is the doctor application-layer output model.
type Report struct {
	CLI           *CLI           `json:"cli"`
	Prerequisites *Prerequisites `json:"prerequisites"`
	Network       *Network       `json:"network"`
	Auth          *Auth          `json:"auth"`
	App           *App           `json:"app"`
	Disk          *Disk          `json:"disk"`
	System        *System        `json:"system"`
}

// CLI contains CLI version metadata for doctor output.
type CLI struct {
	Version string `json:"version"`
}

// System contains environment and terminal metadata for doctor output.
type System struct {
	OS           string `json:"os"`
	Architecture string `json:"architecture"`
	OSName       string `json:"osName,omitempty"`
	OSVersion    string `json:"osVersion,omitempty"`
	Terminal     string `json:"terminal"`
	ColorEnabled bool   `json:"colorEnabled"`
	TTY          bool   `json:"tty"`
}

// Check represents a boolean check result with optional error text.
type Check struct {
	Error string `json:"error,omitempty"`
	OK    bool   `json:"ok"`
}

// Prerequisites contains prerequisite check details.
type Prerequisites struct {
	DotnetValue    string `json:"-"`
	ContainerValue string `json:"-"`
	WindowsValue   string `json:"-"`
	Windows        *Check `json:"windows,omitempty"`
	Dotnet         Check  `json:"dotnet"`
	Container      Check  `json:"container"`
}

// Network contains network diagnostics and cache/probe data.
type Network struct {
	Mode         string `json:"mode"`
	HostGateway  string `json:"hostGateway,omitempty"`
	HostDNS      string `json:"hostDns,omitempty"`
	ContainerDNS string `json:"containerDns,omitempty"`
	PingOK       *bool  `json:"pingOk,omitempty"`
	CacheExists  *bool  `json:"cacheExists,omitempty"`
	CacheFresh   *bool  `json:"cacheFresh,omitempty"`
	CacheAge     string `json:"cacheAge,omitempty"`
	Error        string `json:"error,omitempty"`
}

// Auth contains authentication status summary for configured environments.
type Auth struct {
	Error        string    `json:"error,omitempty"`
	Environments []AuthEnv `json:"environments"`
	LoggedIn     bool      `json:"loggedIn"`
}

// AuthEnv contains credential summary for one environment.
type AuthEnv struct {
	Env      string `json:"env"`
	Host     string `json:"host"`
	Username string `json:"username"`
}

// App contains app detection result for the current working directory.
type App struct {
	Path        string `json:"path,omitempty"`
	DetectedVia string `json:"detectedVia,omitempty"`
	Error       string `json:"error,omitempty"`
	Found       bool   `json:"found"`
}

// Disk contains filesystem and local state validation results.
type Disk struct {
	Checks    []DiskCheck `json:"checks"`
	HasIssues bool        `json:"hasIssues"`
}

// DiskCheck is one disk/state check entry.
type DiskCheck struct {
	ID      string `json:"id"`
	Level   string `json:"level"`
	Path    string `json:"path,omitempty"`
	Message string `json:"message"`
}

// New creates a new doctor service.
func New(cfg *config.Config, debugf func(format string, args ...any)) *Service {
	if debugf == nil {
		debugf = func(string, ...any) {}
	}
	return &Service{cfg: cfg, debugf: debugf}
}

// BuildReport builds a doctor report from system state.
func (s *Service) BuildReport(ctx context.Context, runChecks bool) Report {
	return Report{
		CLI:           &CLI{Version: s.cfg.Version},
		System:        buildSystem(ctx),
		Prerequisites: s.collectPrerequisites(ctx),
		Network:       s.buildNetwork(ctx, runChecks),
		Auth:          s.buildAuth(),
		App:           s.buildApp(ctx),
		Disk:          s.buildDisk(),
	}
}

// HasIssues reports whether the report indicates actionable problems.
func (s *Service) HasIssues(report Report) bool {
	if report.Prerequisites == nil {
		return true
	}
	if !report.Prerequisites.Dotnet.OK || !report.Prerequisites.Container.OK {
		return true
	}
	if report.Prerequisites.Windows != nil && !report.Prerequisites.Windows.OK {
		return true
	}
	if report.App == nil {
		return true
	}
	if report.App.Error != "" {
		return true
	}
	return report.Disk != nil && report.Disk.HasIssues
}

func (s *Service) buildAuth() *Auth {
	var authReport Auth
	authReport.Environments = []AuthEnv{}

	creds, err := auth.LoadCredentials(s.cfg.Home)
	if err != nil {
		authReport.Error = fmt.Sprintf("error loading credentials: %v", err)
		return &authReport
	}

	envNames := creds.EnvNames()
	sort.Strings(envNames)
	envs := make([]AuthEnv, 0, len(envNames))
	for _, env := range envNames {
		envCreds, err := creds.Get(env)
		if err != nil {
			continue
		}
		envs = append(envs, AuthEnv{
			Env:      env,
			Host:     envCreds.Host,
			Username: envCreds.Username,
		})
	}

	authReport.Environments = envs
	authReport.LoggedIn = len(envs) > 0
	return &authReport
}

func (s *Service) buildApp(ctx context.Context) *App {
	var appReport App

	result, err := repocontext.DetectFromCwd(ctx, "")
	if err != nil {
		appReport.Error = fmt.Sprintf("detecting app: %v", err)
		return &appReport
	}
	if !result.InAppRepo {
		return &appReport
	}

	appReport.Found = true
	appReport.Path = result.AppRoot
	appReport.DetectedVia = result.AppDetectedFrom.String()
	return &appReport
}

func errorString(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}
