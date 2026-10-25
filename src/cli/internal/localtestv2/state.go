// Package localtestv2 holds the state the localtest-v2 runtime shares with the rest of studioctl: while the
// runtime is up, studioctl-server registers the apps it discovers with the localtest container's front door, and apps
// sign platform access tokens with the runtime's certificate; both learn that from the state file the runtime writes.
package localtestv2

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"

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

// State describes a running localtest-v2 environment.
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

// CurrentTopology is the public URLs of the running localtest-v2 environment, at the origin it was started with; the
// default topology when it is not up. Everything that reaches the front door (a run's registration wait, the app's
// environment, the frontend dev server's route) takes its URLs from here.
func CurrentTopology(cfg *config.Config) (envtopology.Local, error) {
	state, up, err := ReadState(cfg)
	if err != nil {
		return envtopology.NewLocal(envtopology.DefaultIngressPortString()), err
	}
	if !up {
		return envtopology.NewLocal(envtopology.DefaultIngressPortString()), nil
	}
	return state.Topology(), nil
}

// StatePath returns where the runtime records that it is up.
func StatePath(cfg *config.Config) string {
	return filepath.Join(cfg.DataDir, stateDirName, stateFileName)
}

// CertificateDir returns where the runtime keeps the shared test certificate.
func CertificateDir(cfg *config.Config) string {
	return filepath.Join(cfg.DataDir, "infra", "localtest-v2", "certs")
}

// ReadState returns the recorded state, and whether there is one.
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

// WriteState records that the runtime is up.
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

// RemoveState records that the runtime is down.
func RemoveState(cfg *config.Config) error {
	if err := os.Remove(StatePath(cfg)); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("remove localtest-v2 state: %w", err)
	}
	return nil
}
