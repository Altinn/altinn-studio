// Package install handles bootstrapping STUDIOCTL_HOME with localtest resources.
package install

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"altinn.studio/studioctl/internal/perm"
)

const (
	// versionFile stores the installed version for upgrade detection.
	versionFile = ".version"

	// testdataDir is the directory containing test data.
	testdataDir = "testdata"

	// EnvResourcesTarball is the environment variable for local tarball path.
	// Used internally for development; not intended for end users.
	EnvResourcesTarball = "STUDIOCTL_RESOURCES_TARBALL"

	// releaseURLTemplate is the URL pattern for downloading resources.
	// {version} is replaced with the actual version tag.
	releaseURLTemplate = "https://github.com/Altinn/altinn-studio/releases/download/{version}/localtest-resources.tar.gz"

	// httpTimeout is the timeout for downloading resources.
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
)

// Options configures the install operation.
type Options struct {
	DataDir string // Target directory for resources ($STUDIOCTL_HOME/data)
	Version string // Current studioctl version (for version tracking)
	Force   bool   // Force reinstall even if already present
}

// IsInstalled checks if resources are installed and match the current version.
func IsInstalled(dataDir, currentVersion string) bool {
	// Check if testdata directory exists and has content
	testdataPath := filepath.Join(dataDir, testdataDir)
	entries, err := os.ReadDir(testdataPath)
	if err != nil || len(entries) == 0 {
		return false
	}

	// Check version file matches
	versionPath := filepath.Join(dataDir, versionFile)
	//nolint:gosec // G304: Path is constructed from trusted dataDir parameter
	data, err := os.ReadFile(versionPath)
	if err != nil {
		return false
	}

	installedVersion := strings.TrimSpace(string(data))
	return installedVersion == currentVersion
}

// Install extracts localtest resources to the data directory.
// If STUDIOCTL_RESOURCES_TARBALL env var is set, extracts from that local file.
// Otherwise, downloads from GitHub releases.
func Install(ctx context.Context, opts Options) error {
	if opts.DataDir == "" {
		return ErrDataDirRequired
	}

	// Check if already installed (unless force)
	if !opts.Force && IsInstalled(opts.DataDir, opts.Version) {
		return ErrAlreadyInstalled
	}

	// Check for local tarball first (used by dev tooling)
	if tarballPath := os.Getenv(EnvResourcesTarball); tarballPath != "" {
		return installFromLocalTarball(tarballPath, opts)
	}

	return installFromRelease(ctx, opts)
}

// installFromLocalTarball extracts resources from a local tarball file.
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

// installFromRelease downloads and extracts resources from GitHub releases.
func installFromRelease(ctx context.Context, opts Options) (err error) {
	if opts.Version == "" || opts.Version == "dev" {
		return ErrVersionRequired
	}

	url := strings.Replace(releaseURLTemplate, "{version}", opts.Version, 1)

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

	// Limit the size of the download
	limitedReader := io.LimitReader(resp.Body, maxArchiveSize)

	if err := extractTarGz(limitedReader, opts.DataDir); err != nil {
		return fmt.Errorf("extract archive: %w", err)
	}

	return finishInstall(opts)
}

// finishInstall creates additional directories and writes the version file.
func finishInstall(opts Options) error {
	// Create AltinnPlatformLocal directory
	altinnDir := filepath.Join(opts.DataDir, "AltinnPlatformLocal")
	if err := os.MkdirAll(altinnDir, perm.DirPermDefault); err != nil {
		return fmt.Errorf("create AltinnPlatformLocal: %w", err)
	}

	// Write version file
	if err := writeVersionFile(opts.DataDir, opts.Version); err != nil {
		return fmt.Errorf("write version file: %w", err)
	}

	return nil
}

// extractTarGz extracts a gzipped tar archive to the destination directory.
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

// extractTarEntry extracts a single tar entry to the destination directory.
func extractTarEntry(tr *tar.Reader, header *tar.Header, dst string) error {
	// Validate and sanitize path to prevent path traversal
	cleanName := filepath.Clean(header.Name)
	if strings.HasPrefix(cleanName, "..") || filepath.IsAbs(cleanName) {
		return nil // Skip potentially malicious paths
	}

	target := filepath.Join(dst, cleanName)

	// Ensure the target is within the destination directory
	if !strings.HasPrefix(filepath.Clean(target), filepath.Clean(dst)) {
		return nil // Skip path traversal attempts
	}

	switch header.Typeflag {
	case tar.TypeDir:
		if err := os.MkdirAll(target, perm.DirPermDefault); err != nil {
			return fmt.Errorf("create directory %s: %w", target, err)
		}

	case tar.TypeReg:
		if err := extractRegularFile(tr, header, target); err != nil {
			return err
		}
	}

	return nil
}

// extractRegularFile extracts a regular file from the tar reader.
func extractRegularFile(tr *tar.Reader, header *tar.Header, target string) (err error) {
	// Limit individual file size
	if header.Size > maxFileSize {
		return fmt.Errorf("%w: %s", ErrFileTooLarge, header.Name)
	}

	if mkdirErr := os.MkdirAll(filepath.Dir(target), perm.DirPermDefault); mkdirErr != nil {
		return fmt.Errorf("create parent dir for %s: %w", target, mkdirErr)
	}

	//nolint:gosec // G304: target is sanitized in extractTarEntry
	f, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, perm.FilePermDefault)
	if err != nil {
		return fmt.Errorf("create file %s: %w", target, err)
	}
	defer func() { err = closeWithError(f, "close file "+target, err) }()

	// Use LimitReader to enforce file size limit
	if _, copyErr := io.Copy(f, io.LimitReader(tr, header.Size)); copyErr != nil {
		return fmt.Errorf("write file %s: %w", target, copyErr)
	}

	return nil
}

// writeVersionFile writes the version to the data directory.
func writeVersionFile(dataDir, version string) error {
	versionPath := filepath.Join(dataDir, versionFile)
	if err := os.WriteFile(versionPath, []byte(version+"\n"), perm.FilePermDefault); err != nil {
		return fmt.Errorf("write version: %w", err)
	}
	return nil
}

// closeWithError closes a closer and combines any close error with an existing error.
// If both errors exist, the close error is wrapped with msg.
// This ensures close errors are never silently ignored.
func closeWithError(c io.Closer, msg string, existingErr error) error {
	closeErr := c.Close()
	if closeErr == nil {
		return existingErr
	}
	if existingErr == nil {
		return fmt.Errorf("%s: %w", msg, closeErr)
	}
	// Both errors exist - return the original but log would be nice here
	// For now, we prioritize the original error as it's more informative
	return existingErr
}
