package simple

import (
	"encoding/json"
	"fmt"
	"math"
	"os/exec"
	"testing"

	"altinn.studio/pdf3/test/harness"
)

// imageInfo represents the structure returned by docker/podman image inspect
type imageInfo struct {
	Size int64 `json:"Size"`
}

// getContainerRuntime detects whether docker or podman is available
func getContainerRuntime() (string, error) {
	if _, err := exec.LookPath("podman"); err == nil {
		return "podman", nil
	}
	if _, err := exec.LookPath("docker"); err == nil {
		return "docker", nil
	}
	return "", fmt.Errorf("neither docker nor podman found in PATH")
}

// getImageSize queries the container runtime for image size in bytes
func getImageSize(t *testing.T, runtime, image string) (int64, error) {
	cmd := exec.Command(runtime, "image", "inspect", image)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return 0, fmt.Errorf("failed to inspect image %s: %w\nOutput: %s", image, err, string(output))
	}

	var info []imageInfo
	if err := json.Unmarshal(output, &info); err != nil {
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
	runtime, err := getContainerRuntime()
	if err != nil {
		t.Fatalf("Failed to detect container runtime: %v", err)
	}

	proxyImage := "localhost:5001/runtime-pdf3-proxy:latest"
	workerImage := "localhost:5001/runtime-pdf3-worker:latest"

	proxySize, err := getImageSize(t, runtime, proxyImage)
	if err != nil {
		t.Fatalf("Failed to get proxy image size: %v", err)
	}

	workerSize, err := getImageSize(t, runtime, workerImage)
	if err != nil {
		t.Fatalf("Failed to get worker image size: %v", err)
	}

	proxySizeMiB := roundToNearestMiB(proxySize)
	workerSizeMiB := roundToNearestMiB(workerSize)

	output := fmt.Sprintf("Proxy:  %d MiB\nWorker: %d MiB\n", proxySizeMiB, workerSizeMiB)

	harness.Snapshot(t, []byte(output), "", "txt")

	t.Logf("Image sizes:\n%s", output)
}
