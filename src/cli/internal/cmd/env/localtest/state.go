package localtest

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/osutil"
)

const (
	stateDirName  = "generated/localtest"
	stateFileName = "state.json"
)

// State is the configuration the localtest environment was started with. Every command that reaches the environment
// reads it, so that studioctl-server, apps and diagnostics all use the port env up chose. It lasts as long as the
// environment: env down and env reset remove it. It says nothing about whether the environment still runs.
type State struct {
	// PublicPort is the host port localtest serves the environment on (env up --port). Zero is the default.
	PublicPort int `json:"publicPort,omitempty"`
}

// Topology is the environment's public URLs at the recorded port.
func (s State) Topology() envtopology.Local {
	if s.PublicPort == 0 {
		return envtopology.NewLocal(envtopology.DefaultIngressPortString())
	}
	return envtopology.NewLocal(strconv.Itoa(s.PublicPort))
}

// RecordedTopology is the environment's public URLs at the port it was started with. With nothing recorded, it is
// where env up would start it: at the env config port, or the default.
func RecordedTopology(cfg *config.Config) (envtopology.Local, error) {
	state, err := ReadState(cfg)
	if err != nil {
		return envtopology.Local{}, err
	}
	if state.PublicPort != 0 {
		return state.Topology(), nil
	}
	port, err := configuredPort(cfg)
	if err != nil {
		return envtopology.Local{}, err
	}
	return State{PublicPort: port}.Topology(), nil
}

// configuredPort is the port env up starts a new environment at: the env config port, or the default.
func configuredPort(cfg *config.Config) (int, error) {
	settings, err := config.LoadSettings(cfg)
	if err != nil {
		return 0, fmt.Errorf("read the env config port: %w", err)
	}
	if settings.Env.Port != 0 {
		return settings.Env.Port, nil
	}
	return envtopology.DefaultIngressPort(), nil
}

// ReadState returns the recorded state, or the zero State when there is none.
func ReadState(cfg *config.Config) (State, error) {
	data, err := os.ReadFile(statePath(cfg))
	if errors.Is(err, os.ErrNotExist) {
		return State{PublicPort: 0}, nil
	}
	if err != nil {
		return State{}, fmt.Errorf("read localtest state: %w", err)
	}
	var state State
	if err := json.Unmarshal(data, &state); err != nil {
		return State{}, fmt.Errorf("parse localtest state %s: %w", statePath(cfg), err)
	}
	return state, nil
}

// WriteState records the state the environment is started with.
func WriteState(cfg *config.Config, state State) error {
	path := statePath(cfg)
	if err := os.MkdirAll(filepath.Dir(path), osutil.DirPermDefault); err != nil {
		return fmt.Errorf("create localtest state directory: %w", err)
	}
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return fmt.Errorf("encode localtest state: %w", err)
	}
	if err := osutil.WriteFileAtomic(path, append(data, '\n'), osutil.AtomicWriteOptions{
		Perm:      osutil.FilePermDefault,
		OwnerOnly: false,
	}); err != nil {
		return fmt.Errorf("write localtest state: %w", err)
	}
	return nil
}

// RemoveState forgets the recorded state, so that the next env up starts at the default port.
func RemoveState(cfg *config.Config) error {
	if err := os.Remove(statePath(cfg)); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("remove localtest state: %w", err)
	}
	return nil
}

// startState is the state env up starts the environment with: --port when it is given, the recorded port while the
// environment exists, and the configured port otherwise.
func startState(port int, recorded State, exists bool, configured int) State {
	switch {
	case port != 0:
		return State{PublicPort: port}
	case exists:
		return recorded
	default:
		return State{PublicPort: configured}
	}
}

func statePath(cfg *config.Config) string {
	return filepath.Join(cfg.DataDir, stateDirName, stateFileName)
}
