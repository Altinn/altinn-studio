package localtest

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"slices"
	"strings"
	"time"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/studioctl/internal/cmd/env/localtest/components"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/osutil"
)

const (
	diagnosticProbeTimeout = 2 * time.Second
	diagnosticBodyLimit    = 4 << 10

	// DiagnosticLevelOK means the diagnostic passed.
	DiagnosticLevelOK = "ok"

	// DiagnosticLevelInfo means the diagnostic is informational.
	DiagnosticLevelInfo = "info"

	// DiagnosticLevelWarn means the diagnostic found a warning.
	DiagnosticLevelWarn = "warn"

	// DiagnosticLevelError means the diagnostic found an error.
	DiagnosticLevelError = "error"
)

// DiagnosticOptions configures localtest diagnostics.
type DiagnosticOptions struct {
	DetectContainer func(ctx context.Context) (container.ContainerClient, error)
	ResolveHost     func(ctx context.Context, host string) ([]string, error)
	HTTPGet         func(ctx context.Context, url string) (DiagnosticHTTPResponse, error)
	DialTCP         func(ctx context.Context, network, address string) error
	IPv6Enabled     func() bool
	Debugf          func(format string, args ...any)
	Topology        envtopology.Local
}

// DiagnosticReport contains diagnostics for the localtest environment.
type DiagnosticReport struct {
	Services  []DiagnosticService `json:"services"`
	HasIssues bool                `json:"hasIssues"`
	Running   bool                `json:"running"`
}

// DiagnosticService contains diagnostics for one localtest service.
type DiagnosticService struct {
	Name      string            `json:"name"`
	Container string            `json:"container"`
	Host      string            `json:"host,omitempty"`
	Checks    []DiagnosticCheck `json:"checks"`
	Running   bool              `json:"running"`
}

// DiagnosticCheck is one localtest environment diagnostic.
type DiagnosticCheck struct {
	ID      string `json:"id"`
	Label   string `json:"label"`
	Level   string `json:"level"`
	Message string `json:"message"`
	URL     string `json:"url,omitempty"`
}

// DiagnosticHTTPResponse is the minimal HTTP response data used by diagnostics.
type DiagnosticHTTPResponse struct {
	Body       string
	Status     string
	StatusCode int
}

type diagnosticHTTPProbe struct {
	ID    string
	Label string
	Path  string
	Host  string
	Port  string
}

type diagnosticTCPProbe struct {
	ID      string
	Label   string
	Address string
	Network string
}

// Diagnose checks the externally visible localtest environment.
func Diagnose(ctx context.Context, opts DiagnosticOptions) *DiagnosticReport {
	opts = normalizeDiagnosticOptions(opts)
	ipv6Enabled := opts.IPv6Enabled()
	serviceDefs := diagnosticServiceDefinitions(opts.Topology)
	services := make([]DiagnosticService, 0, len(serviceDefs))

	containerStates := checkDiagnosticContainerStates(ctx, opts, serviceDefs)
	localtestRunning := containerStates[components.ContainerLocaltest].Running
	for _, def := range serviceDefs {
		state := containerStates[def.Container]
		service := DiagnosticService{
			Checks:    make([]DiagnosticCheck, 0, 2+len(def.HTTPProbes)),
			Name:      def.Name,
			Container: def.Container,
			Host:      def.Host,
			Running:   state.Running,
		}
		if state.Check != nil {
			service.Checks = append(service.Checks, *state.Check)
		}
		hostHasLoopbackIPv6 := false
		if def.Host != "" {
			dnsCheck, hasLoopbackIPv6 := checkDiagnosticDNS(ctx, opts, def.Host)
			service.Checks = append(service.Checks, dnsCheck)
			hostHasLoopbackIPv6 = hasLoopbackIPv6
		}
		if localtestRunning && state.Running {
			tcpProbes := def.TCPProbes
			if def.Container == components.ContainerLocaltest && ipv6Enabled && hostHasLoopbackIPv6 {
				tcpProbes = append(tcpProbes, localtestIPv6TCPProbes(opts.Topology)...)
			}
			service.Checks = append(service.Checks, checkDiagnosticTCP(ctx, opts, tcpProbes)...)
			service.Checks = append(service.Checks, checkDiagnosticHTTP(ctx, opts, def)...)
		}
		services = append(services, service)
	}

	return &DiagnosticReport{
		Services:  services,
		HasIssues: diagnosticsHaveIssues(services),
		Running:   localtestRunning,
	}
}

type diagnosticServiceDefinition struct {
	Name       string
	Container  string
	Host       string
	HTTPProbes []diagnosticHTTPProbe
	TCPProbes  []diagnosticTCPProbe
}

type diagnosticContainerState struct {
	Check   *DiagnosticCheck
	Running bool
}

func diagnosticServiceDefinitions(topology envtopology.Local) []diagnosticServiceDefinition {
	app := topology.MustComponent(envtopology.ComponentApp)
	pdf := topology.MustComponent(envtopology.ComponentPDF)
	workflowEngine := topology.MustComponent(envtopology.ComponentWorkflowEngine)

	services := []diagnosticServiceDefinition{
		{
			Name:       "localtest",
			Container:  components.ContainerLocaltest,
			Host:       app.Host(),
			HTTPProbes: localtestHTTPProbes(topology),
			TCPProbes:  localtestTCPProbes(topology),
		},
		{
			Name:      "pdf",
			Container: components.ContainerPDF3,
			Host:      pdf.Host(),
			HTTPProbes: []diagnosticHTTPProbe{
				{ID: "pdf_health", Label: "HTTP: health", Path: "/health/ready", Host: "", Port: ""},
			},
			TCPProbes: nil,
		},
		{
			Name:      "workflow-engine",
			Container: components.ContainerWorkflowEngine,
			Host:      workflowEngine.Host(),
			HTTPProbes: []diagnosticHTTPProbe{
				{ID: "workflow_health", Label: "HTTP: health", Path: "/api/v1/health/ready", Host: "", Port: ""},
			},
			TCPProbes: nil,
		},
	}
	return services
}

func localtestHTTPProbes(topology envtopology.Local) []diagnosticHTTPProbe {
	return []diagnosticHTTPProbe{
		{
			ID:    "localtest_version_" + topology.IngressPort(),
			Label: "HTTP: " + topology.IngressPort() + " version",
			Path:  "/Home/Localtest/Version",
			Host:  "",
			Port:  "",
		},
		{
			ID:    "localtest_health_" + topology.IngressPort(),
			Label: "HTTP: " + topology.IngressPort(),
			Path:  "/health",
			Host:  "",
			Port:  "",
		},
		{
			ID:    "localtest_health_" + components.LocaltestServicePort,
			Label: "HTTP: " + components.LocaltestServicePort,
			Host:  "127.0.0.1",
			Port:  components.LocaltestServicePort,
			Path:  "/health",
		},
	}
}

func localtestTCPProbes(topology envtopology.Local) []diagnosticTCPProbe {
	return []diagnosticTCPProbe{
		newDiagnosticTCPProbe(
			"tcp_"+topology.IngressPort()+"_ipv4",
			"TCP: "+topology.IngressPort()+" IPv4",
			"tcp4",
			"127.0.0.1",
			topology.IngressPort(),
		),
		newDiagnosticTCPProbe(
			"tcp_"+components.LocaltestServicePort+"_ipv4",
			"TCP: "+components.LocaltestServicePort+" IPv4",
			"tcp4",
			"127.0.0.1",
			components.LocaltestServicePort,
		),
	}
}

func localtestIPv6TCPProbes(topology envtopology.Local) []diagnosticTCPProbe {
	return []diagnosticTCPProbe{
		newDiagnosticTCPProbe(
			"tcp_"+topology.IngressPort()+"_ipv6",
			"TCP: "+topology.IngressPort()+" IPv6",
			"tcp6",
			"::1",
			topology.IngressPort(),
		),
		newDiagnosticTCPProbe(
			"tcp_"+components.LocaltestServicePort+"_ipv6",
			"TCP: "+components.LocaltestServicePort+" IPv6",
			"tcp6",
			"::1",
			components.LocaltestServicePort,
		),
	}
}

func newDiagnosticTCPProbe(id, label, network, host, port string) diagnosticTCPProbe {
	return diagnosticTCPProbe{
		ID:      id,
		Label:   label,
		Network: network,
		Address: net.JoinHostPort(host, port),
	}
}

func normalizeDiagnosticOptions(opts DiagnosticOptions) DiagnosticOptions {
	if opts.Topology.IsZero() {
		opts.Topology = envtopology.NewLocal(envtopology.DefaultIngressPortString())
	}
	if opts.DetectContainer == nil {
		opts.DetectContainer = container.Detect
	}
	if opts.ResolveHost == nil {
		opts.ResolveHost = defaultDiagnosticResolveHost
	}
	if opts.HTTPGet == nil {
		opts.HTTPGet = defaultDiagnosticHTTPGet
	}
	if opts.DialTCP == nil {
		opts.DialTCP = defaultDiagnosticDialTCP
	}
	if opts.IPv6Enabled == nil {
		opts.IPv6Enabled = osutil.IPv6Enabled
	}
	if opts.Debugf == nil {
		opts.Debugf = func(string, ...any) {}
	}
	return opts
}

func checkDiagnosticContainerStates(
	ctx context.Context,
	opts DiagnosticOptions,
	serviceDefs []diagnosticServiceDefinition,
) map[string]diagnosticContainerState {
	states := make(map[string]diagnosticContainerState, len(serviceDefs))
	client, err := opts.DetectContainer(ctx)
	if err != nil {
		for _, def := range serviceDefs {
			states[def.Container] = diagnosticContainerState{
				Check: newDiagnosticCheckPtr(
					"container",
					"Container",
					DiagnosticLevelWarn,
					"runtime unavailable: "+err.Error(),
				),
				Running: false,
			}
		}
		return states
	}
	defer func() {
		if closeErr := client.Close(); closeErr != nil {
			opts.Debugf("container client close failed: %v", closeErr)
		}
	}()

	for _, def := range serviceDefs {
		state, err := client.ContainerState(ctx, def.Container)
		if err != nil {
			if errors.Is(err, types.ErrContainerNotFound) {
				states[def.Container] = diagnosticContainerState{
					Check:   nil,
					Running: false,
				}
				continue
			}
			states[def.Container] = diagnosticContainerState{
				Check: newDiagnosticCheckPtr(
					"container",
					"Container",
					DiagnosticLevelWarn,
					"state unavailable: "+err.Error(),
				),
				Running: false,
			}
			continue
		}

		if !state.Running {
			states[def.Container] = diagnosticContainerState{
				Check:   nil,
				Running: false,
			}
			continue
		}
		message := state.Status
		if state.HealthStatus != "" {
			message += " (" + state.HealthStatus + ")"
		}
		states[def.Container] = diagnosticContainerState{
			Check:   newDiagnosticCheckPtr("container", "Container", DiagnosticLevelOK, message),
			Running: state.Running,
		}
	}
	return states
}

func checkDiagnosticDNS(ctx context.Context, opts DiagnosticOptions, host string) (DiagnosticCheck, bool) {
	lookupCtx, cancel := context.WithTimeout(ctx, diagnosticProbeTimeout)
	addresses, err := opts.ResolveHost(lookupCtx, host)
	cancel()
	if err != nil {
		return newDiagnosticCheck("dns", "DNS:", DiagnosticLevelError, "resolve failed: "+err.Error()), false
	}
	slices.Sort(addresses)
	message := host + " -> " + summarizeDNSAddresses(addresses)
	hasLoopbackIPv6 := anyLoopbackIPv6(addresses)
	if !allLoopback(addresses) {
		return newDiagnosticCheck(
			"dns",
			"DNS:",
			DiagnosticLevelError,
			"does not resolve to loopback: "+message,
		), false
	}
	return newDiagnosticCheck("dns", "DNS:", DiagnosticLevelOK, message), hasLoopbackIPv6
}

func checkDiagnosticTCP(
	ctx context.Context,
	opts DiagnosticOptions,
	probes []diagnosticTCPProbe,
) []DiagnosticCheck {
	checks := make([]DiagnosticCheck, 0, len(probes))
	for _, probe := range probes {
		checks = append(checks, checkDiagnosticTCPProbe(ctx, opts, probe))
	}
	return checks
}

func checkDiagnosticTCPProbe(
	ctx context.Context,
	opts DiagnosticOptions,
	probe diagnosticTCPProbe,
) DiagnosticCheck {
	reqCtx, cancel := context.WithTimeout(ctx, diagnosticProbeTimeout)
	err := opts.DialTCP(reqCtx, probe.Network, probe.Address)
	cancel()
	if err != nil {
		return newDiagnosticCheck(probe.ID, probe.Label, DiagnosticLevelError, "unreachable ("+err.Error()+")")
	}
	return newDiagnosticCheck(probe.ID, probe.Label, DiagnosticLevelOK, "reachable ("+probe.Address+")")
}

func checkDiagnosticHTTP(
	ctx context.Context,
	opts DiagnosticOptions,
	service diagnosticServiceDefinition,
) []DiagnosticCheck {
	checks := make([]DiagnosticCheck, 0, len(service.HTTPProbes))
	for _, probe := range service.HTTPProbes {
		checks = append(checks, checkDiagnosticHTTPProbe(ctx, opts, service.Host, probe))
	}
	return checks
}

func checkDiagnosticHTTPProbe(
	ctx context.Context,
	opts DiagnosticOptions,
	host string,
	probe diagnosticHTTPProbe,
) DiagnosticCheck {
	url := diagnosticURL(
		diagnosticHTTPProbeHost(host, probe),
		diagnosticHTTPProbePort(opts.Topology, probe),
		probe.Path,
	)
	reqCtx, cancel := context.WithTimeout(ctx, diagnosticProbeTimeout)
	resp, err := opts.HTTPGet(reqCtx, url)
	cancel()
	if err != nil {
		check := newDiagnosticCheck(probe.ID, probe.Label, DiagnosticLevelError, "request failed: "+err.Error())
		check.URL = url
		return check
	}
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusBadRequest {
		check := newDiagnosticCheck(probe.ID, probe.Label, DiagnosticLevelError, resp.Status)
		check.URL = url
		return check
	}

	message := resp.Status
	if strings.Contains(probe.ID, "localtest_version") && strings.TrimSpace(resp.Body) != "" {
		message += " (version " + strings.TrimSpace(resp.Body) + ")"
	}
	check := newDiagnosticCheck(probe.ID, probe.Label, DiagnosticLevelOK, message)
	check.URL = url
	return check
}

func diagnosticHTTPProbeHost(defaultHost string, probe diagnosticHTTPProbe) string {
	if probe.Host != "" {
		return probe.Host
	}
	return defaultHost
}

func diagnosticHTTPProbePort(topology envtopology.Local, probe diagnosticHTTPProbe) string {
	if probe.Port != "" {
		return probe.Port
	}
	return topology.IngressPort()
}

func diagnosticURL(host, port, path string) string {
	return "http://" + net.JoinHostPort(host, port) + path
}

func diagnosticsHaveIssues(services []DiagnosticService) bool {
	for _, service := range services {
		for _, check := range service.Checks {
			if check.Level == DiagnosticLevelWarn || check.Level == DiagnosticLevelError {
				return true
			}
		}
	}
	return false
}

func defaultDiagnosticResolveHost(ctx context.Context, host string) ([]string, error) {
	addresses, err := net.DefaultResolver.LookupHost(ctx, host)
	if err != nil {
		return nil, fmt.Errorf("lookup host %q: %w", host, err)
	}
	return addresses, nil
}

func defaultDiagnosticHTTPGet(ctx context.Context, url string) (DiagnosticHTTPResponse, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return DiagnosticHTTPResponse{}, fmt.Errorf("build request: %w", err)
	}

	client := &http.Client{Transport: diagnosticHTTPTransport()}
	resp, err := client.Do(req)
	if err != nil {
		return DiagnosticHTTPResponse{}, fmt.Errorf("send request: %w", err)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, diagnosticBodyLimit))
	if err != nil {
		if closeErr := resp.Body.Close(); closeErr != nil {
			return DiagnosticHTTPResponse{}, fmt.Errorf("read response: %w; close response: %w", err, closeErr)
		}
		return DiagnosticHTTPResponse{}, fmt.Errorf("read response: %w", err)
	}
	if closeErr := resp.Body.Close(); closeErr != nil {
		return DiagnosticHTTPResponse{}, fmt.Errorf("close response: %w", closeErr)
	}
	return DiagnosticHTTPResponse{
		Body:       string(body),
		Status:     resp.Status,
		StatusCode: resp.StatusCode,
	}, nil
}

func defaultDiagnosticDialTCP(ctx context.Context, network, address string) error {
	var dialer net.Dialer
	conn, err := dialer.DialContext(ctx, network, address)
	if err != nil {
		return fmt.Errorf("dial %s %s: %w", network, address, err)
	}
	if closeErr := conn.Close(); closeErr != nil {
		return fmt.Errorf("close %s %s: %w", network, address, closeErr)
	}
	return nil
}

func diagnosticHTTPTransport() http.RoundTripper {
	defaultTransport, ok := http.DefaultTransport.(*http.Transport)
	if !ok {
		return http.DefaultTransport
	}
	transport := defaultTransport.Clone()
	transport.Proxy = nil
	return transport
}

func newDiagnosticCheck(id, label, level, message string) DiagnosticCheck {
	return DiagnosticCheck{
		ID:      id,
		Label:   label,
		Level:   level,
		Message: message,
		URL:     "",
	}
}

func newDiagnosticCheckPtr(id, label, level, message string) *DiagnosticCheck {
	check := newDiagnosticCheck(id, label, level, message)
	return &check
}

func allLoopback(addresses []string) bool {
	if len(addresses) == 0 {
		return false
	}
	for _, address := range addresses {
		ip := net.ParseIP(address)
		if ip == nil || !ip.IsLoopback() {
			return false
		}
	}
	return true
}

func anyLoopbackIPv6(addresses []string) bool {
	for _, address := range addresses {
		ip := net.ParseIP(address)
		if ip != nil && ip.To4() == nil && ip.IsLoopback() {
			return true
		}
	}
	return false
}

func summarizeDNSAddresses(addresses []string) string {
	if len(addresses) == 0 {
		return "no records"
	}
	ipv4 := make([]string, 0, len(addresses))
	ipv6 := make([]string, 0, len(addresses))
	other := make([]string, 0)
	for _, address := range addresses {
		ip := net.ParseIP(address)
		switch {
		case ip == nil:
			other = append(other, address)
		case ip.To4() != nil:
			ipv4 = append(ipv4, address)
		default:
			ipv6 = append(ipv6, address)
		}
	}

	parts := make([]string, 0, 3)
	if len(ipv4) > 0 {
		parts = append(parts, "A "+strings.Join(ipv4, ", "))
	}
	if len(ipv6) > 0 {
		parts = append(parts, "AAAA "+strings.Join(ipv6, ", "))
	}
	if len(other) > 0 {
		parts = append(parts, "other "+strings.Join(other, ", "))
	}
	return strings.Join(parts, "; ")
}
