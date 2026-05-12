package doctor

import (
	"encoding/json"
	"fmt"
	"os"
	"runtime"

	"gopkg.in/yaml.v3"

	"altinn.studio/studioctl/internal/auth"
	"altinn.studio/studioctl/internal/osutil"
)

func (s *Service) buildDisk() *Disk {
	checks := []DiskCheck{
		s.checkDirState("home_dir", s.cfg.Home, true),
		s.checkDirState("socket_dir", s.cfg.SocketDir, true),
		s.checkDirState("log_dir", s.cfg.LogDir, false),
		s.checkDirState("data_dir", s.cfg.DataDir, true),
		s.checkDirState("bin_dir", s.cfg.BinDir, false),
		s.checkCredentialsFileState(),
		s.checkStudioctlServerBinaryState(),
		s.checkStudioctlServerRuntimeState(),
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
			Message: "stat failed: " + err.Error(),
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
			Message: "directory is not readable: " + readErr.Error(),
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
			Message: "directory is not writable: " + err.Error(),
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
			Message: "directory test file close failed: " + closeErr.Error(),
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
			Message: "directory test file cleanup failed: " + removeErr.Error(),
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
				ID:      "credentials_file",
				Level:   diskLevelInfo,
				Path:    path,
				Message: "missing (not logged in)",
			}
		}
		return DiskCheck{
			ID:      "credentials_file",
			Level:   diskLevelError,
			Path:    path,
			Message: "stat failed: " + err.Error(),
		}
	}
	if info.IsDir() {
		return DiskCheck{
			ID:      "credentials_file",
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
			ID:      "credentials_file",
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
			ID:      "appmgr_binary",
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
				ID:      "appmgr_binary",
				Level:   diskLevelInfo,
				Path:    path,
				Message: "not installed",
			}
		}
		return DiskCheck{
			ID:      "appmgr_binary",
			Level:   diskLevelWarn,
			Path:    path,
			Message: "stat failed: " + err.Error(),
		}
	}
	if info.IsDir() {
		return DiskCheck{
			ID:      "appmgr_binary",
			Level:   diskLevelError,
			Path:    path,
			Message: "path exists but is a directory",
		}
	}
	if runtime.GOOS != osutil.OSWindows && info.Mode()&0o111 == 0 {
		return DiskCheck{
			ID:      "appmgr_binary",
			Level:   diskLevelWarn,
			Path:    path,
			Message: "file is not executable",
		}
	}

	return DiskCheck{
		ID:      "appmgr_binary",
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
			ID:      "appmgr_state",
			Level:   diskLevelError,
			Path:    pidPath,
			Message: "pid path is a directory",
		}
	}
	if socketInfo.IsDir() {
		return DiskCheck{
			ID:      "appmgr_state",
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
			ID:      "appmgr_state",
			Level:   diskLevelWarn,
			Path:    socketPath,
			Message: "socket path exists but is not a unix socket",
		}
	}

	return DiskCheck{
		ID:      "appmgr_state",
		Level:   diskLevelOK,
		Path:    s.cfg.Home,
		Message: "pid and socket files are consistent",
	}
}

func checkStudioctlServerRuntimeStateWindows(home, pidPath string) DiskCheck {
	if _, err := os.Stat(pidPath); err != nil {
		if os.IsNotExist(err) {
			return DiskCheck{
				ID:      "appmgr_state",
				Level:   diskLevelInfo,
				Path:    home,
				Message: "pid file absent (not running)",
			}
		}
		return DiskCheck{
			ID:      "appmgr_state",
			Level:   diskLevelWarn,
			Path:    pidPath,
			Message: "stat pid file failed: " + err.Error(),
		}
	}

	if check := checkStudioctlServerPIDFile(pidPath); check != nil {
		return *check
	}

	return DiskCheck{
		ID:      "appmgr_state",
		Level:   diskLevelOK,
		Path:    pidPath,
		Message: "pid file present",
	}
}

func (s *Service) readCredentialsFile(path string) (auth.Credentials, *DiskCheck) {
	data, err := readTrustedFile(path)
	if err != nil {
		check := DiskCheck{
			ID:      "credentials_file",
			Level:   diskLevelError,
			Path:    path,
			Message: "read failed: " + err.Error(),
		}
		return auth.Credentials{Envs: nil}, &check
	}

	var creds auth.Credentials
	if err := yaml.Unmarshal(data, &creds); err != nil {
		check := DiskCheck{
			ID:      "credentials_file",
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
			ID:      "credentials_file",
			Level:   diskLevelInfo,
			Path:    path,
			Message: "no environments stored",
		}
	}

	invalidEntries := countInvalidCredentialEntries(creds.Envs)
	if invalidEntries > 0 {
		return DiskCheck{
			ID:      "credentials_file",
			Level:   diskLevelWarn,
			Path:    path,
			Message: fmt.Sprintf("contains %d incomplete environment entries", invalidEntries),
		}
	}

	return DiskCheck{
		ID:      "credentials_file",
		Level:   diskLevelOK,
		Path:    path,
		Message: fmt.Sprintf("valid (%d environment entries)", len(creds.Envs)),
	}
}

func countInvalidCredentialEntries(envs map[string]auth.EnvCredentials) int {
	invalidEntries := 0
	for _, envCreds := range envs {
		if envCreds.Host == "" || envCreds.Token == "" || envCreds.Username == "" {
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
			ID:      "appmgr_state",
			Level:   diskLevelInfo,
			Path:    s.cfg.Home,
			Message: "pid and socket files absent (not running)",
		}
		return &check
	case pidExists && !socketExists:
		check := DiskCheck{
			ID:      "appmgr_state",
			Level:   diskLevelWarn,
			Path:    pidPath,
			Message: "pid file exists but socket is missing",
		}
		return &check
	case !pidExists && socketExists:
		check := DiskCheck{
			ID:      "appmgr_state",
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
			ID:      "appmgr_state",
			Level:   diskLevelWarn,
			Path:    pidPath,
			Message: "read pid file failed: " + err.Error(),
		}
		return &check
	}
	var state struct {
		PID int `json:"pid"`
	}
	if err := json.Unmarshal(pidRaw, &state); err != nil || state.PID <= 0 {
		check := DiskCheck{
			ID:      "appmgr_state",
			Level:   diskLevelWarn,
			Path:    pidPath,
			Message: "pid file is not valid runtime state",
		}
		return &check
	}
	return nil
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
