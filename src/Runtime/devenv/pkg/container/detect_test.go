package container

import (
	"context"
	"errors"
	"os/exec"
	"testing"

	containermock "altinn.studio/devenv/pkg/container/mock"
)

var errTransientFailure = errors.New("transient failure")

const (
	testDockerBinary     = "docker"
	testPodmanBinary     = "podman"
	testDockerBinaryPath = "/bin/docker"
	testPodmanBinaryPath = "/bin/podman"
	testDockerSocketPath = "/tmp/docker.sock"
	testPodmanSocketPath = "/tmp/podman.sock"
	testDockerSocketHost = "unix://" + testDockerSocketPath
	testPodmanSocketHost = "unix://" + testPodmanSocketPath
	testColimaSocketPath = "/tmp/colima/docker.sock"
	testColimaSocketHost = "unix://" + testColimaSocketPath
)

func TestDetect_RetriesAfterTransientFailure(t *testing.T) {
	calls := 0
	d := newDetector(detectorDeps{
		detectPlatform: func(context.Context) (ContainerPlatform, error) {
			calls++
			if calls == 1 {
				return PlatformUnknown, errTransientFailure
			}
			return PlatformPodman, nil
		},
		lookupPath: func(file string) (string, error) {
			if file == testPodmanBinary && calls > 1 {
				return testPodmanBinaryPath, nil
			}
			return "", exec.ErrNotFound
		},
		newClient: func(context.Context, ContainerToolchain) (ContainerClient, error) {
			return containermock.New(), nil
		},
	})

	if _, err := d.Detect(t.Context()); err == nil {
		t.Fatal("Detect() expected transient error, got nil")
	}

	if _, err := d.Detect(t.Context()); err != nil {
		t.Fatalf("Detect() on retry error = %v", err)
	}

	if calls != 2 {
		t.Fatalf("detectRuntime calls = %d, want 2", calls)
	}
}

func TestDetectToolchain_DefaultDockerHostWithoutDockerCLISucceeds(t *testing.T) {
	t.Setenv("DOCKER_HOST", testDockerSocketHost)

	d := newDetector(detectorDeps{
		detectPlatform: func(context.Context) (ContainerPlatform, error) {
			return PlatformDocker, nil
		},
		lookupPath: func(string) (string, error) {
			return "", exec.ErrNotFound
		},
	})

	got, err := d.detectToolchain(t.Context())
	if err != nil {
		t.Fatalf("detectToolchain() error = %v", err)
	}
	if got.Platform != PlatformDocker || got.AccessMode != AccessDockerEngineAPI || got.Source != SourceDockerHostEnv {
		t.Fatalf("detectToolchain() = %#v", got)
	}
}

func TestDetectToolchain_DockerContextClassifiesPodmanSocket(t *testing.T) {
	d := newDetector(detectorDeps{
		detectPlatform: func(context.Context) (ContainerPlatform, error) {
			return PlatformUnknown, errTransientFailure
		},
		dockerContextHost: func(context.Context) (string, error) {
			return testPodmanSocketHost, nil
		},
		detectPlatformWithHost: func(_ context.Context, host string) (ContainerPlatform, error) {
			if host != testPodmanSocketHost {
				t.Fatalf("unexpected host %q", host)
			}
			return PlatformPodman, nil
		},
		lookupPath: func(file string) (string, error) {
			switch file {
			case testDockerBinary:
				return testDockerBinaryPath, nil
			case testPodmanBinary:
				return testPodmanBinaryPath, nil
			default:
				return "", exec.ErrNotFound
			}
		},
		dockerSocketPaths: func() []string { return nil },
		podmanSocketPaths: func() []string { return nil },
		fileExists:        func(string) bool { return false },
	})

	got, err := d.detectToolchain(t.Context())
	if err != nil {
		t.Fatalf("detectToolchain() error = %v", err)
	}
	if got.AccessMode != AccessDockerEngineAPI || got.Platform != PlatformPodman ||
		got.Source != SourceDockerContext ||
		got.SocketPath != testPodmanSocketPath {
		t.Fatalf("detectToolchain() = %#v", got)
	}
}

func TestDetectToolchain_DockerSocketWithoutDockerCLISucceeds(t *testing.T) {
	d := newDetector(detectorDeps{
		detectPlatform: func(context.Context) (ContainerPlatform, error) {
			return PlatformUnknown, errTransientFailure
		},
		dockerContextHost: func(context.Context) (string, error) {
			return "", errTransientFailure
		},
		detectPlatformWithHost: func(_ context.Context, host string) (ContainerPlatform, error) {
			if host != testDockerSocketHost {
				t.Fatalf("unexpected host %q", host)
			}
			return PlatformDocker, nil
		},
		lookupPath: func(string) (string, error) {
			return "", exec.ErrNotFound
		},
		dockerSocketPaths: func() []string { return []string{testDockerSocketPath} },
		podmanSocketPaths: func() []string { return nil },
		fileExists:        func(path string) bool { return path == testDockerSocketPath },
	})

	got, err := d.detectToolchain(t.Context())
	if err != nil {
		t.Fatalf("detectToolchain() error = %v", err)
	}
	if got.Platform != PlatformDocker || got.AccessMode != AccessDockerEngineAPI || got.Source != SourceKnownSocket {
		t.Fatalf("detectToolchain() = %#v", got)
	}
}

func TestDetectToolchain_DockerContextClassifiesDockerWithDockerCLI(t *testing.T) {
	d := newDetector(detectorDeps{
		detectPlatform: func(context.Context) (ContainerPlatform, error) {
			return PlatformUnknown, errTransientFailure
		},
		dockerContextHost: func(context.Context) (string, error) {
			return testDockerSocketHost, nil
		},
		detectPlatformWithHost: func(_ context.Context, host string) (ContainerPlatform, error) {
			if host != testDockerSocketHost {
				t.Fatalf("unexpected host %q", host)
			}
			return PlatformDocker, nil
		},
		lookupPath: func(file string) (string, error) {
			if file == testDockerBinary {
				return testDockerBinaryPath, nil
			}
			return "", exec.ErrNotFound
		},
		dockerSocketPaths: func() []string { return nil },
		podmanSocketPaths: func() []string { return nil },
		fileExists:        func(string) bool { return false },
	})

	got, err := d.detectToolchain(t.Context())
	if err != nil {
		t.Fatalf("detectToolchain() error = %v", err)
	}
	if got.AccessMode != AccessDockerEngineAPI || got.Platform != PlatformDocker ||
		got.Source != SourceDockerContext ||
		got.SocketPath != testDockerSocketPath {
		t.Fatalf("detectToolchain() = %#v", got)
	}
}

func TestDetectToolchain_PodmanSocketFallbackClassifiesPodman(t *testing.T) {
	d := newDetector(detectorDeps{
		detectPlatform: func(context.Context) (ContainerPlatform, error) {
			return PlatformUnknown, errTransientFailure
		},
		dockerContextHost: func(context.Context) (string, error) {
			return "", errTransientFailure
		},
		detectPlatformWithHost: func(_ context.Context, host string) (ContainerPlatform, error) {
			if host != testPodmanSocketHost {
				t.Fatalf("unexpected host %q", host)
			}
			return PlatformPodman, nil
		},
		lookupPath: func(file string) (string, error) {
			if file == testPodmanBinary {
				return testPodmanBinaryPath, nil
			}
			return "", exec.ErrNotFound
		},
		dockerSocketPaths: func() []string { return nil },
		podmanSocketPaths: func() []string { return []string{testPodmanSocketPath} },
		fileExists:        func(path string) bool { return path == testPodmanSocketPath },
	})

	got, err := d.detectToolchain(t.Context())
	if err != nil {
		t.Fatalf("detectToolchain() error = %v", err)
	}
	if got.AccessMode != AccessDockerEngineAPI || got.Platform != PlatformPodman ||
		got.Source != SourceKnownSocket ||
		got.SocketPath != testPodmanSocketPath {
		t.Fatalf("detectToolchain() = %#v", got)
	}
}

func TestDetectToolchain_DockerContextColimaBeatsPodmanSocket(t *testing.T) {
	d := newDetector(detectorDeps{
		detectPlatform: func(context.Context) (ContainerPlatform, error) {
			return PlatformUnknown, errTransientFailure
		},
		dockerContextHost: func(context.Context) (string, error) {
			return testColimaSocketHost, nil
		},
		detectPlatformWithHost: func(_ context.Context, host string) (ContainerPlatform, error) {
			switch host {
			case testColimaSocketHost:
				return PlatformColima, nil
			case testPodmanSocketHost:
				return PlatformPodman, nil
			default:
				t.Fatalf("unexpected host %q", host)
				return PlatformUnknown, nil
			}
		},
		lookupPath: func(file string) (string, error) {
			switch file {
			case testDockerBinary:
				return testDockerBinaryPath, nil
			case testPodmanBinary:
				return testPodmanBinaryPath, nil
			default:
				return "", exec.ErrNotFound
			}
		},
		dockerSocketPaths: func() []string { return nil },
		podmanSocketPaths: func() []string { return []string{testPodmanSocketPath} },
		fileExists:        func(path string) bool { return path == testPodmanSocketPath },
	})

	got, err := d.detectToolchain(t.Context())
	if err != nil {
		t.Fatalf("detectToolchain() error = %v", err)
	}
	if got.Platform != PlatformColima || got.AccessMode != AccessDockerEngineAPI || got.Source != SourceDockerContext {
		t.Fatalf("detectToolchain() = %#v", got)
	}
}

func TestDetectToolchain_ExplicitDockerHostBeatsOtherCandidates(t *testing.T) {
	t.Setenv("DOCKER_HOST", testPodmanSocketHost)

	d := newDetector(detectorDeps{
		detectPlatform: func(context.Context) (ContainerPlatform, error) {
			return PlatformPodman, nil
		},
		dockerContextHost: func(context.Context) (string, error) {
			return testColimaSocketHost, nil
		},
		detectPlatformWithHost: func(_ context.Context, host string) (ContainerPlatform, error) {
			switch host {
			case testColimaSocketHost:
				return PlatformColima, nil
			case testPodmanSocketHost:
				return PlatformPodman, nil
			default:
				t.Fatalf("unexpected host %q", host)
				return PlatformUnknown, nil
			}
		},
		lookupPath: func(file string) (string, error) {
			switch file {
			case testDockerBinary:
				return testDockerBinaryPath, nil
			case testPodmanBinary:
				return testPodmanBinaryPath, nil
			default:
				return "", exec.ErrNotFound
			}
		},
		dockerSocketPaths: func() []string { return []string{testColimaSocketPath} },
		podmanSocketPaths: func() []string { return []string{testPodmanSocketPath} },
		fileExists: func(path string) bool {
			return path == testColimaSocketPath || path == testPodmanSocketPath
		},
	})

	got, err := d.detectToolchain(t.Context())
	if err != nil {
		t.Fatalf("detectToolchain() error = %v", err)
	}
	if got.Platform != PlatformPodman || got.AccessMode != AccessDockerEngineAPI || got.Source != SourceDockerHostEnv {
		t.Fatalf("detectToolchain() = %#v", got)
	}
}
