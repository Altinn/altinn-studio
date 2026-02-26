package simple

import (
	"context"
	"fmt"
	"math"
	"testing"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/pdf3/test/harness"
)

// getImageSize queries the container runtime for image size in bytes
func getImageSize(t *testing.T, cli container.ContainerClient, image string) (int64, error) {
	info, err := cli.ImageInspect(context.Background(), image)
	if err != nil {
		return 0, err
	}
	return info.Size, nil
}

// roundToNearestMiB converts bytes to MiB and rounds to nearest integer
func roundToNearestMiB(bytes int64) int64 {
	mib := float64(bytes) / (1024.0 * 1024.0)
	return int64(math.Round(mib))
}

func Test_ImageSizes(t *testing.T) {
	t.Skip("Size reporting is a little different between overlayfs and the new containerd image store which becomes default in v29")

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
