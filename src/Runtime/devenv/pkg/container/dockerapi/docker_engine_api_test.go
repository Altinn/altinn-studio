package dockerapi

import (
	"encoding/json"
	"errors"
	"io"
	"maps"
	"slices"
	"strings"
	"testing"
	"time"

	"altinn.studio/devenv/pkg/container/types"
)

var errNetworkActiveEndpoints = errors.New(
	`error response from daemon: error while removing network: network altinntestlocal_network has active endpoints`,
)

func TestBuildMounts(t *testing.T) {
	t.Parallel()

	got, _ := buildMounts([]types.VolumeMount{
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

	want := []mount{
		{
			Type:     "bind",
			Source:   "/Users/someuser/Library/Application Support/altinn-studio/data/testdata",
			Target:   "/testdata",
			ReadOnly: false,
		},
		{
			Type:     "bind",
			Source:   "/tmp/config.yaml",
			Target:   "/etc/config.yaml",
			ReadOnly: true,
		},
		{
			Type:     "volume",
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

	request, err := buildCreateRequest(cfg, types.PlatformPodman)
	hostCfg := request.HostConfig
	if err != nil {
		t.Fatalf("buildCreateRequest() error = %v", err)
	}

	if got := hostCfg.UsernsMode; got != "keep-id" {
		t.Fatalf("hostCfg.UsernsMode = %q, want keep-id", got)
	}
	wantBinds := []string{"/tmp/config.sql:/docker-entrypoint-initdb.d/01-tuning.sql:ro,z"}
	if !slices.Equal(hostCfg.Binds, wantBinds) {
		t.Fatalf("hostCfg.Binds = %#v, want %#v", hostCfg.Binds, wantBinds)
	}
	wantMounts := []mount{{
		Type:   "volume",
		Source: "postgres-data",
		Target: "/var/lib/postgresql",
	}}
	if !slices.Equal(hostCfg.Mounts, wantMounts) {
		t.Fatalf("hostCfg.Mounts = %#v, want %#v", hostCfg.Mounts, wantMounts)
	}
}

func TestBuildCreateRequest_TmpfsGoesToHostConfigTmpfsNotMounts(t *testing.T) {
	t.Parallel()

	cfg := types.ContainerConfig{
		Image: "postgres",
		Volumes: []types.VolumeMount{
			{
				HostPath:      "/certs",
				ContainerPath: "/certs",
				Type:          types.VolumeMountTypeBind,
				ReadOnly:      true,
			},
			{ContainerPath: "/var/lib/postgresql", Type: types.VolumeMountTypeTmpfs},
			{ContainerPath: "/data/blobs", Type: types.VolumeMountTypeTmpfs, Options: "size=1g"},
		},
	}

	request, err := buildCreateRequest(cfg, types.PlatformDocker)
	if err != nil {
		t.Fatalf("buildCreateRequest() error = %v", err)
	}

	hostCfg := request.HostConfig
	wantTmpfs := map[string]string{"/var/lib/postgresql": "", "/data/blobs": "size=1g"}
	if !maps.Equal(hostCfg.Tmpfs, wantTmpfs) {
		t.Fatalf("hostCfg.Tmpfs = %#v, want %#v", hostCfg.Tmpfs, wantTmpfs)
	}
	wantMounts := []mount{{Type: "bind", Source: "/certs", Target: "/certs", ReadOnly: true}}
	if !slices.Equal(hostCfg.Mounts, wantMounts) {
		t.Fatalf("hostCfg.Mounts = %#v, want %#v", hostCfg.Mounts, wantMounts)
	}
	if len(hostCfg.Binds) != 0 {
		t.Fatalf("hostCfg.Binds = %#v, want none", hostCfg.Binds)
	}

	encoded, err := json.Marshal(hostCfg)
	if err != nil {
		t.Fatalf("Marshal() error = %v", err)
	}
	if want := `"Tmpfs":{"/data/blobs":"size=1g","/var/lib/postgresql":""}`; !strings.Contains(string(encoded), want) {
		t.Fatalf("host config JSON = %s, want %s", encoded, want)
	}
}

func TestBuildTmpfs_NilWithoutTmpfsMounts(t *testing.T) {
	t.Parallel()

	got := buildTmpfs(
		[]types.VolumeMount{{HostPath: "data", ContainerPath: "/data", Type: types.VolumeMountTypeVolume}},
	)
	if got != nil {
		t.Fatalf("buildTmpfs() = %#v, want nil", got)
	}
}

func TestBuildCreateRequest_DockerCapAddHasNoPodmanDefaults(t *testing.T) {
	t.Parallel()

	request, err := buildCreateRequest(
		types.ContainerConfig{Image: "alpine", CapAdd: []string{"net_admin"}},
		types.PlatformDocker,
	)
	if err != nil {
		t.Fatalf("buildCreateRequest() error = %v", err)
	}
	if want := []string{"CAP_NET_ADMIN"}; !slices.Equal(request.HostConfig.CapAdd, want) {
		t.Fatalf("hostCfg.CapAdd = %#v, want %#v", request.HostConfig.CapAdd, want)
	}
}

func TestBuildPortMappings(t *testing.T) {
	t.Parallel()

	portBindings, exposedPorts, err := buildPortMappings([]types.PortMapping{
		{HostIP: "127.0.0.1", HostPort: "5005", ContainerPort: "5005"},
		{HostIP: "::1", HostPort: "5005", ContainerPort: "5005"},
		{HostPort: "5353", ContainerPort: "53", Protocol: "udp"},
	})
	if err != nil {
		t.Fatalf("buildPortMappings() error = %v", err)
	}

	tcpPort := "5005/tcp"
	udpPort := "53/udp"
	if _, ok := exposedPorts[tcpPort]; !ok {
		t.Fatalf("exposedPorts = %v, want %v", exposedPorts, tcpPort)
	}
	if _, ok := exposedPorts[udpPort]; !ok {
		t.Fatalf("exposedPorts = %v, want %v", exposedPorts, udpPort)
	}
	wantTCP := []portBinding{
		{HostIP: "127.0.0.1", HostPort: "5005"},
		{HostIP: "::1", HostPort: "5005"},
	}
	if !slices.Equal(portBindings[tcpPort], wantTCP) {
		t.Fatalf("portBindings[%v] = %#v, want %#v", tcpPort, portBindings[tcpPort], wantTCP)
	}
	wantUDP := []portBinding{{HostPort: "5353"}}
	if !slices.Equal(portBindings[udpPort], wantUDP) {
		t.Fatalf("portBindings[%v] = %#v, want %#v", udpPort, portBindings[udpPort], wantUDP)
	}

	encoded, err := json.Marshal(portBindings)
	if err != nil {
		t.Fatalf("Marshal() error = %v", err)
	}
	wantJSON := `{"5005/tcp":[{"HostIp":"127.0.0.1","HostPort":"5005"},{"HostIp":"::1","HostPort":"5005"}],"53/udp":[{"HostIp":"","HostPort":"5353"}]}`
	if string(encoded) != wantJSON {
		t.Fatalf("port bindings JSON = %s, want %s", encoded, wantJSON)
	}

	for _, port := range []types.PortMapping{
		{HostIP: "localhost", ContainerPort: "80"},
		{ContainerPort: "invalid"},
		{ContainerPort: "65536"},
	} {
		if _, _, err := buildPortMappings([]types.PortMapping{port}); !errors.Is(err, errInvalidPortMapping) {
			t.Fatalf("buildPortMappings(%+v) error = %v, want errInvalidPortMapping", port, err)
		}
	}
}

func TestPublishedPortsFromPortMap_UnsetHostIPIsEmpty(t *testing.T) {
	t.Parallel()

	got := publishedPortsFromPortMap(map[string][]portBinding{
		"5005/tcp": {{HostPort: "5005"}},
	})

	want := []types.PublishedPort{{HostIP: "", HostPort: "5005", ContainerPort: "5005", Protocol: "tcp"}}
	if !slices.Equal(got, want) {
		t.Fatalf("publishedPortsFromPortMap() = %#v, want %#v", got, want)
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
		version versionResponse
		want    types.ContainerPlatform
	}{
		{
			name: "podman platform wins",
			version: versionResponse{
				Platform: versionPlatform{Name: "Podman Engine"},
			},
			want: types.PlatformPodman,
		},
		{
			name: "docker component name",
			version: versionResponse{
				Components: []versionComponent{
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

	info := infoResponse{
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
		info infoResponse
		want bool
	}{
		{
			name: "selinux enabled",
			info: infoResponse{
				SecurityOptions: []string{"name=seccomp,profile=default", "name=selinux"},
			},
			want: true,
		},
		{
			name: "selinux absent",
			info: infoResponse{
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

func TestDemuxDockerLogs_CloseWithUnreadOutput(t *testing.T) {
	t.Parallel()
	logs := demuxDockerLogs(io.NopCloser(strings.NewReader(dockerLogFrame(1, "unread"))))
	if err := logs.Close(); err != nil {
		t.Fatal(err)
	}
	output, err := io.ReadAll(logs)
	if err != nil || len(output) != 0 {
		t.Fatalf("closed log stream returned %q, %v; want EOF", output, err)
	}
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

	first := aggregator.Update(pullMessage{
		ID:     "layer-a",
		Status: "Downloading",
		Progress: &pullProgress{
			Current: 25,
			Total:   100,
		},
	})
	if first.Current != 25 || first.Total != 100 || first.Indeterminate {
		t.Fatalf("first progress = %+v, want current=25 total=100 determinate", first)
	}

	second := aggregator.Update(pullMessage{
		ID:     "layer-b",
		Status: "Downloading",
		Progress: &pullProgress{
			Current: 10,
			Total:   50,
		},
	})
	if second.Current != 35 || second.Total != 150 || second.Indeterminate {
		t.Fatalf("second progress = %+v, want current=35 total=150 determinate", second)
	}

	third := aggregator.Update(pullMessage{
		ID:     "layer-a",
		Status: "Extracting",
		Progress: &pullProgress{
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
	aggregator.Update(pullMessage{
		ID:     "layer-a",
		Status: "Downloading",
		Progress: &pullProgress{
			Current: 25,
			Total:   100,
		},
	})

	progress := aggregator.Update(pullMessage{
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

	aggregator.Update(pullMessage{
		ID:     "layer-a",
		Status: "Downloading",
		Progress: &pullProgress{
			Current: 100,
			Total:   100,
		},
	})

	progress := aggregator.Update(pullMessage{
		ID:     "layer-a",
		Status: "Extracting",
		Progress: &pullProgress{
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
	progress := aggregator.Update(pullMessage{
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
