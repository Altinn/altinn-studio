package harness

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"testing"
	"time"

	"github.com/docker/docker/pkg/stdcopy"

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

func EnsureVeraPDFImage(t *testing.T) string {
	t.Helper()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	projectRoot, err := FindProjectRoot()
	if err != nil {
		t.Fatalf("Failed to locate project root for veraPDF image build: %v", err)
	}

	dockerfilePath := filepath.Join(projectRoot, "Dockerfile.verapdf")
	if err := Runtime.ContainerClient.Build(ctx, projectRoot, dockerfilePath, veraPDFImageTag); err != nil {
		t.Fatalf("Failed to build veraPDF image: %v", err)
	}

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

	containerID, err := Runtime.ContainerClient.CreateContainer(waitCtx, container.ContainerConfig{
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
		if removeErr := Runtime.ContainerClient.ContainerRemove(
			context.Background(),
			containerID,
			true,
		); removeErr != nil {
			t.Logf("Failed to remove veraPDF container %s: %v", containerID, removeErr)
		}
	}()

	exitCode, err := Runtime.ContainerClient.ContainerWait(waitCtx, containerID)
	if err != nil {
		t.Fatalf("Failed waiting for veraPDF container: %v", err)
	}

	logsCtx, logsCancel := context.WithTimeout(context.Background(), time.Minute)
	defer logsCancel()

	stdout, stderr, err := readContainerOutput(logsCtx, Runtime.ContainerClient, containerID)
	if err != nil {
		t.Fatalf("Failed reading veraPDF container output: %v", err)
	}

	return &VeraPDFResult{
		ExitCode: exitCode,
		Stdout:   stdout,
		Stderr:   stderr,
	}
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

	var stdout bytes.Buffer
	var stderr bytes.Buffer

	if client.Toolchain().AccessMode == container.AccessDockerEngineAPI {
		if _, copyErr := stdcopy.StdCopy(&stdout, &stderr, logs); copyErr != nil {
			return "", "", fmt.Errorf("demux docker logs: %w", copyErr)
		}
	} else {
		if _, copyErr := io.Copy(&stdout, logs); copyErr != nil {
			return "", "", fmt.Errorf("read logs: %w", copyErr)
		}
	}

	return stdout.String(), stderr.String(), err
}

func NormalizeVeraPDFXML(report string) string {
	report = veraPDFTimeAttr.ReplaceAllString(report, `$1="0"`)
	report = veraPDFDuration.ReplaceAllString(report, `${1}00:00:00.000${2}`)
	return report
}
