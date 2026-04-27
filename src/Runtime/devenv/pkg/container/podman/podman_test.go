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

func TestParseContainerInspect_HealthStatus(t *testing.T) {
	t.Parallel()

	output := []byte(`[
  {
    "Id": "container-id",
    "Name": "my-container",
    "Image": "sha256:image-id",
    "Config": { "Labels": {} },
    "State": {
      "Status": "running",
      "Running": true,
      "Paused": false,
      "ExitCode": 0,
      "Healthcheck": { "Status": "healthy" }
    }
  }
]`)

	info, err := parseContainerInspect(output)
	if err != nil {
		t.Fatalf("parseContainerInspect() error: %v", err)
	}
	if info.State.HealthStatus != "healthy" {
		t.Fatalf("HealthStatus = %q, want healthy", info.State.HealthStatus)
	}
}

func TestParseContainerInspect_Empty_ReturnsNotFound(t *testing.T) {
	t.Parallel()

	_, err := parseContainerInspect([]byte(`[]`))
	if !errors.Is(err, types.ErrContainerNotFound) {
		t.Fatalf("error = %v, want ErrContainerNotFound", err)
	}
}

func TestIsContainerNotFoundOutput(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name   string
		output []byte
		want   bool
	}{
		{
			name:   "docker style no such container",
			output: []byte("Error: No such container: monitoring_mimir"),
			want:   true,
		},
		{
			name:   "container does not exist",
			output: []byte("Error: container does not exist: monitoring_mimir"),
			want:   true,
		},
		{
			name:   "non-not-found error",
			output: []byte("Error: permission denied"),
			want:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := isContainerNotFoundOutput(tt.output)
			if got != tt.want {
				t.Fatalf("isContainerNotFoundOutput() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestIsVolumeNotFoundOutput(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name   string
		output []byte
		want   bool
	}{
		{
			name:   "no such volume",
			output: []byte("Error: no such volume localtest-workflow-engine-db-data"),
			want:   true,
		},
		{
			name:   "volume does not exist",
			output: []byte("Error: volume does not exist"),
			want:   true,
		},
		{
			name:   "non-not-found error",
			output: []byte("Error: volume is being used by container"),
			want:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := isVolumeNotFoundOutput(tt.output)
			if got != tt.want {
				t.Fatalf("isVolumeNotFoundOutput() = %v, want %v", got, tt.want)
			}
		})
	}
}
