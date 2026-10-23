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

	"altinn.studio/studioctl/internal/config"
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
	// Groups are the optional component groups the environment was started with.
	Groups []string `json:"groups,omitempty"`
	// Dev are the containers built from source (env up --dev-<container>), sorted.
	Dev []string `json:"dev,omitempty"`
	// LatestImages is set when the environment runs the research images at latest (env up --latest).
	LatestImages bool `json:"latestImages,omitempty"`
}

// CertificatePath is the host path of the shared test certificate.
func (s State) CertificatePath() string {
	return filepath.Join(s.CertificateDir, CertificateFileName)
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
	return State{CertificateDir: "", Groups: nil, Dev: nil, LatestImages: false}
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
