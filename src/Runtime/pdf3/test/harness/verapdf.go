package harness

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"testing"
	"time"

	"altinn.studio/devenv/pkg/container"
)

const (
	veraPDFImageTag = "localtest-verapdf:1.28.2"
	veraPDFWorkDir  = "/data"
)

type VeraPDFResult struct {
	Stdout   string
	Stderr   string
	ExitCode int
}

var (
	veraPDFTimeAttr = regexp.MustCompile(`(start|finish)="\d+"`)
	veraPDFDuration = regexp.MustCompile(`(<duration[^>]*>)[^<]*(</duration>)`)
)

func withContainerClient(t *testing.T, run func(container.ContainerClient)) {
	t.Helper()

	if Runtime != nil {
		run(Runtime.ContainerClient)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()

	client, err := container.Detect(ctx)
	if err != nil {
		t.Fatalf("Failed to detect container runtime: %v", err)
	}
	defer func() {
		if closeErr := client.Close(); closeErr != nil {
			t.Logf("Failed to close container client: %v", closeErr)
		}
	}()

	run(client)
}

func EnsureVeraPDFImage(t *testing.T) string {
	t.Helper()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	projectRoot, err := FindProjectRoot()
	if err != nil {
		t.Fatalf("Failed to locate project root for veraPDF image build: %v", err)
	}

	dockerfilePath := filepath.Join(projectRoot, "Dockerfile.verapdf")
	withContainerClient(t, func(client container.ContainerClient) {
		if buildErr := client.Build(ctx, projectRoot, dockerfilePath, veraPDFImageTag); buildErr != nil {
			t.Fatalf("Failed to build veraPDF image: %v", buildErr)
		}
	})

	return veraPDFImageTag
}

func ValidatePDFWithVeraPDF(t *testing.T, pdf []byte) *VeraPDFResult {
	t.Helper()

	image := EnsureVeraPDFImage(t)
	tempDir := t.TempDir()
	inputPath := filepath.Join(tempDir, "input.pdf")
	if err := os.WriteFile(inputPath, pdf, 0o600); err != nil {
		t.Fatalf("Failed to write PDF input for veraPDF: %v", err)
	}

	containerName := fmt.Sprintf("pdf3-verapdf-%d", time.Now().UnixNano())
	waitCtx, waitCancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer waitCancel()

	var result *VeraPDFResult
	withContainerClient(t, func(client container.ContainerClient) {
		containerID, err := client.CreateContainer(waitCtx, container.ContainerConfig{
			Name:   containerName,
			Image:  image,
			Detach: true,
			User:   fmt.Sprintf("%d:%d", os.Getuid(), os.Getgid()),
			Volumes: []container.VolumeMount{
				{
					HostPath:      tempDir,
					ContainerPath: veraPDFWorkDir,
					ReadOnly:      true,
				},
			},
			Command: []string{
				"--format", "xml",
				"--defaultflavour", "2b",
				filepath.Join(veraPDFWorkDir, filepath.Base(inputPath)),
			},
		})
		if err != nil {
			t.Fatalf("Failed to start veraPDF container: %v", err)
		}
		defer func() {
			if removeErr := client.ContainerRemove(
				context.Background(),
				containerID,
				true,
			); removeErr != nil {
				t.Logf("Failed to remove veraPDF container %s: %v", containerID, removeErr)
			}
		}()

		exitCode, err := client.ContainerWait(waitCtx, containerID)
		if err != nil {
			t.Fatalf("Failed waiting for veraPDF container: %v", err)
		}

		logsCtx, logsCancel := context.WithTimeout(context.Background(), time.Minute)
		defer logsCancel()

		stdout, stderr, err := readContainerOutput(logsCtx, client, containerID)
		if err != nil {
			t.Fatalf("Failed reading veraPDF container output: %v", err)
		}

		result = &VeraPDFResult{
			ExitCode: exitCode,
			Stdout:   stdout,
			Stderr:   stderr,
		}
	})

	return result
}

func readContainerOutput(
	ctx context.Context,
	client container.ContainerClient,
	containerID string,
) (stdoutText string, stderrText string, err error) {
	logs, err := client.ContainerLogs(ctx, containerID, false, "all")
	if err != nil {
		return "", "", fmt.Errorf("container logs: %w", err)
	}
	defer func() {
		if closeErr := logs.Close(); closeErr != nil && err == nil {
			err = fmt.Errorf("close logs: %w", closeErr)
		}
	}()

	output, copyErr := io.ReadAll(logs)
	if copyErr != nil {
		return "", "", fmt.Errorf("read logs: %w", copyErr)
	}

	return string(output), "", err
}

func NormalizeVeraPDFXML(report string) string {
	report = veraPDFTimeAttr.ReplaceAllString(report, `$1="0"`)
	report = veraPDFDuration.ReplaceAllString(report, `${1}00:00:00.000${2}`)
	return report
}
