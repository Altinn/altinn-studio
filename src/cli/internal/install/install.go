// Package install handles bootstrapping STUDIOCTL_HOME with localtest resources.
package install

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/osutil"
)

const (
	versionFile = ".version"

	sourceMarkerFile = ".source-marker"

	testdataDir = "testdata"

	releaseURLTemplate = "https://github.com/Altinn/altinn-studio/releases/download/{version}/localtest-resources.tar.gz"

	httpTimeout = 5 * time.Minute

	// maxArchiveSize is the maximum size of the archive to extract (50MB).
	maxArchiveSize = 50 * 1024 * 1024

	// maxFileSize is the maximum size of a single file in the archive (10MB).
	maxFileSize = 10 * 1024 * 1024
)

// Sentinel errors for install operations.
var (
	// ErrAlreadyInstalled is returned when resources are already installed.
	ErrAlreadyInstalled = errors.New("resources already installed")

	// ErrVersionRequired is returned when release mode requires version.
	ErrVersionRequired = errors.New("version required for release mode install")

	// ErrDownloadFailed is returned when resource download fails.
	ErrDownloadFailed = errors.New("failed to download resources")

	// ErrDataDirRequired is returned when data directory is not specified.
	ErrDataDirRequired = errors.New("data directory is required")

	// ErrFileTooLarge is returned when a file in the archive exceeds maximum size.
	ErrFileTooLarge = errors.New("file exceeds maximum size")

	// ErrTarballNotFound is returned when the local tarball file doesn't exist.
	ErrTarballNotFound = errors.New("local tarball not found")

	// ErrInvalidTarballPath is returned when the tarball path is invalid.
	ErrInvalidTarballPath = errors.New("invalid tarball path")

	// ErrInvalidArchiveFileSize is returned when an archive entry has an invalid size.
	ErrInvalidArchiveFileSize = errors.New("invalid archive file size")
)

// Options configures the install operation.
type Options struct {
	DataDir string // Target directory for resources ($STUDIOCTL_HOME/data)
	Version string // Current studioctl version (for version tracking)
	Force   bool   // Force reinstall even if already present
}

// State represents the current install state of localtest resources.
type State uint8

const (
	// StateInstalled means resources are installed and match current version/source.
	StateInstalled State = iota
	// StateNotInstalled means no install metadata/resources were found.
	StateNotInstalled
	// StatePartial means only part of expected install metadata/resources were found.
	StatePartial
	// StateTestdataUnreadable means testdata directory exists but is unreadable.
	StateTestdataUnreadable
	// StateVersionUnreadable means version file exists but is unreadable.
	StateVersionUnreadable
	// StateSourceMarkerUnreadable means source marker file exists but is unreadable.
	StateSourceMarkerUnreadable
	// StateTestdataEmpty means testdata exists but has no content.
	StateTestdataEmpty
	// StateVersionEmpty means version file is present but empty.
	StateVersionEmpty
	// StateVersionMismatch means installed version differs from current version.
	StateVersionMismatch
	// StateSourceMarkerMismatch means source marker differs from expected source marker.
	StateSourceMarkerMismatch
	// StateInvalidExpectedSource means expected source marker could not be computed.
	StateInvalidExpectedSource
)

// Status contains structured details about localtest resource install state.
type Status struct {
	Err   error
	Path  string
	State State
}

// CheckInstallStatus checks whether resources are installed and valid for currentVersion.
func CheckInstallStatus(dataDir, currentVersion string) Status {
	paths := newInstallPaths(dataDir)
	testdataEntries, versionRaw, sourceMarkerRaw, early := readInstallArtifacts(paths)
	if early != nil {
		return *early
	}

	return evaluateInstallArtifacts(paths, currentVersion, testdataEntries, versionRaw, sourceMarkerRaw)
}

// IsInstalled checks if resources are installed and match the current version.
func IsInstalled(dataDir, currentVersion string) bool {
	status := CheckInstallStatus(dataDir, currentVersion)
	return status.State == StateInstalled
}

type installPaths struct {
	dataDir          string
	testdataPath     string
	versionPath      string
	sourceMarkerPath string
}

func newInstallPaths(dataDir string) installPaths {
	return installPaths{
		dataDir:          dataDir,
		testdataPath:     filepath.Join(dataDir, testdataDir),
		versionPath:      filepath.Join(dataDir, versionFile),
		sourceMarkerPath: filepath.Join(dataDir, sourceMarkerFile),
	}
}

func newStatus(state State, path string) Status {
	return Status{
		Err:   nil,
		Path:  path,
		State: state,
	}
}

func statusWithError(state State, path string, err error) Status {
	status := newStatus(state, path)
	status.Err = err
	return status
}

func readInstallArtifacts(paths installPaths) ([]os.DirEntry, []byte, []byte, *Status) {
	testdataEntries, testdataErr := os.ReadDir(paths.testdataPath)
	versionRaw, versionErr := readTrustedFile(paths.versionPath)
	sourceMarkerRaw, sourceMarkerErr := readTrustedFile(paths.sourceMarkerPath)

	testdataMissing := errors.Is(testdataErr, os.ErrNotExist)
	versionMissing := errors.Is(versionErr, os.ErrNotExist)
	sourceMarkerMissing := errors.Is(sourceMarkerErr, os.ErrNotExist)

	if testdataMissing && versionMissing && sourceMarkerMissing {
		status := newStatus(StateNotInstalled, paths.dataDir)
		return nil, nil, nil, &status
	}

	if testdataErr != nil && !testdataMissing {
		status := statusWithError(StateTestdataUnreadable, paths.testdataPath, testdataErr)
		return nil, nil, nil, &status
	}
	if versionErr != nil && !versionMissing {
		status := statusWithError(StateVersionUnreadable, paths.versionPath, versionErr)
		return nil, nil, nil, &status
	}
	if sourceMarkerErr != nil && !sourceMarkerMissing {
		status := statusWithError(StateSourceMarkerUnreadable, paths.sourceMarkerPath, sourceMarkerErr)
		return nil, nil, nil, &status
	}
	if testdataMissing || versionMissing || sourceMarkerMissing {
		status := newStatus(StatePartial, paths.dataDir)
		return nil, nil, nil, &status
	}

	return testdataEntries, versionRaw, sourceMarkerRaw, nil
}

func evaluateInstallArtifacts(
	paths installPaths,
	currentVersion string,
	testdataEntries []os.DirEntry,
	versionRaw []byte,
	sourceMarkerRaw []byte,
) Status {
	if len(testdataEntries) == 0 {
		return newStatus(StateTestdataEmpty, paths.dataDir)
	}

	installedVersion := strings.TrimSpace(string(versionRaw))
	if installedVersion == "" {
		return newStatus(StateVersionEmpty, paths.versionPath)
	}
	if installedVersion != currentVersion {
		return newStatus(StateVersionMismatch, paths.dataDir)
	}

	installedMarker := strings.TrimSpace(string(sourceMarkerRaw))
	matches, err := sourceMarkerMatchesCurrent(currentVersion, installedMarker)
	if err != nil {
		return statusWithError(StateInvalidExpectedSource, paths.sourceMarkerPath, err)
	}
	if !matches {
		return newStatus(StateSourceMarkerMismatch, paths.sourceMarkerPath)
	}

	return newStatus(StateInstalled, paths.dataDir)
}

func sourceMarkerMatchesCurrent(currentVersion, installedMarker string) (bool, error) {
	if installedMarker == "" {
		return false, nil
	}

	tarballPath := os.Getenv(config.EnvResourcesTarball)
	if tarballPath != "" {
		expectedMarker, err := expectedSourceMarker(currentVersion)
		if err != nil {
			return false, err
		}
		return installedMarker == expectedMarker, nil
	}

	releaseMarker := "release-version:" + normalizeVersionForURL(currentVersion)
	if installedMarker == releaseMarker {
		return true, nil
	}

	if hash, ok := strings.CutPrefix(installedMarker, "tarball-sha256:"); ok {
		return strings.TrimSpace(hash) != "", nil
	}

	return false, nil
}

func readTrustedFile(path string) ([]byte, error) {
	//nolint:gosec // G304: path is constructed from trusted internal config directories
	content, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read file %s: %w", path, err)
	}
	return content, nil
}

// Install extracts localtest resources to the data directory.
func Install(ctx context.Context, opts Options) error {
	if opts.DataDir == "" {
		return ErrDataDirRequired
	}

	if !opts.Force && IsInstalled(opts.DataDir, opts.Version) {
		return ErrAlreadyInstalled
	}

	if tarballPath := os.Getenv(config.EnvResourcesTarball); tarballPath != "" {
		return installFromLocalTarball(tarballPath, opts)
	}

	return installFromRelease(ctx, opts)
}

func installFromLocalTarball(tarballPath string, opts Options) (err error) {
	validatedPath, err := validateTarballPath(tarballPath)
	if err != nil {
		return err
	}

	//nolint:gosec // G304: path validated by validateTarballPath
	f, err := os.Open(validatedPath)
	if err != nil {
		return fmt.Errorf("open tarball: %w", err)
	}
	defer func() { err = closeWithError(f, "close tarball", err) }()

	if err := extractTarGz(f, opts.DataDir); err != nil {
		return fmt.Errorf("extract tarball: %w", err)
	}

	return finishInstall(opts)
}

func validateTarballPath(path string) (string, error) {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		return "", fmt.Errorf("%w: empty path", ErrInvalidTarballPath)
	}

	cleaned := filepath.Clean(trimmed)
	if !filepath.IsAbs(cleaned) {
		abs, err := filepath.Abs(cleaned)
		if err != nil {
			return "", fmt.Errorf("resolve tarball path: %w", err)
		}
		cleaned = abs
	}

	info, err := os.Lstat(cleaned)
	if err != nil {
		if os.IsNotExist(err) {
			return "", fmt.Errorf("%w: %s", ErrTarballNotFound, cleaned)
		}
		return "", fmt.Errorf("stat tarball: %w", err)
	}
	if info.Mode()&os.ModeSymlink != 0 {
		return "", fmt.Errorf("%w: %s", ErrInvalidTarballPath, cleaned)
	}
	if !info.Mode().IsRegular() {
		return "", fmt.Errorf("%w: %s", ErrInvalidTarballPath, cleaned)
	}

	return cleaned, nil
}

func normalizeVersionForURL(version string) string {
	version = strings.TrimPrefix(version, "studioctl/")
	return "studioctl/" + version
}

func installFromRelease(ctx context.Context, opts Options) (err error) {
	if opts.Version == "" || opts.Version == "dev" {
		return ErrVersionRequired
	}

	versionForURL := normalizeVersionForURL(opts.Version)
	url := strings.Replace(releaseURLTemplate, "{version}", versionForURL, 1)

	client := &http.Client{Timeout: httpTimeout}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("%w: %w", ErrDownloadFailed, err)
	}
	defer func() { err = closeWithError(resp.Body, "close response body", err) }()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("%w: HTTP %d", ErrDownloadFailed, resp.StatusCode)
	}

	limitedReader := io.LimitReader(resp.Body, maxArchiveSize)

	if err := extractTarGz(limitedReader, opts.DataDir); err != nil {
		return fmt.Errorf("extract archive: %w", err)
	}

	return finishInstall(opts)
}

func finishInstall(opts Options) error {
	altinnDir := filepath.Join(opts.DataDir, "AltinnPlatformLocal")
	if err := os.MkdirAll(altinnDir, osutil.DirPermDefault); err != nil {
		return fmt.Errorf("create AltinnPlatformLocal: %w", err)
	}

	if err := writeVersionFile(opts.DataDir, opts.Version); err != nil {
		return fmt.Errorf("write version file: %w", err)
	}

	if err := writeSourceMarker(opts.DataDir, opts.Version); err != nil {
		return fmt.Errorf("write source marker: %w", err)
	}

	return nil
}

func extractTarGz(r io.Reader, dst string) (err error) {
	gzr, err := gzip.NewReader(r)
	if err != nil {
		return fmt.Errorf("create gzip reader: %w", err)
	}
	defer func() { err = closeWithError(gzr, "close gzip reader", err) }()

	tr := tar.NewReader(gzr)

	for {
		header, err := tr.Next()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return fmt.Errorf("read tar header: %w", err)
		}

		if err := extractTarEntry(tr, header, dst); err != nil {
			return err
		}
	}

	return nil
}

func extractTarEntry(tr *tar.Reader, header *tar.Header, dst string) error {
	// Validate and sanitize path to prevent path traversal
	cleanName := filepath.Clean(header.Name)
	if strings.HasPrefix(cleanName, "..") || filepath.IsAbs(cleanName) {
		return nil // Skip potentially malicious paths
	}

	target := filepath.Join(dst, cleanName)
	cleanDst := filepath.Clean(dst)
	cleanTarget := filepath.Clean(target)
	relPath, err := filepath.Rel(cleanDst, cleanTarget)
	if err != nil {
		return fmt.Errorf("resolve archive entry path %s: %w", header.Name, err)
	}
	if relPath == ".." || strings.HasPrefix(relPath, ".."+string(filepath.Separator)) {
		return nil // Skip path traversal attempts
	}

	switch header.Typeflag {
	case tar.TypeDir:
		info, statErr := os.Stat(target)
		if statErr == nil && !info.IsDir() {
			if removeErr := os.Remove(target); removeErr != nil {
				return fmt.Errorf("remove non-directory path %s: %w", target, removeErr)
			}
		} else if statErr != nil && !errors.Is(statErr, os.ErrNotExist) {
			return fmt.Errorf("stat directory target %s: %w", target, statErr)
		}
		if err := os.MkdirAll(target, osutil.DirPermDefault); err != nil {
			return fmt.Errorf("create directory %s: %w", target, err)
		}

	case tar.TypeReg:
		if err := extractRegularFile(tr, header, target); err != nil {
			return err
		}
	}

	return nil
}

func extractRegularFile(tr *tar.Reader, header *tar.Header, target string) (err error) {
	if header.Size < 0 {
		return fmt.Errorf("%w: %s (%d)", ErrInvalidArchiveFileSize, header.Name, header.Size)
	}

	if header.Size > maxFileSize {
		return fmt.Errorf("%w: %s", ErrFileTooLarge, header.Name)
	}

	info, statErr := os.Stat(target)
	if statErr == nil && info.IsDir() {
		if removeErr := os.RemoveAll(target); removeErr != nil {
			return fmt.Errorf("remove directory at file path %s: %w", target, removeErr)
		}
	} else if statErr != nil && !errors.Is(statErr, os.ErrNotExist) {
		return fmt.Errorf("stat file target %s: %w", target, statErr)
	}

	if mkdirErr := os.MkdirAll(filepath.Dir(target), osutil.DirPermDefault); mkdirErr != nil {
		return fmt.Errorf("create parent dir for %s: %w", target, mkdirErr)
	}

	//nolint:gosec // G304: target is sanitized in extractTarEntry
	f, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, osutil.FilePermDefault)
	if err != nil {
		return fmt.Errorf("create file %s: %w", target, err)
	}
	defer func() { err = closeWithError(f, "close file "+target, err) }()

	if _, copyErr := io.Copy(f, io.LimitReader(tr, header.Size)); copyErr != nil {
		return fmt.Errorf("write file %s: %w", target, copyErr)
	}

	return nil
}

func writeVersionFile(dataDir, version string) error {
	versionPath := filepath.Join(dataDir, versionFile)
	if err := os.WriteFile(versionPath, []byte(version+"\n"), osutil.FilePermDefault); err != nil {
		return fmt.Errorf("write version: %w", err)
	}
	return nil
}

func writeSourceMarker(dataDir, version string) error {
	marker, err := expectedSourceMarker(version)
	if err != nil {
		return err
	}

	markerPath := filepath.Join(dataDir, sourceMarkerFile)
	if err := os.WriteFile(markerPath, []byte(marker+"\n"), osutil.FilePermDefault); err != nil {
		return fmt.Errorf("write source marker: %w", err)
	}
	return nil
}

func expectedSourceMarker(version string) (string, error) {
	tarballPath := os.Getenv(config.EnvResourcesTarball)
	if tarballPath != "" {
		validatedPath, err := validateTarballPath(tarballPath)
		if err != nil {
			return "", err
		}

		sum, err := fileSHA256Hex(validatedPath)
		if err != nil {
			return "", fmt.Errorf("hash tarball: %w", err)
		}
		return "tarball-sha256:" + sum, nil
	}

	return "release-version:" + normalizeVersionForURL(version), nil
}

func fileSHA256Hex(path string) (sum string, err error) {
	//nolint:gosec // G304: Path is validated by caller in tarball mode.
	f, err := os.Open(path)
	if err != nil {
		return "", fmt.Errorf("open file for hashing: %w", err)
	}
	defer func() { err = closeWithError(f, "close hash file", err) }()

	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", fmt.Errorf("hash file contents: %w", err)
	}

	return hex.EncodeToString(h.Sum(nil)), nil
}

func closeWithError(c io.Closer, msg string, existingErr error) error {
	closeErr := c.Close()
	if closeErr == nil {
		return existingErr
	}
	if existingErr == nil {
		return fmt.Errorf("%s: %w", msg, closeErr)
	}
	return existingErr
}
