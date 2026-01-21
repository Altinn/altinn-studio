package podman

import (
	"errors"
	"testing"

	"altinn.studio/devenv/pkg/container/types"
)

func TestParseContainerInspect_ImageIDUsesImageNotDigest(t *testing.T) {
	t.Parallel()

	output := []byte(`[
  {
    "Id": "container-id",
    "Name": "my-container",
    "Image": "sha256:image-id",
    "ImageDigest": "sha256:manifest-digest",
    "Config": { "Labels": { "k": "v" } },
    "State": { "Status": "running", "Running": true, "Paused": false, "ExitCode": 0 }
  }
]`)

	info, err := parseContainerInspect(output)
	if err != nil {
		t.Fatalf("parseContainerInspect() error: %v", err)
	}
	if info.ImageID != "sha256:image-id" {
		t.Fatalf("ImageID = %q, want %q", info.ImageID, "sha256:image-id")
	}
}

func TestParseContainerInspect_Empty_ReturnsNotFound(t *testing.T) {
	t.Parallel()

	_, err := parseContainerInspect([]byte(`[]`))
	if !errors.Is(err, types.ErrContainerNotFound) {
		t.Fatalf("error = %v, want ErrContainerNotFound", err)
	}
}
