package localtest_test

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/container"
	containermock "altinn.studio/devenv/pkg/container/mock"
	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/studioctl/internal/cmd/env/localtest"
	"altinn.studio/studioctl/internal/cmd/env/localtest/components"
	"altinn.studio/studioctl/internal/envtopology"
)

var (
	errUnexpectedDiagnosticContainer = errors.New("unexpected container")
	errUnexpectedDiagnosticURL       = errors.New("unexpected url")
)

func TestDiagnoseRunsDNSWhenLocaltestIsStopped(t *testing.T) {
	httpCalled := false
	tcpCalled := false
	opts := newDiagnosticTestOptions(
		t,
		func(context.Context, string) (localtest.DiagnosticHTTPResponse, error) {
			httpCalled = true
			return localtest.DiagnosticHTTPResponse{}, nil
		},
		func(context.Context) (container.ContainerClient, error) {
			client := containermock.New()
			client.ContainerStateFunc = func(context.Context, string) (types.ContainerState, error) {
				return types.ContainerState{}, types.ErrContainerNotFound
			}
			return client, nil
		},
	)
	opts.DialTCP = func(context.Context, string, string) error {
		tcpCalled = true
		return nil
	}
	report := localtest.Diagnose(t.Context(), opts)

	if report.Running {
		t.Fatal("Diagnose() Running = true, want false")
	}
	if report.HasIssues {
		t.Fatal("Diagnose() HasIssues = true, want false")
	}
	if httpCalled {
		t.Fatal("Diagnose() called HTTP probes while localtest was stopped")
	}
	if tcpCalled {
		t.Fatal("Diagnose() called TCP probes while localtest was stopped")
	}
	assertDiagnosticCheckMissing(t, report, "localtest", "container")
	assertDiagnosticCheck(t, report, "localtest", "dns", localtest.DiagnosticLevelOK)
}

func TestDiagnoseChecksHealthWhenLocaltestIsRunning(t *testing.T) {
	requested := make(map[string]bool)
	opts := newDiagnosticTestOptions(
		t,
		func(_ context.Context, url string) (localtest.DiagnosticHTTPResponse, error) {
			requested[url] = true
			body := ""
			if strings.HasSuffix(url, "/Home/Localtest/Version") {
				body = "4"
			}
			return localtest.DiagnosticHTTPResponse{
				Body:       body,
				Status:     "200 OK",
				StatusCode: http.StatusOK,
			}, nil
		},
		nil,
	)
	opts.ResolveHost = func(context.Context, string) ([]string, error) {
		return []string{"::1", "127.0.0.1"}, nil
	}
	report := localtest.Diagnose(t.Context(), opts)

	if !report.Running {
		t.Fatal("Diagnose() Running = false, want true")
	}
	if report.HasIssues {
		t.Fatal("Diagnose() HasIssues = true, want false")
	}

	wantURLs := []string{
		"http://local.altinn.cloud:8000/Home/Localtest/Version",
		"http://local.altinn.cloud:8000/health",
		"http://127.0.0.1:5101/health",
		"http://pdf.local.altinn.cloud:8000/health/ready",
		"http://workflow-engine.local.altinn.cloud:8000/api/v1/health/ready",
	}
	for _, url := range wantURLs {
		if !requested[url] {
			t.Fatalf("Diagnose() did not request %q", url)
		}
	}
	assertDiagnosticCheck(t, report, "localtest", "tcp_8000_ipv4", localtest.DiagnosticLevelOK)
	assertDiagnosticCheck(t, report, "localtest", "tcp_8000_ipv6", localtest.DiagnosticLevelOK)
	assertDiagnosticCheck(t, report, "localtest", "tcp_5101_ipv4", localtest.DiagnosticLevelOK)
	assertDiagnosticCheck(t, report, "localtest", "tcp_5101_ipv6", localtest.DiagnosticLevelOK)
	assertDiagnosticCheck(t, report, "localtest", "localtest_health_8000", localtest.DiagnosticLevelOK)
	assertDiagnosticCheck(t, report, "localtest", "localtest_health_5101", localtest.DiagnosticLevelOK)
	assertDiagnosticCheck(t, report, "workflow-engine", "workflow_health", localtest.DiagnosticLevelOK)
}

func TestDiagnoseSkipsIPv6TCPChecksWhenIPv6IsDisabled(t *testing.T) {
	dialedNetworks := make(map[string]bool)
	opts := newDiagnosticTestOptions(t, nil, nil)
	opts.ResolveHost = func(context.Context, string) ([]string, error) {
		return []string{"::1", "127.0.0.1"}, nil
	}
	opts.IPv6Enabled = func() bool {
		return false
	}
	opts.DialTCP = func(_ context.Context, network, _ string) error {
		dialedNetworks[network] = true
		return nil
	}

	report := localtest.Diagnose(t.Context(), opts)

	if dialedNetworks["tcp6"] {
		t.Fatal("Diagnose() dialed tcp6 with IPv6 disabled")
	}
	assertDiagnosticCheck(t, report, "localtest", "tcp_8000_ipv4", localtest.DiagnosticLevelOK)
	assertDiagnosticCheck(t, report, "localtest", "tcp_5101_ipv4", localtest.DiagnosticLevelOK)
	assertDiagnosticCheckMissing(t, report, "localtest", "tcp_8000_ipv6")
	assertDiagnosticCheckMissing(t, report, "localtest", "tcp_5101_ipv6")
}

func TestDiagnoseSkipsIPv6TCPChecksWhenDNSHasNoIPv6(t *testing.T) {
	dialedNetworks := make(map[string]bool)
	opts := newDiagnosticTestOptions(t, nil, nil)
	opts.ResolveHost = func(context.Context, string) ([]string, error) {
		return []string{"127.0.0.1"}, nil
	}
	opts.IPv6Enabled = func() bool {
		return true
	}
	opts.DialTCP = func(_ context.Context, network, _ string) error {
		dialedNetworks[network] = true
		return nil
	}

	report := localtest.Diagnose(t.Context(), opts)

	if dialedNetworks["tcp6"] {
		t.Fatal("Diagnose() dialed tcp6 without localtest AAAA DNS")
	}
	assertDiagnosticCheck(t, report, "localtest", "tcp_8000_ipv4", localtest.DiagnosticLevelOK)
	assertDiagnosticCheck(t, report, "localtest", "tcp_5101_ipv4", localtest.DiagnosticLevelOK)
	assertDiagnosticCheckMissing(t, report, "localtest", "tcp_8000_ipv6")
	assertDiagnosticCheckMissing(t, report, "localtest", "tcp_5101_ipv6")
}

func TestDiagnoseSkipsHTTPForStoppedServiceContainer(t *testing.T) {
	requested := make(map[string]bool)
	report := localtest.Diagnose(t.Context(), newDiagnosticTestOptions(
		t,
		func(_ context.Context, url string) (localtest.DiagnosticHTTPResponse, error) {
			requested[url] = true
			return localtest.DiagnosticHTTPResponse{Body: "", Status: "200 OK", StatusCode: http.StatusOK}, nil
		},
		func(context.Context) (container.ContainerClient, error) {
			client := containermock.New()
			client.ContainerStateFunc = func(_ context.Context, name string) (types.ContainerState, error) {
				if name == components.ContainerPDF3 {
					return types.ContainerState{Status: "exited", Running: false}, nil
				}
				return types.ContainerState{Status: "running", Running: true}, nil
			}
			return client, nil
		},
	))

	if report.HasIssues {
		t.Fatal("Diagnose() HasIssues = true, want false")
	}
	if requested["http://pdf.local.altinn.cloud:8000/health/ready"] {
		t.Fatal("Diagnose() probed PDF health while PDF container was stopped")
	}
	assertDiagnosticCheckMissing(t, report, "pdf", "container")
}

func TestDiagnoseFlagsDNSAndHealthFailures(t *testing.T) {
	opts := newDiagnosticTestOptions(
		t,
		func(_ context.Context, url string) (localtest.DiagnosticHTTPResponse, error) {
			if strings.Contains(url, "workflow-engine.local.altinn.cloud") {
				return localtest.DiagnosticHTTPResponse{
					Body:       "",
					Status:     "503 Service Unavailable",
					StatusCode: http.StatusServiceUnavailable,
				}, nil
			}
			return localtest.DiagnosticHTTPResponse{
				Body:       "",
				Status:     "200 OK",
				StatusCode: http.StatusOK,
			}, nil
		},
		nil,
	)
	opts.ResolveHost = func(_ context.Context, host string) ([]string, error) {
		if host == "workflow-engine.local.altinn.cloud" {
			return []string{"10.0.0.1"}, nil
		}
		return []string{"127.0.0.1"}, nil
	}

	report := localtest.Diagnose(t.Context(), opts)
	if !report.HasIssues {
		t.Fatal("Diagnose() HasIssues = false, want true")
	}
	assertDiagnosticCheck(t, report, "workflow-engine", "dns", localtest.DiagnosticLevelError)
	assertDiagnosticCheck(t, report, "workflow-engine", "workflow_health", localtest.DiagnosticLevelError)
}

func TestDiagnoseDNSReportsIPv4AndIPv6Records(t *testing.T) {
	opts := newDiagnosticTestOptions(t, nil, nil)
	opts.ResolveHost = func(context.Context, string) ([]string, error) {
		return []string{"::1", "127.0.0.1"}, nil
	}

	report := localtest.Diagnose(t.Context(), opts)
	check := findDiagnosticCheck(t, report, "localtest", "dns")
	if check.Message != "local.altinn.cloud -> A 127.0.0.1; AAAA ::1" {
		t.Fatalf("DNS message = %q", check.Message)
	}
}

func newDiagnosticTestOptions(
	t *testing.T,
	httpGet func(context.Context, string) (localtest.DiagnosticHTTPResponse, error),
	detectContainer func(context.Context) (container.ContainerClient, error),
) localtest.DiagnosticOptions {
	t.Helper()
	if httpGet == nil {
		httpGet = func(context.Context, string) (localtest.DiagnosticHTTPResponse, error) {
			return localtest.DiagnosticHTTPResponse{}, errUnexpectedDiagnosticURL
		}
	}
	if detectContainer == nil {
		detectContainer = func(context.Context) (container.ContainerClient, error) {
			client := containermock.New()
			client.ContainerStateFunc = func(_ context.Context, name string) (types.ContainerState, error) {
				if !knownDiagnosticContainer(name) {
					return types.ContainerState{}, errUnexpectedDiagnosticContainer
				}
				return types.ContainerState{Status: "running", Running: true}, nil
			}
			return client, nil
		}
	}
	return localtest.DiagnosticOptions{
		DetectContainer: detectContainer,
		ResolveHost: func(context.Context, string) ([]string, error) {
			return []string{"127.0.0.1"}, nil
		},
		HTTPGet: httpGet,
		DialTCP: func(context.Context, string, string) error {
			return nil
		},
		IPv6Enabled: func() bool {
			return true
		},
		Debugf:   func(string, ...any) {},
		Topology: envtopology.NewLocal(envtopology.DefaultIngressPortString()),
	}
}

func assertDiagnosticCheck(
	t *testing.T,
	report *localtest.DiagnosticReport,
	serviceName, id, level string,
) {
	t.Helper()
	for _, service := range report.Services {
		if service.Name != serviceName {
			continue
		}
		for _, check := range service.Checks {
			if check.ID == id {
				if check.Level != level {
					t.Fatalf("%s check %q level = %q, want %q", serviceName, id, check.Level, level)
				}
				return
			}
		}
		t.Fatalf("%s check %q missing", serviceName, id)
	}
	t.Fatalf("service %q missing", serviceName)
}

func findDiagnosticCheck(
	t *testing.T,
	report *localtest.DiagnosticReport,
	serviceName, id string,
) localtest.DiagnosticCheck {
	t.Helper()
	for _, service := range report.Services {
		if service.Name != serviceName {
			continue
		}
		for _, check := range service.Checks {
			if check.ID == id {
				return check
			}
		}
		t.Fatalf("%s check %q missing", serviceName, id)
	}
	t.Fatalf("service %q missing", serviceName)
	return localtest.DiagnosticCheck{}
}

func assertDiagnosticCheckMissing(t *testing.T, report *localtest.DiagnosticReport, serviceName, id string) {
	t.Helper()
	for _, service := range report.Services {
		if service.Name != serviceName {
			continue
		}
		for _, check := range service.Checks {
			if check.ID == id {
				t.Fatalf("%s check %q exists, want missing", serviceName, id)
			}
		}
		return
	}
	t.Fatalf("service %q missing", serviceName)
}

func knownDiagnosticContainer(name string) bool {
	switch name {
	case components.ContainerLocaltest,
		components.ContainerPDF3,
		components.ContainerWorkflowEngine:
		return true
	default:
		return false
	}
}
