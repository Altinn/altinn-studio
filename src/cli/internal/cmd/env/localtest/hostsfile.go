package localtest

import (
	"errors"
	"fmt"
	"io/fs"
	"net"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strconv"
	"strings"

	"altinn.studio/studioctl/internal/osutil"
)

const (
	// HostsStateInstalled means the managed block is present and matches the desired content.
	HostsStateInstalled = "installed"

	// HostsStatePresent means all desired hostnames resolve in the file, but not via the exact managed block.
	HostsStatePresent = "present"

	// HostsStateMissing means one or more desired hostnames are missing.
	HostsStateMissing = "missing"

	// HostsStateConflict means one or more desired hostnames map to unexpected addresses.
	HostsStateConflict = "conflict"
)

var (
	// ErrMalformedManagedHostsBlock is returned when the managed hosts-file block markers are invalid.
	ErrMalformedManagedHostsBlock = errors.New("malformed managed hosts block")

	// ErrHostsConflict is returned when desired hostnames already have conflicting active mappings.
	ErrHostsConflict = errors.New("conflicting host entries")
)

// HostsWriteResult describes one hosts-file mutation.
type HostsWriteResult struct {
	BackupPath string `json:"backupPath,omitempty"`
	Changed    bool   `json:"changed"`
}

// HostsConflict contains one hostname and its active addresses.
type HostsConflict struct {
	Addresses []string `json:"addresses"`
	Host      string   `json:"host"`
}

// HostsFileStatus describes whether a hosts file satisfies the desired localtest mappings.
type HostsFileStatus struct {
	Conflicts []HostsConflict `json:"conflicts,omitempty"`
	Missing   []string        `json:"missing,omitempty"`
	Managed   bool            `json:"managed"`
	State     string          `json:"state"`
}

// HostsConflictError contains conflicting active mappings that must be resolved manually.
type HostsConflictError struct {
	Conflicts []HostsConflict
}

func (e *HostsConflictError) Error() string {
	parts := make([]string, 0, len(e.Conflicts))
	for _, conflict := range e.Conflicts {
		parts = append(parts, conflict.Host+" -> "+strings.Join(conflict.Addresses, ", "))
	}
	return fmt.Sprintf("%s:\n%s", ErrHostsConflict, strings.Join(parts, "\n"))
}

// Is makes errors.Is(err, ErrHostsConflict) work for HostsConflictError.
func (e *HostsConflictError) Is(target error) bool {
	return target == ErrHostsConflict
}

// InspectHostsFile reports whether the given hosts file satisfies the desired host mappings.
func InspectHostsFile(path, blockName, address string, hostnames []string) (HostsFileStatus, error) {
	content, err := os.ReadFile(path) //nolint:gosec // Caller controls the system hosts file path.
	if err != nil {
		return HostsFileStatus{}, fmt.Errorf("read hosts file %q: %w", path, err)
	}
	return inspectHostsContent(string(content), blockName, address, hostnames)
}

// EnsureManagedHosts updates a hosts file to contain the exact managed block for the desired hostnames.
func EnsureManagedHosts(path, blockName, address string, hostnames []string) (HostsWriteResult, error) {
	content, info, err := readHostsFile(path)
	if err != nil {
		return HostsWriteResult{}, err
	}
	updated, changed, err := ensureManagedHostsContent(content, blockName, address, hostnames)
	if err != nil {
		return HostsWriteResult{}, err
	}
	if !changed {
		return HostsWriteResult{Changed: false}, nil
	}

	backupPath, err := writeHostsBackup(path, content, info.Mode())
	if err != nil {
		return HostsWriteResult{}, err
	}
	if err := writeHostsFileAtomic(path, updated, fileModeOrDefault(info.Mode())); err != nil {
		return HostsWriteResult{}, err
	}
	return HostsWriteResult{
		BackupPath: backupPath,
		Changed:    true,
	}, nil
}

// RemoveManagedHosts removes the exact managed block from a hosts file if present.
func RemoveManagedHosts(path, blockName string) (HostsWriteResult, error) {
	content, info, err := readHostsFile(path)
	if err != nil {
		return HostsWriteResult{}, err
	}
	updated, changed, err := removeManagedHostsContent(content, blockName)
	if err != nil {
		return HostsWriteResult{}, err
	}
	if !changed {
		return HostsWriteResult{Changed: false}, nil
	}

	backupPath, err := writeHostsBackup(path, content, info.Mode())
	if err != nil {
		return HostsWriteResult{}, err
	}
	if err := writeHostsFileAtomic(path, updated, fileModeOrDefault(info.Mode())); err != nil {
		return HostsWriteResult{}, err
	}
	return HostsWriteResult{
		BackupPath: backupPath,
		Changed:    true,
	}, nil
}

func readHostsFile(path string) (string, fs.FileInfo, error) {
	info, err := os.Stat(path)
	if err != nil {
		return "", nil, fmt.Errorf("stat hosts file %q: %w", path, err)
	}
	content, err := os.ReadFile(path) //nolint:gosec // Caller controls the system hosts file path.
	if err != nil {
		return "", nil, fmt.Errorf("read hosts file %q: %w", path, err)
	}
	return string(content), info, nil
}

func fileModeOrDefault(mode fs.FileMode) fs.FileMode {
	perm := mode.Perm()
	if perm == 0 {
		return osutil.FilePermDefault
	}
	return perm
}

func inspectHostsContent(content, blockName, address string, hostnames []string) (HostsFileStatus, error) {
	managed, err := extractManagedBlock(content, blockName)
	if err != nil {
		return HostsFileStatus{}, err
	}
	lineBreak := managed.lineBreak
	if lineBreak == "" {
		lineBreak = detectFileLineBreak(content)
	}
	desiredBlock := renderManagedBlock(blockName, address, hostnames, lineBreak)
	managed.exact = managed.present && managed.content == desiredBlock

	mappings := parseActiveHosts(content)
	normalizedHosts := normalizeHostnames(hostnames)
	status := HostsFileStatus{
		Managed: managed.present,
		State:   HostsStateInstalled,
	}

	for _, host := range normalizedHosts {
		addresses := sortedAddresses(mappings[host])
		switch {
		case len(addresses) == 0:
			status.Missing = append(status.Missing, host)
		case allLoopbackAddresses(addresses):
			continue
		default:
			status.Conflicts = append(status.Conflicts, HostsConflict{
				Host:      host,
				Addresses: addresses,
			})
		}
	}

	hasUnmanagedDesiredMappings := hasHostMappings(managed.prefix+managed.suffix, normalizedHosts)
	switch {
	case len(status.Conflicts) > 0:
		status.State = HostsStateConflict
	case len(status.Missing) > 0:
		status.State = HostsStateMissing
	case managed.present && managed.exact && !hasUnmanagedDesiredMappings:
		status.State = HostsStateInstalled
	default:
		status.State = HostsStatePresent
	}
	return status, nil
}

func ensureManagedHostsContent(content, blockName, address string, hostnames []string) (string, bool, error) {
	status, err := inspectHostsContent(content, blockName, address, hostnames)
	if err != nil {
		return "", false, err
	}
	if len(status.Conflicts) > 0 {
		return "", false, &HostsConflictError{Conflicts: status.Conflicts}
	}

	managed, err := extractManagedBlock(content, blockName)
	if err != nil {
		return "", false, err
	}

	lineBreak := managed.lineBreak
	if lineBreak == "" {
		lineBreak = detectFileLineBreak(content)
	}
	desiredBlock := renderManagedBlock(blockName, address, hostnames, lineBreak)
	managed.exact = managed.present && managed.content == desiredBlock

	if managed.present {
		if managed.exact {
			return content, false, nil
		}

		updated := managed.prefix + desiredBlock + managed.suffix
		if updated == content {
			return content, false, nil
		}
		return updated, true, nil
	}

	updated := appendManagedBlock(content, desiredBlock, lineBreak)
	if updated == content {
		return content, false, nil
	}
	return updated, true, nil
}

func removeManagedHostsContent(content, blockName string) (string, bool, error) {
	managed, err := extractManagedBlock(content, blockName)
	if err != nil {
		return "", false, err
	}
	if !managed.present {
		return content, false, nil
	}

	updated := managed.prefix + managed.suffix
	updated = trimLeadingBlankLines(trimTrailingBlankLines(updated))
	if updated != "" && !hasTrailingLineBreak(updated) {
		updated += managed.lineBreak
	}
	return updated, updated != content, nil
}

type managedBlock struct {
	content   string
	exact     bool
	present   bool
	lineBreak string
	prefix    string
	suffix    string
}

func extractManagedBlock(content, blockName string) (managedBlock, error) {
	startMarker := "# BEGIN " + blockName
	endMarker := "# END " + blockName

	startCount := strings.Count(content, startMarker)
	endCount := strings.Count(content, endMarker)
	switch {
	case startCount == 0 && endCount == 0:
		return managedBlock{lineBreak: detectFileLineBreak(content)}, nil
	case startCount != 1 || endCount != 1:
		return managedBlock{}, fmt.Errorf("%w: %s", ErrMalformedManagedHostsBlock, blockName)
	}

	startIdx := strings.Index(content, startMarker)
	endIdx := strings.Index(content, endMarker)
	if endIdx < startIdx {
		return managedBlock{}, fmt.Errorf("%w: %s", ErrMalformedManagedHostsBlock, blockName)
	}

	blockStart := lineStartIndex(content, startIdx)
	blockEnd := lineEndIndex(content, endIdx+len(endMarker))
	if blockEnd < startIdx {
		return managedBlock{}, fmt.Errorf("%w: %s", ErrMalformedManagedHostsBlock, blockName)
	}

	lineBreak := detectFileLineBreak(content)
	block := content[blockStart:blockEnd]
	return managedBlock{
		content:   block,
		present:   true,
		prefix:    content[:blockStart],
		suffix:    content[blockEnd:],
		lineBreak: lineBreak,
	}, nil
}

func renderManagedBlock(blockName, address string, hostnames []string, lineBreak string) string {
	if lineBreak == "" {
		lineBreak = "\n"
	}

	normalizedHosts := normalizeHostnames(hostnames)
	var builder strings.Builder
	builder.WriteString("# BEGIN ")
	builder.WriteString(blockName)
	builder.WriteString(lineBreak)
	for _, host := range normalizedHosts {
		builder.WriteString(address)
		builder.WriteString(" ")
		builder.WriteString(host)
		builder.WriteString(lineBreak)
	}
	builder.WriteString("# END ")
	builder.WriteString(blockName)
	builder.WriteString(lineBreak)
	return builder.String()
}

func appendManagedBlock(content, block, lineBreak string) string {
	if content == "" {
		return block
	}

	updated := content
	if !hasTrailingLineBreak(updated) {
		updated += lineBreak
	}
	if !strings.HasSuffix(updated, lineBreak+lineBreak) {
		updated += lineBreak
	}
	return updated + block
}

func parseActiveHosts(content string) map[string]map[string]struct{} {
	result := make(map[string]map[string]struct{})
	for _, rawLine := range strings.Split(content, "\n") {
		line := strings.TrimSpace(strings.TrimSuffix(rawLine, "\r"))
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) < 2 {
			continue
		}
		address := fields[0]
		if strings.HasPrefix(address, "#") {
			continue
		}
		for _, host := range fields[1:] {
			if strings.HasPrefix(host, "#") {
				break
			}
			if _, ok := result[host]; !ok {
				result[host] = make(map[string]struct{})
			}
			result[host][address] = struct{}{}
		}
	}
	return result
}

func sortedAddresses(values map[string]struct{}) []string {
	if len(values) == 0 {
		return nil
	}
	addresses := make([]string, 0, len(values))
	for address := range values {
		addresses = append(addresses, address)
	}
	sort.Strings(addresses)
	return addresses
}

func normalizeHostnames(hostnames []string) []string {
	seen := make(map[string]struct{}, len(hostnames))
	result := make([]string, 0, len(hostnames))
	for _, host := range hostnames {
		host = strings.TrimSpace(host)
		if host == "" {
			continue
		}
		if _, ok := seen[host]; ok {
			continue
		}
		seen[host] = struct{}{}
		result = append(result, host)
	}
	return result
}

func hasHostMappings(content string, hostnames []string) bool {
	mappings := parseActiveHosts(content)
	for _, host := range hostnames {
		if len(mappings[host]) > 0 {
			return true
		}
	}
	return false
}

func allLoopbackAddresses(addresses []string) bool {
	if len(addresses) == 0 {
		return false
	}
	for _, address := range addresses {
		ip := net.ParseIP(address)
		if ip == nil || !ip.IsLoopback() {
			return false
		}
	}
	return true
}

func detectFileLineBreak(content string) string {
	if strings.Contains(content, "\r\n") {
		return "\r\n"
	}
	return "\n"
}

func hasTrailingLineBreak(content string) bool {
	return strings.HasSuffix(content, "\n") || strings.HasSuffix(content, "\r\n")
}

func lineStartIndex(content string, idx int) int {
	if idx <= 0 {
		return 0
	}
	last := strings.LastIndex(content[:idx], "\n")
	if last == -1 {
		return 0
	}
	return last + 1
}

func lineEndIndex(content string, idx int) int {
	if idx >= len(content) {
		return len(content)
	}
	for idx < len(content) {
		switch content[idx] {
		case '\r':
			if idx+1 < len(content) && content[idx+1] == '\n' {
				return idx + 2
			}
			return idx + 1
		case '\n':
			return idx + 1
		default:
			idx++
		}
	}
	return len(content)
}

func trimTrailingBlankLines(content string) string {
	for {
		trimmed := strings.TrimSuffix(strings.TrimSuffix(content, "\n"), "\r")
		if trimmed == content {
			return content
		}
		lineStart := strings.LastIndex(trimmed, "\n")
		lastLine := trimmed
		if lineStart >= 0 {
			lastLine = trimmed[lineStart+1:]
		}
		if strings.TrimSpace(strings.TrimSuffix(lastLine, "\r")) != "" {
			return trimmed
		}
		content = trimmed
	}
}

func trimLeadingBlankLines(content string) string {
	for {
		if content == "" {
			return content
		}
		lineEnd := strings.Index(content, "\n")
		line := content
		next := ""
		if lineEnd >= 0 {
			line = content[:lineEnd]
			next = content[lineEnd+1:]
		}
		if strings.TrimSpace(strings.TrimSuffix(line, "\r")) != "" {
			return content
		}
		content = next
	}
}

func writeHostsBackup(path, content string, mode fs.FileMode) (string, error) {
	for range 100 {
		backupPath, err := nextHostsBackupPath(path)
		if err != nil {
			return "", err
		}
		file, err := os.OpenFile(backupPath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, fileModeOrDefault(mode))
		if err == nil {
			if _, err := file.WriteString(content); err != nil {
				_ = file.Close()
				return "", fmt.Errorf("write hosts backup %q: %w", backupPath, err)
			}
			if err := file.Close(); err != nil {
				return "", fmt.Errorf("close hosts backup %q: %w", backupPath, err)
			}
			return backupPath, nil
		}
		if !errors.Is(err, fs.ErrExist) {
			return "", fmt.Errorf("write hosts backup %q: %w", backupPath, err)
		}
	}
	return "", fmt.Errorf("allocate hosts backup path for %q: exhausted race retries", path)
}

func nextHostsBackupPath(path string) (string, error) {
	dir := filepath.Dir(path)
	base := filepath.Base(path)
	entries, err := os.ReadDir(dir)
	if err != nil {
		return "", fmt.Errorf("read hosts backup directory %q: %w", dir, err)
	}

	next := 0
	for _, entry := range entries {
		index, ok := hostsBackupIndex(base, entry.Name())
		if ok && index >= next {
			next = index + 1
		}
	}
	return hostsBackupPath(path, next), nil
}

func hostsBackupPath(path string, index int) string {
	if index == 0 {
		return path + ".studioctl.bak"
	}
	return fmt.Sprintf("%s.studioctl.%d.bak", path, index)
}

func hostsBackupIndex(base, name string) (int, bool) {
	if name == base+".studioctl.bak" {
		return 0, true
	}

	prefix := base + ".studioctl."
	suffix := ".bak"
	if !strings.HasPrefix(name, prefix) || !strings.HasSuffix(name, suffix) {
		return 0, false
	}
	indexText := strings.TrimSuffix(strings.TrimPrefix(name, prefix), suffix)
	if indexText == "" {
		return 0, false
	}
	index, err := strconv.Atoi(indexText)
	if err != nil || index < 1 {
		return 0, false
	}
	return index, true
}

func writeHostsFileAtomic(path, content string, mode fs.FileMode) error {
	dir := filepath.Dir(path)
	tmpFile, err := os.CreateTemp(dir, "."+filepath.Base(path)+".studioctl.tmp-*")
	if err != nil {
		return fmt.Errorf("write hosts file %q: create temp file: %w", path, err)
	}
	tmpPath := tmpFile.Name()
	cleanup := true
	defer func() {
		if cleanup {
			_ = os.Remove(tmpPath)
		}
	}()

	if err := tmpFile.Chmod(mode); err != nil {
		_ = tmpFile.Close()
		return fmt.Errorf("write hosts file %q: chmod temp file: %w", path, err)
	}
	if _, err := tmpFile.WriteString(content); err != nil {
		_ = tmpFile.Close()
		return fmt.Errorf("write hosts file %q: write temp file: %w", path, err)
	}
	if err := tmpFile.Sync(); err != nil {
		_ = tmpFile.Close()
		return fmt.Errorf("write hosts file %q: sync temp file: %w", path, err)
	}
	if err := tmpFile.Close(); err != nil {
		return fmt.Errorf("write hosts file %q: close temp file: %w", path, err)
	}
	if err := replacePathAtomic(tmpPath, path); err != nil {
		return fmt.Errorf("write hosts file %q: replace target: %w", path, err)
	}
	cleanup = false
	if err := syncDirIfSupported(dir); err != nil {
		return fmt.Errorf("write hosts file %q: sync directory: %w", path, err)
	}
	return nil
}

func replacePathAtomic(src, dst string) error {
	if runtime.GOOS != "windows" {
		return os.Rename(src, dst)
	}

	if err := os.Rename(src, dst); err == nil {
		return nil
	} else if !errors.Is(err, os.ErrExist) && !errors.Is(err, os.ErrPermission) {
		backupPath, backupErr := reserveReplaceBackupPath(dst)
		if backupErr != nil {
			return err
		}
		if moveErr := os.Rename(dst, backupPath); moveErr != nil {
			_ = os.Remove(backupPath)
			return err
		}
		if renameErr := os.Rename(src, dst); renameErr != nil {
			restoreErr := os.Rename(backupPath, dst)
			if restoreErr != nil {
				return errors.Join(renameErr, restoreErr)
			}
			return renameErr
		}
		if removeErr := os.Remove(backupPath); removeErr != nil && !errors.Is(removeErr, os.ErrNotExist) {
			return removeErr
		}
		return nil
	}

	backupPath, err := reserveReplaceBackupPath(dst)
	if err != nil {
		return err
	}
	if moveErr := os.Rename(dst, backupPath); moveErr != nil {
		_ = os.Remove(backupPath)
		return moveErr
	}
	if err := os.Rename(src, dst); err != nil {
		restoreErr := os.Rename(backupPath, dst)
		if restoreErr != nil {
			return errors.Join(err, restoreErr)
		}
		return err
	}
	if removeErr := os.Remove(backupPath); removeErr != nil && !errors.Is(removeErr, os.ErrNotExist) {
		return removeErr
	}
	return nil
}

func reserveReplaceBackupPath(dst string) (string, error) {
	backup, err := os.CreateTemp(filepath.Dir(dst), "."+filepath.Base(dst)+".old-*")
	if err != nil {
		return "", err
	}
	backupPath := backup.Name()
	if err := backup.Close(); err != nil {
		_ = os.Remove(backupPath)
		return "", err
	}
	if err := os.Remove(backupPath); err != nil {
		return "", err
	}
	return backupPath, nil
}

func syncDirIfSupported(path string) error {
	if runtime.GOOS == "windows" {
		return nil
	}
	dir, err := os.Open(path)
	if err != nil {
		return err
	}
	defer dir.Close()
	return dir.Sync()
}
