package cmd

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strconv"
	"sync/atomic"
	"testing"
	"time"

	"altinn.studio/devenv/pkg/container"
	containermock "altinn.studio/devenv/pkg/container/mock"
	containertypes "altinn.studio/devenv/pkg/container/types"
	containerbackend "altinn.studio/devenv/pkg/resource/executor/container"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/localtestv2"
	"altinn.studio/studioctl/internal/ui"
)

func TestAnAppOnTheHostIsReachedThroughTheHostGateway(t *testing.T) {
	t.Parallel()
	got, err := hostAppURL("http://127.0.0.1:5005")
	if err != nil || got != "http://host.docker.internal:5005" {
		t.Fatalf("hostAppURL = %q, %v", got, err)
	}
	if _, err := hostAppURL("http://127.0.0.1"); err == nil {
		t.Fatal("hostAppURL accepted a URL without a port")
	}
}

// A container-mode app is registered at its alias on the localtest-v2 network. The run waits for exactly that address.
func TestTheRunWaitsForTheRegistrationAtTheAddressItWasGiven(t *testing.T) {
	t.Parallel()
	cfg := &config.Config{Home: t.TempDir(), DataDir: t.TempDir(), Version: config.NewVersion("test-version")}
	if err := localtestv2.WriteState(cfg, localtestv2.State{CertificateDir: t.TempDir()}); err != nil {
		t.Fatal(err)
	}
	since := time.Now()
	frontDoor := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if _, err := fmt.Fprintf(w,
			`[{"org":"ttd","app":"test-app","url":"http://ttd-test-app:5005",`+
				`"provisioning":{"state":"succeeded","at":%q}}]`,
			since.Add(time.Second).UTC().Format(time.RFC3339Nano),
		); err != nil {
			t.Error(err)
		}
	}))
	t.Cleanup(frontDoor.Close)
	host, port, err := net.SplitHostPort(frontDoor.Listener.Addr().String())
	if err != nil {
		t.Fatal(err)
	}
	topology := envtopology.NewLocalAt(host, port)

	if err := waitForFrontDoorRegistration(
		t.Context(), cfg, localtestV2Containers(true), topology, "ttd/test-app", "http://ttd-test-app:5005", since,
		2*time.Second,
	); err != nil {
		t.Fatalf("at the alias: %v", err)
	}
	if err := waitForFrontDoorRegistration(
		t.Context(), cfg, localtestV2Containers(true), topology, "ttd/test-app", "http://host.docker.internal:5005",
		since, time.Second,
	); err == nil {
		t.Fatal("a registration at the alias counted for the host's port")
	}
}

// localtestV2Containers is a container runtime where a localtest-v2 container runs or none does.
func localtestV2Containers(running bool) localtestv2.ContainerClientFunc {
	return func(context.Context) (container.ContainerClient, error) {
		client := containermock.New()
		client.ListContainersFunc = func(
			_ context.Context,
			filter containertypes.ContainerListFilter,
		) ([]containertypes.ContainerInfo, error) {
			if !running || filter.Labels[containerbackend.GraphIDLabel] != localtestv2.GraphID {
				return nil, nil
			}
			return []containertypes.ContainerInfo{
				{Name: "localtest-v2-localtest", State: containertypes.ContainerState{Running: true}},
			}, nil
		}
		return client, nil
	}
}

// frontDoorServer is a front door that counts its requests and answers each with an empty app list.
func frontDoorServer(t *testing.T) (*httptest.Server, *atomic.Int32) {
	t.Helper()
	var requests atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		requests.Add(1)
		w.Header().Set("Content-Type", "application/json")
		if _, err := io.WriteString(w, "[]"); err != nil {
			t.Error(err)
		}
	}))
	t.Cleanup(server.Close)
	return server, &requests
}

// localtestV2At writes a state file for an environment whose origin is server's address, and returns a run command
// whose container runtime has localtest-v2's containers running or not.
func localtestV2At(t *testing.T, address string, running bool) *RunCommand {
	t.Helper()
	cfg := &config.Config{Home: t.TempDir(), DataDir: t.TempDir(), Version: config.NewVersion("test-version")}
	host, port, err := net.SplitHostPort(address)
	if err != nil {
		t.Fatal(err)
	}
	publicPort, err := strconv.Atoi(port)
	if err != nil {
		t.Fatal(err)
	}
	if err := localtestv2.WriteState(cfg, localtestv2.State{
		CertificateDir: t.TempDir(), PublicHost: host, PublicPort: publicPort,
	}); err != nil {
		t.Fatal(err)
	}
	cmd := newRunCommand(cfg, ui.NewOutput(io.Discard, io.Discard, false), nil)
	cmd.containers = localtestV2Containers(running)
	return cmd
}

// A state file whose containers are gone (a reboot, a docker rm) is no localtest-v2: the run goes on at the default
// origin without asking the front door.
func TestARunWhenTheRecordedEnvironmentHasNoContainersIsWithoutLocaltestV2(t *testing.T) {
	t.Parallel()
	server, requests := frontDoorServer(t)
	cmd := localtestV2At(t, server.Listener.Addr().String(), false)

	topology, err := cmd.runTopology(t.Context())
	if err != nil {
		t.Fatalf("runTopology() error = %v", err)
	}
	if want := envtopology.NewLocal(envtopology.DefaultIngressPortString()); topology != want {
		t.Errorf("runTopology() = %+v, want the default %+v", topology, want)
	}
	if requests.Load() != 0 {
		t.Errorf("the front door got %d requests, want none", requests.Load())
	}
}

// A running environment whose front door does not answer stops the run at once too.
func TestARunStopsAtOnceWhenTheFrontDoorDoesNotAnswer(t *testing.T) {
	t.Parallel()
	server, _ := frontDoorServer(t)
	address := server.Listener.Addr().String()
	server.Close()
	cmd := localtestV2At(t, address, true)

	_, err := cmd.runTopology(t.Context())
	if !errors.Is(err, errFrontDoorUnreachable) {
		t.Fatalf("runTopology() error = %v, want errFrontDoorUnreachable", err)
	}
}

func TestARunAgainstTheRunningEnvironmentUsesItsOrigin(t *testing.T) {
	t.Parallel()
	server, _ := frontDoorServer(t)
	cmd := localtestV2At(t, server.Listener.Addr().String(), true)

	topology, err := cmd.runTopology(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	if topology.LocaltestURL() != server.URL {
		t.Fatalf("topology at %s, want %s", topology.LocaltestURL(), server.URL)
	}
}

// Without running containers, the registration wait and the --dev-frontend route leave the front door alone: the run
// does not wait for a front door that is not there.
func TestAStateFileWithoutContainersSkipsTheFrontDoor(t *testing.T) {
	t.Parallel()
	server, requests := frontDoorServer(t)
	cmd := localtestV2At(t, server.Listener.Addr().String(), false)
	host, port, err := net.SplitHostPort(server.Listener.Addr().String())
	if err != nil {
		t.Fatal(err)
	}
	topology := envtopology.NewLocalAt(host, port)

	if waitErr := waitForFrontDoorRegistration(
		t.Context(), cmd.cfg, cmd.containers, topology, "ttd/test-app", "http://ttd-test-app:5005", time.Now(),
		time.Minute,
	); waitErr != nil {
		t.Fatalf("waitForFrontDoorRegistration() error = %v", waitErr)
	}
	remove, err := cmd.registerDevFrontend(t.Context(), topology, runFlags{devFrontend: true})
	if err != nil {
		t.Fatalf("registerDevFrontend() error = %v", err)
	}
	remove()
	if requests.Load() != 0 {
		t.Errorf("the front door got %d requests, want none", requests.Load())
	}
}
