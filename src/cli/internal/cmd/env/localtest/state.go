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

// RecordedTopology is the environment's public URLs at the port it was last started with, or at the default port.
func RecordedTopology(cfg *config.Config) (envtopology.Local, error) {
	state, err := ReadState(cfg)
	if err != nil {
		return envtopology.Local{}, err
	}
	return state.Topology(), nil
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
// environment exists, and the default otherwise.
func startState(port int, recorded State, exists bool) State {
	switch {
	case port != 0:
		return State{PublicPort: port}
	case exists:
		return recorded
	default:
		return State{PublicPort: 0}
	}
}

func statePath(cfg *config.Config) string {
	return filepath.Join(cfg.DataDir, stateDirName, stateFileName)
}
