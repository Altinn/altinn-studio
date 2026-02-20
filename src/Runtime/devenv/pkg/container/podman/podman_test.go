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

func TestPodmanPushArgs(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		image string
		want  []string
	}{
		{
			name:  "local localhost registry",
			image: "localhost:5001/myapp:latest",
			want:  []string{"push", "--tls-verify=false", "localhost:5001/myapp:latest"},
		},
		{
			name:  "remote registry keeps tls verification",
			image: "ghcr.io/org/myapp:latest",
			want:  []string{"push", "ghcr.io/org/myapp:latest"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := podmanPushArgs(tt.image)
			if len(got) != len(tt.want) {
				t.Fatalf("podmanPushArgs() len = %d, want %d (%v)", len(got), len(tt.want), got)
			}
			for i := range got {
				if got[i] != tt.want[i] {
					t.Fatalf("podmanPushArgs() = %v, want %v", got, tt.want)
				}
			}
		})
	}
}
