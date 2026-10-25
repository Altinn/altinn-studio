// Package localtestv2 holds what the localtest-v2 runtime shares with the rest of studioctl: while the runtime is up,
// studioctl-server registers the apps it discovers with the localtest container's front door, and apps sign platform
// access tokens with the runtime's certificate. Whether it is up comes from its containers (Current); the state file the
// runtime writes records only the configuration it was started with.
package localtestv2

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/devenv/pkg/resource"
	containerbackend "altinn.studio/devenv/pkg/resource/executor/container"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/localtestv2/manifest"
	"altinn.studio/studioctl/internal/osutil"
)

const (
	stateDirName  = "generated/localtest-v2"
	stateFileName = "state.json"

	// CertificateFileName is the shared test certificate every app and component signs platform
	// access tokens with, and the components validate them against.
	CertificateFileName = "localtest-accesstoken.pfx"
)

// State is the configuration a localtest-v2 environment was started with. It says nothing about whether the
// environment still runs: a reboot or a docker rm leaves it behind (Current).
type State struct {
	// CertificateDir holds CertificateFileName on the host.
	CertificateDir string `json:"certificateDir"`
	// PublicHost is the public origin's host (env up --host); empty is the manifest's default.
	PublicHost string `json:"publicHost,omitempty"`
	// Groups are the optional component groups the environment was started with.
	Groups []string `json:"groups,omitempty"`
	// Dev are the containers built from source (env up --dev-<container>), sorted.
	Dev []string `json:"dev,omitempty"`
	// PublicPort is the public origin's port, the front door's published port (env up --port; --port 0 records the
	// port it picked); zero is the manifest's default.
	PublicPort int `json:"publicPort,omitempty"`
	// LatestImages is set when the environment runs the research images at latest (env up --latest).
	LatestImages bool `json:"latestImages,omitempty"`
	// Minimal is set when the environment runs in minimal mode (env up --minimal): the minimal group, the front door
	// emulating the rest of the default group, nothing persisted.
	Minimal bool `json:"minimal,omitempty"`
}

// CertificatePath is the host path of the shared test certificate.
func (s State) CertificatePath() string {
	return filepath.Join(s.CertificateDir, CertificateFileName)
}

// Origin is the environment's public origin: the recorded host and port, the manifest's defaults for what is not
// recorded.
func (s State) Origin() manifest.Origin {
	return manifest.MustDefault().Origin(s.PublicHost, s.PublicPort)
}

// Topology is the environment's public URLs at its origin.
func (s State) Topology() envtopology.Local {
	origin := s.Origin()
	return envtopology.NewLocalAt(origin.Host, strconv.Itoa(origin.Port))
}

// ContainerClientFunc connects to the container runtime, as container.Detect does.
type ContainerClientFunc func(ctx context.Context) (container.ContainerClient, error)

// Environment is localtest-v2 as studioctl finds it: the configuration it was started with, and whether it runs.
type Environment struct {
	// State is the recorded configuration; the zero state when there is none.
	State State
	// Recorded is set when there is a state file.
	Recorded bool
	// Running is set when there is a state file and a container of the runtime runs.
	Running bool
}

// Topology is the public URLs of the running environment, at the origin it was started with; the default topology
// when it does not run. Everything that reaches the front door (a run's registration wait, the app's environment, the
// frontend dev server's route) takes its URLs from here.
func (e Environment) Topology() envtopology.Local {
	if !e.Running {
		return envtopology.NewLocal(envtopology.DefaultIngressPortString())
	}
	return e.State.Topology()
}

// Current returns the configuration localtest-v2 was started with and whether it runs. It runs when a container with
// the runtime's ownership label runs, which is also how env commands find the running runtime (its Env.Active); the
// state file alone is never that evidence. Without a state file the container runtime is not asked.
func Current(ctx context.Context, cfg *config.Config, containers ContainerClientFunc) (Environment, error) {
	state, recorded, err := ReadState(cfg)
	env := Environment{State: state, Recorded: recorded, Running: false}
	if err != nil || !recorded {
		return env, err
	}
	client, err := containers(ctx)
	if err != nil {
		return env, fmt.Errorf("check localtest-v2 containers: %w", err)
	}
	running, err := containerbackend.GraphRunning(ctx, client, resource.GraphID(GraphID))
	err = errors.Join(err, client.Close())
	if err != nil {
		return env, fmt.Errorf("check localtest-v2 containers: %w", err)
	}
	env.Running = running
	return env, nil
}

// StatePath returns where the runtime records the configuration it was started with.
func StatePath(cfg *config.Config) string {
	return filepath.Join(cfg.DataDir, stateDirName, stateFileName)
}

// CertificateDir returns where the runtime keeps the shared test certificate.
func CertificateDir(cfg *config.Config) string {
	return filepath.Join(cfg.DataDir, "infra", "localtest-v2", "certs")
}

// ReadState returns the recorded configuration, and whether there is one. Whether the environment runs is Current's.
func ReadState(cfg *config.Config) (State, bool, error) {
	data, err := os.ReadFile(StatePath(cfg))
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return noState(), false, nil
		}
		return noState(), false, fmt.Errorf("read localtest-v2 state: %w", err)
	}
	state := noState()
	if err := json.Unmarshal(data, &state); err != nil {
		return noState(), false, fmt.Errorf("parse localtest-v2 state %s: %w", StatePath(cfg), err)
	}
	return state, true, nil
}

func noState() State {
	return State{
		CertificateDir: "",
		PublicHost:     "",
		Groups:         nil,
		Dev:            nil,
		PublicPort:     0,
		LatestImages:   false,
		Minimal:        false,
	}
}

// WriteState records the configuration the runtime starts with.
func WriteState(cfg *config.Config, state State) error {
	path := StatePath(cfg)
	if err := os.MkdirAll(filepath.Dir(path), osutil.DirPermDefault); err != nil {
		return fmt.Errorf("create localtest-v2 state directory: %w", err)
	}
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal localtest-v2 state: %w", err)
	}
	if err := os.WriteFile(path, append(data, '\n'), osutil.FilePermDefault); err != nil {
		return fmt.Errorf("write localtest-v2 state: %w", err)
	}
	return nil
}

// RemoveState forgets the recorded configuration.
func RemoveState(cfg *config.Config) error {
	if err := os.Remove(StatePath(cfg)); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("remove localtest-v2 state: %w", err)
	}
	return nil
}
