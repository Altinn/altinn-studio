package simple

import (
	"encoding/json"
	"fmt"
	"math"
	"testing"

	"altinn.studio/pdf3/test/harness"
	"altinn.studio/runtime-fixture/pkg/container"
)

// imageInfo represents the structure returned by docker/podman image inspect
type imageInfo struct {
	Size int64 `json:"Size"`
}

// getImageSize queries the container runtime for image size in bytes
func getImageSize(t *testing.T, cli container.ContainerClient, image string) (int64, error) {
	output, err := cli.ImageInspect(image, "")
	if err != nil {
		return 0, err
	}

	var info []imageInfo
	if err := json.Unmarshal([]byte(output), &info); err != nil {
		return 0, fmt.Errorf("failed to parse image inspect output: %w", err)
	}

	if len(info) == 0 {
		return 0, fmt.Errorf("no image info returned for %s", image)
	}

	return info[0].Size, nil
}

// roundToNearestMiB converts bytes to MiB and rounds to nearest integer
func roundToNearestMiB(bytes int64) int64 {
	mib := float64(bytes) / (1024.0 * 1024.0)
	return int64(math.Round(mib))
}

func Test_ImageSizes(t *testing.T) {
	proxyImage := "localhost:5001/runtime-pdf3-proxy:latest"
	workerImage := "localhost:5001/runtime-pdf3-worker:latest"

	client := harness.Runtime.ContainerClient
	proxySize, err := getImageSize(t, client, proxyImage)
	if err != nil {
		t.Fatalf("Failed to get proxy image size: %v", err)
	}

	workerSize, err := getImageSize(t, client, workerImage)
	if err != nil {
		t.Fatalf("Failed to get worker image size: %v", err)
	}

	proxySizeMiB := roundToNearestMiB(proxySize)
	workerSizeMiB := roundToNearestMiB(workerSize)

	output := fmt.Sprintf("Proxy:  %d MiB\nWorker: %d MiB\n", proxySizeMiB, workerSizeMiB)

	harness.Snapshot(t, []byte(output), "", "txt")

	t.Logf("Image sizes:\n%s", output)
}
