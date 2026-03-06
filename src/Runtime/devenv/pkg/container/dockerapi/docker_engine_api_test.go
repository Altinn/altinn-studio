package dockerapi

import (
	"testing"

	"altinn.studio/devenv/pkg/container/types"

	dockermount "github.com/docker/docker/api/types/mount"
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
