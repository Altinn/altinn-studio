package doctor

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"runtime"

	"gopkg.in/yaml.v3"

	"altinn.studio/studioctl/internal/auth"
	"altinn.studio/studioctl/internal/osutil"
)

// Disk check IDs, the stable names of the checks in `doctor --json`.
const (
	DiskCheckHome               = "home_dir"
	DiskCheckSockets            = "socket_dir"
	DiskCheckLogs               = "log_dir"
	DiskCheckData               = "data_dir"
	DiskCheckBin                = "bin_dir"
	DiskCheckCredentials        = "credentials_file"
	DiskCheckServerBinary       = "server_binary"
	DiskCheckServerState        = "server_state"
	DiskCheckMaskinportenClient = "maskinporten_client"
)

// buildDisk reports on studioctl's own state, plus the detected app's secrets when there is an app: the
// Maskinporten client is per-app, so it is only meaningful once buildApp has found one.
func (s *Service) buildDisk(app *App) *Disk {
	checks := []DiskCheck{
		s.checkDirState(DiskCheckHome, s.cfg.Home, true),
		s.checkDirState(DiskCheckSockets, s.cfg.SocketDir, true),
		s.checkDirState(DiskCheckLogs, s.cfg.LogDir, false),
		s.checkDirState(DiskCheckData, s.cfg.DataDir, true),
		s.checkDirState(DiskCheckBin, s.cfg.BinDir, false),
		s.checkCredentialsFileState(),
		s.checkStudioctlServerBinaryState(),
		s.checkStudioctlServerRuntimeState(),
	}

	if app != nil && app.Found && app.Path != "" {
		if check, reportable := s.checkMaskinportenClientState(app.Path); reportable {
			checks = append(checks, check)
		}
	}

	hasIssues := false
	for _, check := range checks {
		if check.Level == diskLevelWarn || check.Level == diskLevelError {
			hasIssues = true
			break
		}
	}

	return &Disk{
		Checks:    checks,
		Usage:     s.buildDiskUsage(),
		HasIssues: hasIssues,
	}
}

func (s *Service) checkDirState(id, path string, criticalWritable bool) DiskCheck {
	info, err := os.Stat(path)
	if err != nil {
		if os.IsNotExist(err) {
			return DiskCheck{
				ID:      id,
				Level:   diskLevelError,
				Path:    path,
				Message: "directory missing",
			}
		}
		return DiskCheck{
			ID:      id,
			Level:   diskLevelError,
			Path:    path,
			Message: "stat failed: " + errorWithoutPath(err),
		}
	}
	if !info.IsDir() {
		return DiskCheck{
			ID:      id,
			Level:   diskLevelError,
			Path:    path,
			Message: "path exists but is not a directory",
		}
	}
	if _, readErr := os.ReadDir(path); readErr != nil {
		return DiskCheck{
			ID:      id,
			Level:   diskLevelError,
			Path:    path,
			Message: "directory is not readable: " + errorWithoutPath(readErr),
		}
	}

	tmpFile, err := os.CreateTemp(path, ".studioctl-doctor-*")
	if err != nil {
		level := diskLevelWarn
		if criticalWritable {
			level = diskLevelError
		}
		return DiskCheck{
			ID:      id,
			Level:   level,
			Path:    path,
			Message: "directory is not writable: " + errorWithoutPath(err),
		}
	}
	tmpName := tmpFile.Name()
	if closeErr := tmpFile.Close(); closeErr != nil {
		level := diskLevelWarn
		if criticalWritable {
			level = diskLevelError
		}
		return DiskCheck{
			ID:      id,
			Level:   level,
			Path:    path,
			Message: "directory test file close failed: " + errorWithoutPath(closeErr),
		}
	}
	if removeErr := os.Remove(tmpName); removeErr != nil {
		level := diskLevelWarn
		if criticalWritable {
			level = diskLevelError
		}
		return DiskCheck{
			ID:      id,
			Level:   level,
			Path:    path,
			Message: "directory test file cleanup failed: " + errorWithoutPath(removeErr),
		}
	}

	return DiskCheck{
		ID:      id,
		Level:   diskLevelOK,
		Path:    path,
		Message: "ready",
	}
}

func (s *Service) checkCredentialsFileState() DiskCheck {
	path := auth.CredentialsPath(s.cfg.Home)
	info, err := os.Stat(path)
	if err != nil {
		if os.IsNotExist(err) {
			return DiskCheck{
				ID:      DiskCheckCredentials,
				Level:   diskLevelInfo,
				Path:    path,
				Message: "missing (not logged in)",
			}
		}
		return DiskCheck{
			ID:      DiskCheckCredentials,
			Level:   diskLevelError,
			Path:    path,
			Message: "stat failed: " + errorWithoutPath(err),
		}
	}
	if info.IsDir() {
		return DiskCheck{
			ID:      DiskCheckCredentials,
			Level:   diskLevelError,
			Path:    path,
			Message: "path exists but is a directory",
		}
	}

	creds, check := s.readCredentialsFile(path)
	if check != nil {
		return *check
	}

	if warning := ownerOnlyPermissionsWarning(info.Mode()); warning != "" {
		return DiskCheck{
			ID:      DiskCheckCredentials,
			Level:   diskLevelWarn,
			Path:    path,
			Message: warning,
		}
	}
	return summarizeCredentialsState(path, creds)
}

func (s *Service) checkStudioctlServerBinaryState() DiskCheck {
	installDir := s.cfg.StudioctlServerInstallDir()
	if info, err := os.Stat(installDir); err == nil && !info.IsDir() {
		return DiskCheck{
			ID:      DiskCheckServerBinary,
			Level:   diskLevelError,
			Path:    installDir,
			Message: "install path exists but is not a directory",
		}
	}

	path := s.cfg.StudioctlServerBinaryPath()
	info, err := os.Stat(path)
	if err != nil {
		if os.IsNotExist(err) {
			return DiskCheck{
				ID:      DiskCheckServerBinary,
				Level:   diskLevelInfo,
				Path:    path,
				Message: "not installed",
			}
		}
		return DiskCheck{
			ID:      DiskCheckServerBinary,
			Level:   diskLevelWarn,
			Path:    path,
			Message: "stat failed: " + errorWithoutPath(err),
		}
	}
	if info.IsDir() {
		return DiskCheck{
			ID:      DiskCheckServerBinary,
			Level:   diskLevelError,
			Path:    path,
			Message: "path exists but is a directory",
		}
	}
	if runtime.GOOS != osutil.OSWindows && info.Mode()&0o111 == 0 {
		return DiskCheck{
			ID:      DiskCheckServerBinary,
			Level:   diskLevelWarn,
			Path:    path,
			Message: "file is not executable",
		}
	}

	return DiskCheck{
		ID:      DiskCheckServerBinary,
		Level:   diskLevelOK,
		Path:    path,
		Message: "present",
	}
}

func (s *Service) checkStudioctlServerRuntimeState() DiskCheck {
	pidPath := s.cfg.StudioctlServerPIDPath()
	if runtime.GOOS == osutil.OSWindows {
		return checkStudioctlServerRuntimeStateWindows(s.cfg.Home, pidPath)
	}

	socketPath := s.cfg.StudioctlServerSocketPath()
	pidInfo, pidErr := os.Stat(pidPath)
	socketInfo, socketErr := os.Stat(socketPath)
	if check := s.checkStudioctlServerPresenceState(pidPath, socketPath, pidErr, socketErr); check != nil {
		return *check
	}

	if pidInfo.IsDir() {
		return DiskCheck{
			ID:      DiskCheckServerState,
			Level:   diskLevelError,
			Path:    pidPath,
			Message: "pid path is a directory",
		}
	}
	if socketInfo.IsDir() {
		return DiskCheck{
			ID:      DiskCheckServerState,
			Level:   diskLevelError,
			Path:    socketPath,
			Message: "socket path is a directory",
		}
	}

	if check := checkStudioctlServerPIDFile(pidPath); check != nil {
		return *check
	}

	if runtime.GOOS != osutil.OSWindows && socketInfo.Mode()&os.ModeSocket == 0 {
		return DiskCheck{
			ID:      DiskCheckServerState,
			Level:   diskLevelWarn,
			Path:    socketPath,
			Message: "socket path exists but is not a unix socket",
		}
	}

	return DiskCheck{
		ID:      DiskCheckServerState,
		Level:   diskLevelOK,
		Path:    s.cfg.Home,
		Message: "pid and socket files are consistent",
	}
}

func checkStudioctlServerRuntimeStateWindows(home, pidPath string) DiskCheck {
	if _, err := os.Stat(pidPath); err != nil {
		if os.IsNotExist(err) {
			return DiskCheck{
				ID:      DiskCheckServerState,
				Level:   diskLevelInfo,
				Path:    home,
				Message: "pid file absent (not running)",
			}
		}
		return DiskCheck{
			ID:      DiskCheckServerState,
			Level:   diskLevelWarn,
			Path:    pidPath,
			Message: "stat pid file failed: " + errorWithoutPath(err),
		}
	}

	if check := checkStudioctlServerPIDFile(pidPath); check != nil {
		return *check
	}

	return DiskCheck{
		ID:      DiskCheckServerState,
		Level:   diskLevelOK,
		Path:    pidPath,
		Message: "pid file present",
	}
}

func (s *Service) readCredentialsFile(path string) (auth.Credentials, *DiskCheck) {
	data, err := readTrustedFile(path)
	if err != nil {
		check := DiskCheck{
			ID:      DiskCheckCredentials,
			Level:   diskLevelError,
			Path:    path,
			Message: "read failed: " + errorWithoutPath(err),
		}
		return auth.Credentials{Envs: nil}, &check
	}

	var creds auth.Credentials
	if err := yaml.Unmarshal(data, &creds); err != nil {
		check := DiskCheck{
			ID:      DiskCheckCredentials,
			Level:   diskLevelError,
			Path:    path,
			Message: "yaml parse failed: " + err.Error(),
		}
		return auth.Credentials{Envs: nil}, &check
	}

	return creds, nil
}

func summarizeCredentialsState(path string, creds auth.Credentials) DiskCheck {
	if len(creds.Envs) == 0 {
		return DiskCheck{
			ID:      DiskCheckCredentials,
			Level:   diskLevelInfo,
			Path:    path,
			Message: "no environments stored",
		}
	}

	invalidEntries := countInvalidCredentialEntries(creds.Envs)
	if invalidEntries > 0 {
		return DiskCheck{
			ID:      DiskCheckCredentials,
			Level:   diskLevelWarn,
			Path:    path,
			Message: fmt.Sprintf("contains %d incomplete environment entries", invalidEntries),
		}
	}

	return DiskCheck{
		ID:      DiskCheckCredentials,
		Level:   diskLevelOK,
		Path:    path,
		Message: fmt.Sprintf("valid (%d environment entries)", len(creds.Envs)),
	}
}

func countInvalidCredentialEntries(envs map[string]auth.EnvCredentials) int {
	invalidEntries := 0
	for _, envCreds := range envs {
		if envCreds.Host == "" || envCreds.ApiKey == "" || envCreds.Username == "" {
			invalidEntries++
		}
	}
	return invalidEntries
}

func (s *Service) checkStudioctlServerPresenceState(
	pidPath, socketPath string,
	pidErr, socketErr error,
) *DiskCheck {
	pidExists := pidErr == nil
	socketExists := socketErr == nil

	switch {
	case !pidExists && !socketExists:
		check := DiskCheck{
			ID:      DiskCheckServerState,
			Level:   diskLevelInfo,
			Path:    s.cfg.Home,
			Message: "pid and socket files absent (not running)",
		}
		return &check
	case pidExists && !socketExists:
		check := DiskCheck{
			ID:      DiskCheckServerState,
			Level:   diskLevelWarn,
			Path:    pidPath,
			Message: "pid file exists but socket is missing",
		}
		return &check
	case !pidExists && socketExists:
		check := DiskCheck{
			ID:      DiskCheckServerState,
			Level:   diskLevelWarn,
			Path:    socketPath,
			Message: "socket exists but pid file is missing",
		}
		return &check
	default:
		return nil
	}
}

func checkStudioctlServerPIDFile(pidPath string) *DiskCheck {
	pidRaw, err := readTrustedFile(pidPath)
	if err != nil {
		check := DiskCheck{
			ID:      DiskCheckServerState,
			Level:   diskLevelWarn,
			Path:    pidPath,
			Message: "read pid file failed: " + errorWithoutPath(err),
		}
		return &check
	}
	var state struct {
		PID int `json:"pid"`
	}
	if err := json.Unmarshal(pidRaw, &state); err != nil || state.PID <= 0 {
		check := DiskCheck{
			ID:      DiskCheckServerState,
			Level:   diskLevelWarn,
			Path:    pidPath,
			Message: "pid file is not valid runtime state",
		}
		return &check
	}
	return nil
}

// errorWithoutPath states what went wrong with a file without naming it: the check's path field names it,
// and the text output leaves out paths to files studioctl manages.
func errorWithoutPath(err error) string {
	if pathErr, ok := errors.AsType[*fs.PathError](err); ok {
		return pathErr.Err.Error()
	}
	return err.Error()
}

func readTrustedFile(path string) ([]byte, error) {
	//nolint:gosec // G304: paths are local CLI state paths under user-controlled studioctl directories.
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read file %q: %w", path, err)
	}
	return data, nil
}

func ownerOnlyPermissionsWarning(mode os.FileMode) string {
	if runtime.GOOS == osutil.OSWindows {
		return ""
	}
	if mode.Perm()&0o077 != 0 {
		return fmt.Sprintf("permissions %03o are broader than owner-only", mode.Perm())
	}
	return ""
}
