package cmd

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"
	"time"

	containermock "altinn.studio/devenv/pkg/container/mock"
	"altinn.studio/devenv/pkg/container/types"
	appsvc "altinn.studio/studioctl/internal/cmd/app"
	appsupport "altinn.studio/studioctl/internal/cmd/apps"
	repocontext "altinn.studio/studioctl/internal/context"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

var errRemoveFailed = errors.New("remove failed")

func TestFollowContainer_ContextCancelledReturnsRunStopped(t *testing.T) {
	ctx, cancel := context.WithCancel(t.Context())
	cancel()

	client := containermock.New()
	client.ContainerLogsFunc = func(context.Context, string, bool, string) (io.ReadCloser, error) {
		return io.NopCloser(strings.NewReader("")), nil
	}
	client.ContainerWaitFunc = func(context.Context, string) (int, error) {
		return 0, fmt.Errorf("context cancelled while waiting for container: %w", ctx.Err())
	}

	cmd := &RunCommand{out: ui.NewOutput(io.Discard, io.Discard, false)}
	err := cmd.followContainer(ctx, client, "app-container")
	if !errors.Is(err, errAppRunStopped) {
		t.Fatalf("followContainer() error = %v, want errAppRunStopped", err)
	}
}

func TestRemoveForegroundContainer_ReturnsRemoveError(t *testing.T) {
	client := containermock.New()
	client.ContainerRemoveFunc = func(context.Context, string, bool) error {
		return errRemoveFailed
	}

	cmd := &RunCommand{out: ui.NewOutput(io.Discard, io.Discard, false)}
	err := cmd.removeForegroundContainer(t.Context(), client, "app-container")
	if err == nil {
		t.Fatal("removeForegroundContainer() error = nil, want error")
	}
	if !strings.Contains(err.Error(), "remove app container") {
		t.Fatalf("removeForegroundContainer() error = %v, want remove context", err)
	}
}

func TestStartupOperationError_ContextCancelledReturnsRunStopped(t *testing.T) {
	t.Parallel()

	ctx, cancel := context.WithCancel(t.Context())
	cancel()

	err := startupOperationError(ctx, "start studioctl-server", context.Canceled)
	if !errors.Is(err, errAppRunStopped) {
		t.Fatalf("startupOperationError() error = %v, want errAppRunStopped", err)
	}
}

func TestStartupMonitorError_ContextCancelledReturnsRunStopped(t *testing.T) {
	t.Parallel()

	ctx, cancel := context.WithCancel(t.Context())
	cancel()

	err := startupMonitorError(ctx, t.Context(), context.Canceled, errAppStartupTimedOut)
	if !errors.Is(err, errAppRunStopped) {
		t.Fatalf("startupMonitorError() error = %v, want errAppRunStopped", err)
	}
}

func TestRunJSONRequiresDetach(t *testing.T) {
	t.Parallel()

	cmd := &RunCommand{out: ui.NewOutput(io.Discard, io.Discard, false)}
	err := cmd.RunWithCommandPath(t.Context(), []string{"--json"}, "run")
	if err == nil {
		t.Fatal("RunWithCommandPath() error = nil, want error")
	}
	if !strings.Contains(err.Error(), "--json requires --detach") {
		t.Fatalf("RunWithCommandPath() error = %v, want detach/json error", err)
	}
}

func TestAppRunJSONRequiresDetach(t *testing.T) {
	t.Parallel()

	cmd := &RunCommand{out: ui.NewOutput(io.Discard, io.Discard, false)}
	err := cmd.RunWithCommandPath(t.Context(), []string{"--json"}, "app run")
	if err == nil {
		t.Fatal("RunWithCommandPath() error = nil, want error")
	}
	if !strings.Contains(err.Error(), "--json requires --detach") {
		t.Fatalf("RunWithCommandPath() error = %v, want detach/json error", err)
	}
}

func TestParseRunFlagsUsesProcessMode(t *testing.T) {
	t.Parallel()

	cmd := &RunCommand{out: ui.NewOutput(io.Discard, io.Discard, false)}
	flags, _, _, err := cmd.parseRunFlags([]string{"--mode", "process"}, "run")
	if err != nil {
		t.Fatalf("parseRunFlags() error = %v", err)
	}
	if flags.mode != runModeProcess {
		t.Fatalf("mode = %q, want %q", flags.mode, runModeProcess)
	}
	if !flags.randomHostPort {
		t.Fatal("randomHostPort = false, want true")
	}
}

func TestParseRunFlagsCanDisableRandomHostPort(t *testing.T) {
	t.Parallel()

	cmd := &RunCommand{out: ui.NewOutput(io.Discard, io.Discard, false)}
	flags, _, _, err := cmd.parseRunFlags([]string{"--random-host-port=false"}, "run")
	if err != nil {
		t.Fatalf("parseRunFlags() error = %v", err)
	}
	if flags.randomHostPort {
		t.Fatal("randomHostPort = true, want false")
	}
}

func TestRunDetachedOutputPrintJSON(t *testing.T) {
	t.Parallel()

	var out bytes.Buffer
	result := runDetachedOutput{
		AppID:      "ttd/app",
		Mode:       runModeProcess,
		URL:        "http://localtest.localhost/app",
		LogPath:    "/tmp/app.log",
		ProcessID:  123,
		JSONOutput: true,
	}
	if err := result.Print(ui.NewOutput(&out, io.Discard, false)); err != nil {
		t.Fatalf("Print() error = %v", err)
	}

	var got runDetachedOutput
	if err := json.Unmarshal([]byte(strings.TrimSpace(out.String())), &got); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if got.AppID != result.AppID || got.Mode != result.Mode || got.URL != result.URL ||
		got.LogPath != result.LogPath || got.ProcessID != result.ProcessID {
		t.Fatalf("output = %+v, want %+v", got, result)
	}
}

func TestRunDetachedOutputPrintHumanNoOutput(t *testing.T) {
	t.Setenv("NO_COLOR", "1")

	var out bytes.Buffer
	result := runDetachedOutput{
		AppID:     "ttd/app",
		Mode:      runModeProcess,
		URL:       "http://local.altinn.cloud:8000/ttd/app/",
		ProcessID: 123,
	}
	if err := result.Print(ui.NewOutput(&out, io.Discard, false)); err != nil {
		t.Fatalf("Print() error = %v", err)
	}

	if got := out.String(); got != "" {
		t.Fatalf("output = %q, want empty output", got)
	}
}

func TestPrintAppReadyUsesStudioctlStatusLinesWithoutPortsOrLogPath(t *testing.T) {
	t.Setenv("NO_COLOR", "1")

	var out bytes.Buffer
	cmd := &RunCommand{out: ui.NewOutput(&out, io.Discard, false)}

	cmd.printAppReady("http://local.altinn.cloud:8000/ttd/app/", processRunDetails(123)...)

	rendered := out.String()
	for _, want := range []string{
		"studioctl  App ready: http://local.altinn.cloud:8000/ttd/app/",
		"studioctl    - Mode: process",
		"studioctl    - PID: 123",
		"studioctl  Logs: studioctl app logs",
	} {
		if !strings.Contains(rendered, want) {
			t.Fatalf("output %q missing %q", rendered, want)
		}
	}
	for _, unwanted := range []string{"Log:", "Container:", "Port:", "/tmp/"} {
		if strings.Contains(rendered, unwanted) {
			t.Fatalf("output %q contains %q", rendered, unwanted)
		}
	}
}

func TestPrintAppReadyUsesContainerDetails(t *testing.T) {
	t.Setenv("NO_COLOR", "1")

	var out bytes.Buffer
	cmd := &RunCommand{out: ui.NewOutput(&out, io.Discard, false)}

	cmd.printAppReady("http://local.altinn.cloud:8000/ttd/app/", containerRunDetails("localtest-app-test")...)

	rendered := out.String()
	for _, want := range []string{
		"studioctl    - Mode: container",
		"studioctl    - Name: localtest-app-test",
	} {
		if !strings.Contains(rendered, want) {
			t.Fatalf("output %q missing %q", rendered, want)
		}
	}
}

func TestPrintAppStoppedUsesStudioctlStatusLine(t *testing.T) {
	t.Setenv("NO_COLOR", "1")

	var out bytes.Buffer
	cmd := &RunCommand{out: ui.NewOutput(&out, io.Discard, false)}

	cmd.printAppStopped()

	want := "studioctl  App stopped."
	if got := out.String(); !strings.Contains(got, want) {
		t.Fatalf("output = %q, want %q", got, want)
	}
}

func TestAppRunDisplayURLUsesTopologyAppRoute(t *testing.T) {
	t.Parallel()

	got := appRunDisplayURL(envtopology.NewLocal("8000"), "ttd/app")
	want := "http://local.altinn.cloud:8000/ttd/app/"
	if got != want {
		t.Fatalf("appRunDisplayURL() = %q, want %q", got, want)
	}
}

func TestDotnetRunCommandEnvEnablesAnsiColorForForeground(t *testing.T) {
	t.Parallel()

	got := dotnetRunCommandEnv([]string{"PATH=/bin"}, runFlags{}, true)
	if !envContains(got, dotnetAnsiColorRedirectionEnv+"=1") {
		t.Fatalf("env = %v, want %s=1", got, dotnetAnsiColorRedirectionEnv)
	}
}

func TestDotnetRunCommandEnvPreservesUserColorSetting(t *testing.T) {
	t.Parallel()

	env := []string{dotnetAnsiColorRedirectionEnv + "=false"}
	got := dotnetRunCommandEnv(env, runFlags{}, true)
	if len(got) != 1 || got[0] != env[0] {
		t.Fatalf("env = %v, want preserved user setting %v", got, env)
	}
}

func TestDotnetRunCommandEnvDoesNotEnableAnsiColorForDetached(t *testing.T) {
	t.Parallel()

	got := dotnetRunCommandEnv([]string{"PATH=/bin"}, runFlags{detach: true}, true)
	if envContainsPrefix(got, dotnetAnsiColorRedirectionEnv+"=") {
		t.Fatalf("env = %v, did not want %s", got, dotnetAnsiColorRedirectionEnv)
	}
}

func TestDotnetRunCommandEnvDoesNotEnableAnsiColorWhenOutputIsNotTerminal(t *testing.T) {
	t.Parallel()

	got := dotnetRunCommandEnv([]string{"PATH=/bin"}, runFlags{}, false)
	if envContainsPrefix(got, dotnetAnsiColorRedirectionEnv+"=") {
		t.Fatalf("env = %v, did not want %s", got, dotnetAnsiColorRedirectionEnv)
	}
}

func TestNextAppLogPathUsesNextRunIDForDate(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	for _, name := range []string{
		"2026-04-20-1.log",
		"2026-04-20-3.log",
		"2026-04-19-10.log",
		"2026-04-20-not-a-number.log",
	} {
		if err := os.WriteFile(filepath.Join(dir, name), nil, osutil.FilePermOwnerOnly); err != nil {
			t.Fatalf("write log file: %v", err)
		}
	}

	got, err := appsupport.NextLogPath(dir, time.Date(2026, 4, 20, 12, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("NextLogPath() error = %v", err)
	}

	want := filepath.Join(dir, "2026-04-20-4.log")
	if got != want {
		t.Fatalf("NextLogPath() = %q, want %q", got, want)
	}
}

func TestContainerAppRunInfoIncludesContainerHandle(t *testing.T) {
	t.Parallel()

	got := containerAppRunInfo("container-id", types.ContainerInfo{
		ID:    "container-id",
		Name:  "container-name",
		State: types.ContainerState{Running: true},
		Ports: []types.PublishedPort{
			{
				ContainerPort: "5005",
				HostPort:      "5006",
			},
		},
	})

	if got.ContainerID != "container-id" || got.HostPort != 5006 {
		t.Fatalf("containerAppRunInfo() = %+v, want container handle and host port", got)
	}
}

func TestPrepareDockerRunImagePullUsesProgressRenderer(t *testing.T) {
	t.Parallel()

	var out bytes.Buffer
	cmd := &RunCommand{out: ui.NewOutput(&out, io.Discard, false)}
	flags := runFlags{imageTag: "example/app:test", pullImage: true, skipBuild: true}
	spec := appsvc.DockerRunSpec{Config: types.ContainerConfig{
		Name:  "localtest-app-test",
		Image: flags.imageTag,
	}}
	progress := cmd.startContainerRunProgress(spec, flags)
	defer progress.Stop()

	client := containermock.New()
	progressHandlerCalled := false
	client.ImagePullWithProgressFunc = func(
		_ context.Context,
		image string,
		onProgress types.ProgressHandler,
	) error {
		if image != flags.imageTag {
			t.Fatalf("image = %q, want %q", image, flags.imageTag)
		}
		if onProgress == nil {
			t.Fatal("onProgress = nil, want progress handler")
		}
		progressHandlerCalled = true
		onProgress(types.ProgressUpdate{Message: "downloading", Current: 1, Total: 2})
		return nil
	}

	err := cmd.prepareDockerRunImage(t.Context(), client, repocontext.Detection{}, flags.imageTag, flags, progress)
	if err != nil {
		t.Fatalf("prepareDockerRunImage() error = %v", err)
	}
	progress.Stop()

	if !progressHandlerCalled {
		t.Fatal("progress handler was not called")
	}
	assertContainerCall(t, client.Calls, "ImagePullWithProgress")
	assertNoContainerCall(t, client.Calls, "ImagePull")

	rendered := out.String()
	for _, want := range []string{
		"Pulling and starting app container...",
		"localtest-app-test: pulling",
		"downloading",
		"localtest-app-test: image ready",
	} {
		if !strings.Contains(rendered, want) {
			t.Fatalf("rendered output %q missing %q", rendered, want)
		}
	}
}

func TestCreateDockerAppContainerRendersStartAndCanSuppressPlainInfo(t *testing.T) {
	t.Parallel()

	var out bytes.Buffer
	cmd := &RunCommand{out: ui.NewOutput(&out, io.Discard, false)}
	spec := appContainerProgressTestSpec()
	progress := cmd.startContainerRunProgress(spec, runFlags{skipBuild: true})
	defer progress.Stop()

	client := containermock.New()
	client.ContainerRemoveFunc = func(context.Context, string, bool) error {
		return types.ErrContainerNotFound
	}
	client.ContainerInspectFunc = func(context.Context, string) (types.ContainerInfo, error) {
		return appContainerProgressTestInfo(spec), nil
	}

	_, _, err := cmd.createDockerAppContainer(t.Context(), client, spec, progress)
	if err != nil {
		t.Fatalf("createDockerAppContainer() error = %v", err)
	}
	progress.Stop()

	rendered := out.String()
	if !strings.Contains(rendered, "localtest-app-test: starting") {
		t.Fatalf("rendered output %q missing container starting state", rendered)
	}
	if strings.Contains(rendered, "Container:") || strings.Contains(rendered, "Port:") {
		t.Fatalf("rendered output %q contains plain container info despite quiet output", rendered)
	}
}

func TestCreateDockerAppContainerRendersExistingContainerRemoval(t *testing.T) {
	t.Parallel()

	var out bytes.Buffer
	cmd := &RunCommand{out: ui.NewOutput(&out, io.Discard, false)}
	spec := appContainerProgressTestSpec()
	progress := cmd.startContainerRunProgress(spec, runFlags{skipBuild: true})
	defer progress.Stop()

	client := containermock.New()
	client.ContainerInspectFunc = func(context.Context, string) (types.ContainerInfo, error) {
		return appContainerProgressTestInfo(spec), nil
	}

	_, _, err := cmd.createDockerAppContainer(t.Context(), client, spec, progress)
	if err != nil {
		t.Fatalf("createDockerAppContainer() error = %v", err)
	}
	progress.Stop()

	rendered := out.String()
	for _, want := range []string{
		"localtest-app-test: stopping",
		"localtest-app-test: removed",
		"localtest-app-test: starting",
	} {
		if !strings.Contains(rendered, want) {
			t.Fatalf("rendered output %q missing %q", rendered, want)
		}
	}
}

func TestCreateDockerAppContainerRendersRemoveFailure(t *testing.T) {
	t.Parallel()

	var out bytes.Buffer
	cmd := &RunCommand{out: ui.NewOutput(&out, io.Discard, false)}
	spec := appContainerProgressTestSpec()
	progress := cmd.startContainerRunProgress(spec, runFlags{skipBuild: true})
	defer progress.Stop()

	client := containermock.New()
	client.ContainerRemoveFunc = func(context.Context, string, bool) error {
		return errRemoveFailed
	}

	_, _, err := cmd.createDockerAppContainer(t.Context(), client, spec, progress)
	if err == nil {
		t.Fatal("createDockerAppContainer() error = nil, want error")
	}
	progress.Fail(err)

	rendered := out.String()
	if !strings.Contains(rendered, "localtest-app-test: stopping") {
		t.Fatalf("rendered output %q missing removal start", rendered)
	}
	if !strings.Contains(rendered, "localtest-app-test: failed: remove failed") {
		t.Fatalf("rendered output %q missing removal failure", rendered)
	}
}

func appContainerProgressTestSpec() appsvc.DockerRunSpec {
	return appsvc.DockerRunSpec{Config: types.ContainerConfig{
		Name:  "localtest-app-test",
		Image: "example/app:test",
	}}
}

func appContainerProgressTestInfo(spec appsvc.DockerRunSpec) types.ContainerInfo {
	return types.ContainerInfo{
		ID:    "container-id",
		Name:  spec.Config.Name,
		State: types.ContainerState{Running: true},
		Ports: []types.PublishedPort{{
			ContainerPort: "5005",
			HostPort:      "5006",
		}},
	}
}

func assertContainerCall(t *testing.T, calls []containermock.Call, method string) {
	t.Helper()

	for _, call := range calls {
		if call.Method == method {
			return
		}
	}
	t.Fatalf("container calls = %+v, want %s", calls, method)
}

func assertNoContainerCall(t *testing.T, calls []containermock.Call, method string) {
	t.Helper()

	for _, call := range calls {
		if call.Method == method {
			t.Fatalf("container calls = %+v, did not want %s", calls, method)
		}
	}
}

func envContains(env []string, want string) bool {
	return slices.Contains(env, want)
}

func envContainsPrefix(env []string, prefix string) bool {
	for _, entry := range env {
		if strings.HasPrefix(entry, prefix) {
			return true
		}
	}
	return false
}
