package dockerapi

import (
	"context"
	"errors"
	"io"
	"slices"
	"strings"
	"testing"
	"time"

	"altinn.studio/devenv/pkg/container/types"

	dockertypes "github.com/docker/docker/api/types"
	dockermount "github.com/docker/docker/api/types/mount"
	systemtypes "github.com/docker/docker/api/types/system"
	"github.com/docker/docker/pkg/jsonmessage"
)

var errNetworkActiveEndpoints = errors.New(
	`error response from daemon: error while removing network: network altinntestlocal_network has active endpoints`,
)
var errServerVersionUnavailable = errors.New("server version unavailable")

func TestBuildMounts(t *testing.T) {
	t.Parallel()

	got := buildMounts([]types.VolumeMount{
		{
			HostPath:      "/Users/someuser/Library/Application Support/altinn-studio/data/testdata",
			ContainerPath: "/testdata",
			ReadOnly:      false,
		},
		{
			HostPath:      "/tmp/config.yaml",
			ContainerPath: "/etc/config.yaml",
			ReadOnly:      true,
		},
		{
			HostPath:      "localtest-workflow-engine-db-data",
			ContainerPath: "/var/lib/postgresql",
			Type:          types.VolumeMountTypeVolume,
		},
	})

	want := []dockermount.Mount{
		{
			Type:     dockermount.TypeBind,
			Source:   "/Users/someuser/Library/Application Support/altinn-studio/data/testdata",
			Target:   "/testdata",
			ReadOnly: false,
		},
		{
			Type:     dockermount.TypeBind,
			Source:   "/tmp/config.yaml",
			Target:   "/etc/config.yaml",
			ReadOnly: true,
		},
		{
			Type:     dockermount.TypeVolume,
			Source:   "localtest-workflow-engine-db-data",
			Target:   "/var/lib/postgresql",
			ReadOnly: false,
		},
	}

	if len(got) != len(want) {
		t.Fatalf("buildBindMounts() len = %d, want %d", len(got), len(want))
	}

	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("buildBindMounts()[%d] = %#v, want %#v", i, got[i], want[i])
		}
	}
}

func TestBuildDockerConfigs_PodmanUserNamespaceAndRelabelBind(t *testing.T) {
	t.Parallel()

	cfg := types.ContainerConfig{
		Image:      "alpine",
		User:       "1000:1000",
		UsernsMode: "keep-id",
		Volumes: []types.VolumeMount{
			{
				HostPath:       "/tmp/config.sql",
				ContainerPath:  "/docker-entrypoint-initdb.d/01-tuning.sql",
				Type:           types.VolumeMountTypeBind,
				SELinuxRelabel: types.SELinuxRelabelShared,
				ReadOnly:       true,
			},
			{
				HostPath:      "postgres-data",
				ContainerPath: "/var/lib/postgresql",
				Type:          types.VolumeMountTypeVolume,
			},
		},
	}

	_, hostCfg, _ := buildDockerConfigs(cfg, types.PlatformPodman)

	if got := string(hostCfg.UsernsMode); got != "keep-id" {
		t.Fatalf("hostCfg.UsernsMode = %q, want keep-id", got)
	}
	wantBinds := []string{"/tmp/config.sql:/docker-entrypoint-initdb.d/01-tuning.sql:ro,z"}
	if !slices.Equal(hostCfg.Binds, wantBinds) {
		t.Fatalf("hostCfg.Binds = %#v, want %#v", hostCfg.Binds, wantBinds)
	}
	wantMounts := []dockermount.Mount{{
		Type:   dockermount.TypeVolume,
		Source: "postgres-data",
		Target: "/var/lib/postgresql",
	}}
	if !slices.Equal(hostCfg.Mounts, wantMounts) {
		t.Fatalf("hostCfg.Mounts = %#v, want %#v", hostCfg.Mounts, wantMounts)
	}
}

func TestIsNetworkInUseError_ActiveEndpoints(t *testing.T) {
	t.Parallel()

	if !isNetworkInUseError(errNetworkActiveEndpoints) {
		t.Fatal("isNetworkInUseError() = false, want true")
	}
}

func TestPlatformFromVersion(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		version dockertypes.Version
		want    types.ContainerPlatform
	}{
		{
			name: "podman platform wins",
			version: dockertypes.Version{
				Platform: struct{ Name string }{Name: "Podman Engine"},
			},
			want: types.PlatformPodman,
		},
		{
			name: "docker component name",
			version: dockertypes.Version{
				Components: []dockertypes.ComponentVersion{
					{Name: "Docker Engine - Community", Version: "28.0.0"},
				},
			},
			want: types.PlatformDocker,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got, ok := platformFromVersion(tt.version)
			if !ok {
				t.Fatal("platformFromVersion() ok = false")
			}
			if got != tt.want {
				t.Fatalf("platformFromVersion() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestPlatformFromInfo(t *testing.T) {
	t.Parallel()

	info := systemtypes.Info{
		OperatingSystem: "Podman Machine",
		ServerVersion:   "5.4.0",
	}

	got, ok := platformFromInfo(info)
	if !ok {
		t.Fatal("platformFromInfo() ok = false")
	}
	if got != types.PlatformPodman {
		t.Fatalf("platformFromInfo() = %v, want %v", got, types.PlatformPodman)
	}
}

func TestPlatformFromHost(t *testing.T) {
	t.Parallel()

	tests := []struct {
		host string
		want types.ContainerPlatform
	}{
		{
			host: "unix:///Users/someuser/.local/share/containers/podman/machine/podman.sock",
			want: types.PlatformPodman,
		},
		{
			host: "unix:///Users/someuser/.colima/default/docker.sock",
			want: types.PlatformColima,
		},
	}

	for _, tt := range tests {
		got, ok := platformFromHost(tt.host)
		if !ok {
			t.Fatalf("platformFromHost(%q) ok = false", tt.host)
		}
		if got != tt.want {
			t.Fatalf("platformFromHost(%q) = %v, want %v", tt.host, got, tt.want)
		}
	}
}

func TestInfoHasSELinux(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		info systemtypes.Info
		want bool
	}{
		{
			name: "selinux enabled",
			info: systemtypes.Info{
				SecurityOptions: []string{"name=seccomp,profile=default", "name=selinux"},
			},
			want: true,
		},
		{
			name: "selinux absent",
			info: systemtypes.Info{
				SecurityOptions: []string{"name=seccomp,profile=default", "name=rootless"},
			},
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := infoHasSELinux(tt.info); got != tt.want {
				t.Fatalf("infoHasSELinux() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestWithVersionMetadata(t *testing.T) {
	t.Parallel()

	toolchain := withVersionMetadata(
		t.Context(),
		fakeVersionClient{
			clientVersion: "1.51",
			serverVersion: dockertypes.Version{
				Version: "28.2.2",
			},
		},
		types.ContainerToolchain{
			Platform:   types.PlatformDocker,
			AccessMode: types.AccessDockerEngineAPI,
			Source:     types.SourceDefault,
		},
	)

	if toolchain.ClientVersion != "1.51" {
		t.Fatalf("withVersionMetadata() ClientVersion = %q, want 1.51", toolchain.ClientVersion)
	}
	if toolchain.ServerVersion != "28.2.2" {
		t.Fatalf("withVersionMetadata() ServerVersion = %q, want 28.2.2", toolchain.ServerVersion)
	}
}

func TestWithVersionMetadataIgnoresServerVersionError(t *testing.T) {
	t.Parallel()

	toolchain := withVersionMetadata(
		t.Context(),
		fakeVersionClient{
			clientVersion: "1.51",
			err:           errServerVersionUnavailable,
		},
		types.ContainerToolchain{},
	)

	if toolchain.ClientVersion != "1.51" {
		t.Fatalf("withVersionMetadata() ClientVersion = %q, want 1.51", toolchain.ClientVersion)
	}
	if toolchain.ServerVersion != "" {
		t.Fatalf("withVersionMetadata() ServerVersion = %q, want empty", toolchain.ServerVersion)
	}
}

func TestBuild_ColimaRequiresDockerCLIAtCallSite(t *testing.T) {
	t.Setenv("PATH", "")

	c := &Client{
		toolchain: types.ContainerToolchain{
			Platform:   types.PlatformColima,
			AccessMode: types.AccessUnknown,
			Source:     types.SourceUnknown,
			SocketPath: "",
			SELinux:    false,
		},
	}

	err := c.Build(t.Context(), ".", "Dockerfile", "localtest:dev")
	if err == nil {
		t.Fatal("Build() error = nil, want non-nil")
	}
	if want := "container runtime CLI not found"; !strings.Contains(err.Error(), want) {
		t.Fatalf("Build() error = %q", err)
	}
}

func TestDemuxDockerLogs(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		input string
		want  string
	}{
		{
			name:  "stdout and stderr frames",
			input: dockerLogFrame(1, "hello") + dockerLogFrame(2, "warn\n"),
			want:  "hellowarn\n",
		},
		{
			name:  "partial lines stay contiguous",
			input: dockerLogFrame(1, "war") + dockerLogFrame(1, "n: one\n"),
			want:  "warn: one\n",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			logs := demuxDockerLogs(io.NopCloser(strings.NewReader(tt.input)))
			got, err := io.ReadAll(logs)
			if closeErr := logs.Close(); closeErr != nil {
				t.Fatalf("Close() error = %v", closeErr)
			}
			if err != nil {
				t.Fatalf("ReadAll() error = %v", err)
			}
			if string(got) != tt.want {
				t.Fatalf("demuxDockerLogs() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestDemuxDockerLogs_CloseStopsReaderCleanly(t *testing.T) {
	t.Parallel()

	sourceReader, sourceWriter := io.Pipe()
	defer func() {
		if err := sourceWriter.Close(); err != nil {
			return
		}
	}()

	logs := demuxDockerLogs(sourceReader)
	done := make(chan error, 1)
	go func() {
		_, err := io.ReadAll(logs)
		done <- err
	}()

	if err := logs.Close(); err != nil {
		t.Fatalf("Close() error = %v", err)
	}

	select {
	case err := <-done:
		if err != nil {
			t.Fatalf("ReadAll() error = %v", err)
		}
	case <-time.After(time.Second):
		t.Fatal("ReadAll() did not stop after Close()")
	}
}

func dockerLogFrame(stream byte, payload string) string {
	return string([]byte{stream, 0, 0, 0, 0, 0, 0, byte(len(payload))}) + payload
}

func TestDockerBuildArgs_IncludesRegistryCache(t *testing.T) {
	t.Parallel()

	got := dockerBuildArgs(".", "Dockerfile", "localtest:dev", types.BuildOptions{
		CacheFrom: []string{"type=registry,ref=example/cache:latest"},
		CacheTo:   []string{"type=registry,ref=example/cache:latest,mode=max"},
	})
	want := []string{
		"buildx", "build",
		"--load",
		"--progress", "rawjson",
		"--provenance=false",
		"--sbom=false",
		"--cache-from", "type=registry,ref=example/cache:latest",
		"--cache-to", "type=registry,ref=example/cache:latest,mode=max",
		"-t", "localtest:dev",
		"-f", "Dockerfile",
		".",
	}
	if !slices.Equal(got, want) {
		t.Fatalf("dockerBuildArgs() = %#v, want %#v", got, want)
	}
}

func TestDockerBuildArgs_ResolvesDockerfileRelativeToContext(t *testing.T) {
	t.Parallel()

	got := dockerBuildArgs("/repo/src/Runtime/pdf3", "Dockerfile.proxy", "pdf3-proxy:latest", types.BuildOptions{})
	want := []string{
		"build",
		"--progress", "rawjson",
		"--provenance=false",
		"--sbom=false",
		"-t", "pdf3-proxy:latest",
		"-f", "/repo/src/Runtime/pdf3/Dockerfile.proxy",
		"/repo/src/Runtime/pdf3",
	}
	if !slices.Equal(got, want) {
		t.Fatalf("dockerBuildArgs() = %#v, want %#v", got, want)
	}
}

func TestBuildProgressAggregator_AggregatesStatuses(t *testing.T) {
	t.Parallel()

	aggregator := newBuildProgressAggregator()
	progress, ok := aggregator.Update(buildkitSolveStatus{
		Vertexes: []*buildkitVertex{
			{Name: "[internal] load build context"},
		},
		Statuses: []*buildkitVertexStatus{
			{
				ID:      "context-transfer",
				Name:    "transferring context",
				Current: 25,
				Total:   100,
			},
			{
				ID:      "base-image",
				Name:    "pulling base image",
				Current: 10,
				Total:   50,
			},
		},
	})
	if !ok {
		t.Fatal("Update() ok = false")
	}
	if progress.Current != 35 || progress.Total != 150 || progress.Indeterminate {
		t.Fatalf("progress = %+v, want current=35 total=150 determinate", progress)
	}
	if progress.Message != "pulling base image" {
		t.Fatalf("message = %q, want %q", progress.Message, "pulling base image")
	}
}

func TestBuildProgressAggregator_IndeterminateWithoutTotals(t *testing.T) {
	t.Parallel()

	aggregator := newBuildProgressAggregator()
	progress, ok := aggregator.Update(buildkitSolveStatus{
		Vertexes: []*buildkitVertex{
			{Name: "[internal] load build definition from Dockerfile"},
		},
	})
	if !ok {
		t.Fatal("Update() ok = false")
	}
	if !progress.Indeterminate {
		t.Fatalf("progress = %+v, want indeterminate", progress)
	}
	if progress.Message != "[internal] load build definition from Dockerfile" {
		t.Fatalf("message = %q", progress.Message)
	}
}

func TestBuildProgressAggregator_ResetsStatusProgressWhenPhaseChanges(t *testing.T) {
	t.Parallel()

	aggregator := newBuildProgressAggregator()
	aggregator.Update(buildkitSolveStatus{
		Statuses: []*buildkitVertexStatus{
			{
				ID:      "layer-a",
				Name:    "downloading",
				Current: 100,
				Total:   100,
			},
		},
	})

	progress, ok := aggregator.Update(buildkitSolveStatus{
		Statuses: []*buildkitVertexStatus{
			{
				ID:      "layer-a",
				Name:    "extracting",
				Current: 10,
				Total:   100,
			},
		},
	})
	if !ok {
		t.Fatal("Update() ok = false")
	}
	if progress.Current != 10 || progress.Total != 100 || progress.Indeterminate {
		t.Fatalf("progress = %+v, want current=10 total=100 determinate", progress)
	}
	if progress.Message != "extracting" {
		t.Fatalf("message = %q, want %q", progress.Message, "extracting")
	}
}

func TestBuildProgressAggregator_CapturesVertexErrors(t *testing.T) {
	t.Parallel()

	aggregator := newBuildProgressAggregator()
	progress, ok := aggregator.Update(buildkitSolveStatus{
		Vertexes: []*buildkitVertex{
			{
				Name:  "build step",
				Error: "failed to solve: boom",
			},
		},
	})
	if ok {
		t.Fatalf("Update() ok = true, progress = %+v, want false", progress)
	}
	if got := aggregator.LastError(); got != "failed to solve: boom" {
		t.Fatalf("LastError() = %q, want %q", got, "failed to solve: boom")
	}
}

func TestBuildkitLogText_PreservesDecodedLogs(t *testing.T) {
	t.Parallel()

	logs := buildkitLogText(buildkitSolveStatus{
		Logs: []*buildkitVertexLog{
			{Data: []byte("step output\n")},
			{Data: []byte("second line")},
		},
	})
	if logs != "step output\nsecond line" {
		t.Fatalf("buildkitLogText() = %q, want %q", logs, "step output\nsecond line")
	}
}

func TestPullProgressAggregator_AggregatesLayers(t *testing.T) {
	t.Parallel()

	aggregator := newPullProgressAggregator()

	first := aggregator.Update(jsonmessage.JSONMessage{
		ID:     "layer-a",
		Status: "Downloading",
		Progress: &jsonmessage.JSONProgress{
			Current: 25,
			Total:   100,
		},
	})
	if first.Current != 25 || first.Total != 100 || first.Indeterminate {
		t.Fatalf("first progress = %+v, want current=25 total=100 determinate", first)
	}

	second := aggregator.Update(jsonmessage.JSONMessage{
		ID:     "layer-b",
		Status: "Downloading",
		Progress: &jsonmessage.JSONProgress{
			Current: 10,
			Total:   50,
		},
	})
	if second.Current != 35 || second.Total != 150 || second.Indeterminate {
		t.Fatalf("second progress = %+v, want current=35 total=150 determinate", second)
	}

	third := aggregator.Update(jsonmessage.JSONMessage{
		ID:     "layer-a",
		Status: "Extracting",
		Progress: &jsonmessage.JSONProgress{
			Current: 100,
			Total:   100,
		},
	})
	if third.Current != 110 || third.Total != 150 || third.Indeterminate {
		t.Fatalf("third progress = %+v, want current=110 total=150 determinate", third)
	}
}

func TestPullProgressAggregator_IgnoresProgresslessUpdates(t *testing.T) {
	t.Parallel()

	aggregator := newPullProgressAggregator()
	aggregator.Update(jsonmessage.JSONMessage{
		ID:     "layer-a",
		Status: "Downloading",
		Progress: &jsonmessage.JSONProgress{
			Current: 25,
			Total:   100,
		},
	})

	progress := aggregator.Update(jsonmessage.JSONMessage{
		ID:     "layer-a",
		Status: "Verifying Checksum",
	})
	if progress.Current != 25 || progress.Total != 100 || progress.Indeterminate {
		t.Fatalf("progress = %+v, want current=25 total=100 determinate", progress)
	}
	if progress.Message != "layer-a Verifying Checksum" {
		t.Fatalf("message = %q, want %q", progress.Message, "layer-a Verifying Checksum")
	}
}

func TestPullProgressAggregator_ResetsLayerProgressWhenPhaseChanges(t *testing.T) {
	t.Parallel()

	aggregator := newPullProgressAggregator()

	aggregator.Update(jsonmessage.JSONMessage{
		ID:     "layer-a",
		Status: "Downloading",
		Progress: &jsonmessage.JSONProgress{
			Current: 100,
			Total:   100,
		},
	})

	progress := aggregator.Update(jsonmessage.JSONMessage{
		ID:     "layer-a",
		Status: "Extracting",
		Progress: &jsonmessage.JSONProgress{
			Current: 10,
			Total:   100,
		},
	})

	if progress.Current != 10 || progress.Total != 100 || progress.Indeterminate {
		t.Fatalf("progress = %+v, want current=10 total=100 determinate", progress)
	}
	if progress.Message != "layer-a Extracting" {
		t.Fatalf("message = %q, want %q", progress.Message, "layer-a Extracting")
	}
}

func TestPullProgressAggregator_IndeterminateWithoutLayerTotals(t *testing.T) {
	t.Parallel()

	aggregator := newPullProgressAggregator()
	progress := aggregator.Update(jsonmessage.JSONMessage{
		ID:     "layer-a",
		Status: "Waiting",
	})
	if !progress.Indeterminate {
		t.Fatalf("progress = %+v, want indeterminate", progress)
	}
	if progress.Current != 0 || progress.Total != 0 {
		t.Fatalf("progress = %+v, want zero totals", progress)
	}
}

func TestNormalizedLayerProgress_ClampsCurrentToTotal(t *testing.T) {
	t.Parallel()

	progress := normalizedLayerProgress(25, 10)
	if progress.current != 10 || progress.total != 10 {
		t.Fatalf("normalized progress = %+v, want current=10 total=10", progress)
	}
}

func TestNormalizedLayerProgress_ClampsNegativeCurrent(t *testing.T) {
	t.Parallel()

	progress := normalizedLayerProgress(-5, 10)
	if progress.current != 0 || progress.total != 10 {
		t.Fatalf("normalized progress = %+v, want current=0 total=10", progress)
	}
}

func TestUpdateTrackedProgress_ReplacesProgressWhenPhaseChanges(t *testing.T) {
	t.Parallel()

	tracked := map[string]layerProgress{
		"layer-a": {phase: "Downloading", current: 100, total: 100},
	}

	if !updateTrackedProgress(tracked, "layer-a", "Extracting", 10, 100) {
		t.Fatal("updateTrackedProgress() = false, want true")
	}

	got := tracked["layer-a"]
	if got.phase != "Extracting" || got.current != 10 || got.total != 100 {
		t.Fatalf("tracked progress = %+v, want phase=Extracting current=10 total=100", got)
	}
}

type fakeVersionClient struct {
	err           error
	serverVersion dockertypes.Version
	clientVersion string
}

func (c fakeVersionClient) ClientVersion() string {
	return c.clientVersion
}

func (c fakeVersionClient) ServerVersion(context.Context) (dockertypes.Version, error) {
	return c.serverVersion, c.err
}
