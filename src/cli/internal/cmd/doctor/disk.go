package doctor

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"

	"gopkg.in/yaml.v3"

	"altinn.studio/studioctl/internal/auth"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/install"
	"altinn.studio/studioctl/internal/networking"
)

func (s *Service) buildDisk() *Disk {
	checks := []DiskCheck{
		s.checkDirState("home_dir", s.cfg.Home, true),
		s.checkDirState("socket_dir", s.cfg.SocketDir, true),
		s.checkDirState("log_dir", s.cfg.LogDir, false),
		s.checkDirState("data_dir", s.cfg.DataDir, true),
		s.checkDirState("bin_dir", s.cfg.BinDir, false),
		s.checkConfigFileState(),
		s.checkCredentialsFileState(),
		s.checkNetworkCacheState(),
		s.checkResourcesState(),
		s.checkAppManagerBinaryState(),
		s.checkAppManagerRuntimeState(),
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

func (s *Service) checkConfigFileState() DiskCheck {
	path := filepath.Join(s.cfg.Home, doctorConfigFileName)
	info, err := os.Stat(path)
	if err != nil {
		if os.IsNotExist(err) {
			return DiskCheck{
				ID:      "config_file",
				Level:   diskLevelInfo,
				Path:    path,
				Message: "missing (embedded defaults in effect)",
			}
		}
		return DiskCheck{
			ID:      "config_file",
			Level:   diskLevelError,
			Path:    path,
			Message: "stat failed: " + err.Error(),
		}
	}
	if info.IsDir() {
		return DiskCheck{
			ID:      "config_file",
			Level:   diskLevelError,
			Path:    path,
			Message: "path exists but is a directory",
		}
	}

	data, err := readTrustedFile(path)
	if err != nil {
		return DiskCheck{
			ID:      "config_file",
			Level:   diskLevelError,
			Path:    path,
			Message: "read failed: " + err.Error(),
		}
	}

	var parsed config.PersistedConfig
	if err := yaml.Unmarshal(data, &parsed); err != nil {
		return DiskCheck{
			ID:      "config_file",
			Level:   diskLevelError,
			Path:    path,
			Message: "yaml parse failed: " + err.Error(),
		}
	}

	decoder := yaml.NewDecoder(bytes.NewReader(data))
	decoder.KnownFields(true)
	var strictParsed config.PersistedConfig
	if err := decoder.Decode(&strictParsed); err != nil {
		return DiskCheck{
			ID:      "config_file",
			Level:   diskLevelWarn,
			Path:    path,
			Message: "valid yaml but contains unknown fields",
		}
	}

	if warning := ownerOnlyPermissionsWarning(info.Mode()); warning != "" {
		return DiskCheck{
			ID:      "config_file",
			Level:   diskLevelWarn,
			Path:    path,
			Message: warning,
		}
	}

	return DiskCheck{
		ID:      "config_file",
		Level:   diskLevelOK,
		Path:    path,
		Message: "valid",
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

func (s *Service) checkNetworkCacheState() DiskCheck {
	path := filepath.Join(s.cfg.Home, doctorNetworkCacheFileName)
	status := networking.GetCacheStatus(s.cfg.Home)
	if !status.Exists {
		return DiskCheck{
			ID:      "network_cache",
			Level:   diskLevelInfo,
			Path:    path,
			Message: "missing (will be created by probe)",
		}
	}

	level := diskLevelOK
	message := "valid and fresh"
	if status.IP == "" {
		level = diskLevelWarn
		message = "invalid or unreadable content"
	} else if !status.Fresh {
		level = diskLevelWarn
		message = "stale cache (" + formatDuration(status.Age) + " old)"
	}

	if info, err := os.Stat(path); err == nil {
		if warning := ownerOnlyPermissionsWarning(info.Mode()); warning != "" {
			level = worstDiskLevel(level, diskLevelWarn)
			message = warning
		}
	}

	return DiskCheck{
		ID:      "network_cache",
		Level:   level,
		Path:    path,
		Message: message,
	}
}

func (s *Service) checkResourcesState() DiskCheck {
	platformPath := filepath.Join(s.cfg.DataDir, doctorResourcesPlatformDir)
	installStatus := install.CheckInstallStatus(s.cfg.DataDir, s.cfg.Version)
	if check := s.resourceStateFromInstallStatus(installStatus); check != nil {
		return *check
	}

	platformInfo, platformErr := os.Stat(platformPath)
	if check := s.checkPlatformDirectoryState(platformPath, platformInfo, platformErr); check != nil {
		return *check
	}

	return DiskCheck{
		ID:      "resources",
		Level:   diskLevelOK,
		Path:    s.cfg.DataDir,
		Message: "installed for current CLI version",
	}
}

func (s *Service) resourceStateFromInstallStatus(status install.Status) *DiskCheck {
	if check := s.resourceStateFromInstallReadErrors(status); check != nil {
		return check
	}

	staticChecks := map[install.State]DiskCheck{
		install.StateNotInstalled: {
			ID:      "resources",
			Level:   diskLevelInfo,
			Path:    s.cfg.DataDir,
			Message: "not installed",
		},
		install.StatePartial: {
			ID:      "resources",
			Level:   diskLevelError,
			Path:    s.cfg.DataDir,
			Message: "partial install state detected",
		},
		install.StateTestdataEmpty: {
			ID:      "resources",
			Level:   diskLevelError,
			Path:    s.cfg.DataDir,
			Message: "testdata directory exists but is empty",
		},
		install.StateVersionEmpty: {
			ID:      "resources",
			Level:   diskLevelError,
			Path:    status.Path,
			Message: "version file is empty",
		},
		install.StateSourceMarkerMismatch: {
			ID:      "resources",
			Level:   diskLevelWarn,
			Path:    status.Path,
			Message: "source marker does not match current install source",
		},
	}
	if check, ok := staticChecks[status.State]; ok {
		return &check
	}

	if status.State == install.StateVersionMismatch {
		check := DiskCheck{
			ID:      "resources",
			Level:   diskLevelWarn,
			Path:    s.cfg.DataDir,
			Message: fmt.Sprintf("installed version differs from CLI version %q", s.cfg.Version),
		}
		return &check
	}
	if status.State == install.StateInstalled {
		return nil
	}

	check := DiskCheck{
		ID:      "resources",
		Level:   diskLevelWarn,
		Path:    s.cfg.DataDir,
		Message: "unknown install state",
	}
	return &check
}

func (s *Service) resourceStateFromInstallReadErrors(status install.Status) *DiskCheck {
	if status.State == install.StateTestdataUnreadable {
		check := DiskCheck{
			ID:      "resources",
			Level:   diskLevelWarn,
			Path:    status.Path,
			Message: "cannot read testdata directory: " + status.Err.Error(),
		}
		return &check
	}
	if status.State == install.StateVersionUnreadable {
		check := DiskCheck{
			ID:      "resources",
			Level:   diskLevelWarn,
			Path:    status.Path,
			Message: "cannot read version file: " + status.Err.Error(),
		}
		return &check
	}
	if status.State == install.StateSourceMarkerUnreadable {
		check := DiskCheck{
			ID:      "resources",
			Level:   diskLevelWarn,
			Path:    status.Path,
			Message: "cannot read source marker file: " + status.Err.Error(),
		}
		return &check
	}
	if status.State == install.StateInvalidExpectedSource {
		check := DiskCheck{
			ID:      "resources",
			Level:   diskLevelWarn,
			Path:    status.Path,
			Message: "cannot compute expected source marker: " + status.Err.Error(),
		}
		return &check
	}

	return nil
}

func (s *Service) checkAppManagerBinaryState() DiskCheck {
	path := s.cfg.AppManagerBinaryPath()
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
	if runtime.GOOS != osWindows && info.Mode()&0o111 == 0 {
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

func (s *Service) checkAppManagerRuntimeState() DiskCheck {
	pidPath := s.cfg.AppManagerPIDPath()
	socketPath := s.cfg.AppManagerSocketPath()

	pidInfo, pidErr := os.Stat(pidPath)
	socketInfo, socketErr := os.Stat(socketPath)
	if check := s.checkAppManagerPresenceState(pidPath, socketPath, pidErr, socketErr); check != nil {
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

	if check := checkAppManagerPIDFile(pidPath); check != nil {
		return *check
	}

	if runtime.GOOS != osWindows && socketInfo.Mode()&os.ModeSocket == 0 {
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

func (s *Service) checkPlatformDirectoryState(
	platformPath string,
	platformInfo os.FileInfo,
	platformErr error,
) *DiskCheck {
	if platformErr != nil {
		if os.IsNotExist(platformErr) {
			check := DiskCheck{
				ID:      "resources",
				Level:   diskLevelWarn,
				Path:    s.cfg.DataDir,
				Message: "installed but AltinnPlatformLocal directory is missing",
			}
			return &check
		}
		check := DiskCheck{
			ID:      "resources",
			Level:   diskLevelWarn,
			Path:    platformPath,
			Message: "cannot inspect AltinnPlatformLocal: " + platformErr.Error(),
		}
		return &check
	}
	if !platformInfo.IsDir() {
		check := DiskCheck{
			ID:      "resources",
			Level:   diskLevelError,
			Path:    platformPath,
			Message: "AltinnPlatformLocal exists but is not a directory",
		}
		return &check
	}
	return nil
}

func (s *Service) checkAppManagerPresenceState(
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

func checkAppManagerPIDFile(pidPath string) *DiskCheck {
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
	pid := strings.TrimSpace(string(pidRaw))
	if _, err := strconv.Atoi(pid); err != nil {
		check := DiskCheck{
			ID:      "appmgr_state",
			Level:   diskLevelWarn,
			Path:    pidPath,
			Message: "pid file is not a valid integer",
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
	if runtime.GOOS == osWindows {
		return ""
	}
	if mode.Perm()&0o077 != 0 {
		return fmt.Sprintf("permissions %03o are broader than owner-only", mode.Perm())
	}
	return ""
}

func worstDiskLevel(current, candidate string) string {
	if diskLevelPriority(candidate) > diskLevelPriority(current) {
		return candidate
	}
	return current
}

func diskLevelPriority(level string) diskLevelRank {
	switch level {
	case diskLevelOK:
		return diskRankOK
	case diskLevelWarn:
		return diskRankWarn
	case diskLevelError:
		return diskRankError
	default:
		return diskRankInfo
	}
}
