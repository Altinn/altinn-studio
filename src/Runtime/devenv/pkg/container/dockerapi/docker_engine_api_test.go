package dockerapi

import (
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/container/types"

	dockertypes "github.com/docker/docker/api/types"
	dockermount "github.com/docker/docker/api/types/mount"
	systemtypes "github.com/docker/docker/api/types/system"
	"github.com/docker/docker/pkg/jsonmessage"
)

func TestBuildBindMounts(t *testing.T) {
	t.Parallel()

	got := buildBindMounts([]types.VolumeMount{
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

func TestBuild_ColimaRequiresDockerCLIAtCallSite(t *testing.T) {
	t.Setenv("PATH", "")

	c := &Client{
		toolchain: types.ContainerToolchain{
			Platform: types.PlatformColima,
		},
	}

	err := c.Build(t.Context(), ".", "Dockerfile", "localtest:dev")
	if err == nil {
		t.Fatal("Build() error = nil, want non-nil")
	}
	if want := "container build CLI not found"; !strings.Contains(err.Error(), want) {
		t.Fatalf("Build() error = %q", err)
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

func TestBuildProgressAggregator_PreservesMonotonicStatusCurrent(t *testing.T) {
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
	if progress.Current != 100 || progress.Total != 100 || progress.Indeterminate {
		t.Fatalf("progress = %+v, want current=100 total=100 determinate", progress)
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

func TestPullProgressAggregator_KeepsLayerProgressMonotonicAcrossPhases(t *testing.T) {
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

	if progress.Current != 100 || progress.Total != 100 || progress.Indeterminate {
		t.Fatalf("progress = %+v, want current=100 total=100 determinate", progress)
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

func TestMergeLayerProgress_PreservesMonotonicCurrent(t *testing.T) {
	t.Parallel()

	merged := mergeLayerProgress(
		layerProgress{current: 100, total: 100},
		layerProgress{current: 10, total: 100},
	)
	if merged.current != 100 || merged.total != 100 {
		t.Fatalf("merged progress = %+v, want current=100 total=100", merged)
	}
}
