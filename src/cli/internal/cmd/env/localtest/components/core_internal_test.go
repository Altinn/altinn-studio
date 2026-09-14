package components

import (
	"testing"
)

// Testdata is baked into the localtest image at /testdata. Mounting a host directory over it would
// shadow the image copy and let the two drift apart, so no localtest volume may target it.
func TestLocaltestContainer_NoTestdataMount(t *testing.T) {
	t.Parallel()

	spec := localtestContainer(newOptions(t.TempDir(), false, false))

	for _, volume := range spec.Volumes {
		if volume.ContainerPath == "/testdata" || volume.ContainerPath == "/testdata/" {
			t.Fatalf("localtest volume mounts %q over the image testdata (host path %q)",
				volume.ContainerPath, volume.HostPath)
		}
	}
}

func TestLocaltestContainer_StaticTestDataPathUsesImageCopy(t *testing.T) {
	t.Parallel()

	spec := localtestContainer(newOptions(t.TempDir(), false, false))

	const key = "LocalPlatformSettings__LocalTestingStaticTestDataPath"
	got, ok := spec.Environment[key]
	if !ok {
		t.Fatalf("missing environment variable %q", key)
	}
	if got != "/testdata/" {
		t.Fatalf("%s = %q, want %q", key, got, "/testdata/")
	}
}
