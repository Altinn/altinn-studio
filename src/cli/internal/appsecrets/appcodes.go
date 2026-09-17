package appsecrets

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"altinn.studio/studioctl/internal/osutil"
)

const (
	// devWorkflowEngineCallbackID identifies the development code among the codes of its kind.
	devWorkflowEngineCallbackID = "local-dev"

	// devWorkflowEngineCallbackCode is the development code itself. Callback tokens are signed with
	// HMAC-SHA256, so the app libraries refuse anything shorter than 16 bytes.
	devWorkflowEngineCallbackCode = "LOCAL-DEV-ONLY-workflow-engine-callback-secret"

	// devIssuedAt and devExpiresAt bracket every local run: the code is valid from before any of them and
	// until long after, because nothing rotates it locally.
	devIssuedAt  = "2020-01-01T00:00:00Z"
	devExpiresAt = "2999-01-01T00:00:00Z"
)

// appCode is one verification code as the app libraries bind it.
//
//nolint:tagliatelle // JSON names match the file the operator provisions in a cluster.
type appCode struct {
	Code      string `json:"Code"`
	ExpiresAt string `json:"ExpiresAt"`
	ID        string `json:"Id"`
	IssuedAt  string `json:"IssuedAt"`
}

// appCodeKinds holds the codes by callback. The operator omits a kind it has issued no codes for, and so does
// studioctl: only the workflow engine's callback is minted and verified by the app alone.
//
//nolint:tagliatelle // JSON names match the file the operator provisions in a cluster.
type appCodeKinds struct {
	NotificationCallback   []appCode `json:"NotificationCallback,omitempty"`
	PaymentsCallback       []appCode `json:"PaymentsCallback,omitempty"`
	WorkflowEngineCallback []appCode `json:"WorkflowEngineCallback,omitempty"`
}

// appCodesFile is the provisioned file: the codes wrapped in the single object they bind from.
//
//nolint:tagliatelle // JSON names match the file the operator provisions in a cluster.
type appCodesFile struct {
	AppCodes appCodeKinds `json:"AppCodes"`
}

// AppCodesPath returns the path of the app codes file in a secrets directory, under the name studioctl tells
// the app to look for it by.
func AppCodesPath(dir string) string {
	return filepath.Join(dir, AppCodesFileName)
}

// WriteDevelopmentAppCodes provisions the development app codes into the secrets directory, creating the
// directory if it is not there yet.
//
// Workflow engine callbacks are authenticated with an app-minted JWT signed by a WorkflowEngineCallback app
// code. The app both mints and verifies the token, so this value never has to match anything else, and a
// fixed one is enough for a local run. In the cloud the operator provisions and rotates the codes into this
// same file, which is why studioctl writes the file rather than handing the app a configuration value.
//
// The write is skipped when the file already holds exactly this content, so that an app polling it is not
// woken by every run. Otherwise it is atomic and readable by the owner only, like the Maskinporten client
// beside it.
func WriteDevelopmentAppCodes(dir string) error {
	payload, err := json.MarshalIndent(developmentAppCodes(), "", "  ")
	if err != nil {
		return fmt.Errorf("encode %s: %w", AppCodesFileName, err)
	}
	payload = append(payload, '\n')

	path := AppCodesPath(dir)
	current, readErr := os.ReadFile(path) //nolint:gosec // The path is under the configured studioctl home.
	if readErr == nil && bytes.Equal(current, payload) {
		return nil
	}

	if err = os.MkdirAll(dir, osutil.DirPermOwnerOnly); err != nil {
		return fmt.Errorf("create secrets directory: %w", err)
	}
	// Owner-only on every platform: the mode on Unix, and on Windows the protected DACL, applied before the
	// file appears at its final path.
	err = osutil.WriteFileAtomic(
		path,
		payload,
		osutil.AtomicWriteOptions{Perm: osutil.FilePermOwnerOnly, OwnerOnly: true},
	)
	if err != nil {
		return fmt.Errorf("store %s: %w", AppCodesFileName, err)
	}
	return nil
}

func developmentAppCodes() appCodesFile {
	return appCodesFile{
		AppCodes: appCodeKinds{
			NotificationCallback: nil,
			PaymentsCallback:     nil,
			WorkflowEngineCallback: []appCode{
				{
					Code:      devWorkflowEngineCallbackCode,
					ExpiresAt: devExpiresAt,
					ID:        devWorkflowEngineCallbackID,
					IssuedAt:  devIssuedAt,
				},
			},
		},
	}
}
