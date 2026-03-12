package dockerapi

import (
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/container/types"

	dockertypes "github.com/docker/docker/api/types"
	dockermount "github.com/docker/docker/api/types/mount"
	systemtypes "github.com/docker/docker/api/types/system"
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
