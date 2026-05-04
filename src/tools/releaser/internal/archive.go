package internal

import (
	"archive/tar"
	"compress/gzip"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"altinn.studio/releaser/internal/perm"
)

// ErrNoPathsSpecified is returned when CreateTarGz is called with no paths.
var ErrNoPathsSpecified = errors.New("no paths specified")

// CreateTarGz creates a gzipped tarball from the specified paths relative to baseDir.
// All paths are stored relative to baseDir in the archive.
func CreateTarGz(dest, baseDir string, paths ...string) (err error) {
	if len(paths) == 0 {
		return ErrNoPathsSpecified
	}

	if ensureErr := EnsureDir(filepath.Dir(dest)); ensureErr != nil {
		return fmt.Errorf("create destination directory: %w", ensureErr)
	}

	//nolint:gosec // G304: dest path is from trusted dev tooling input
	f, err := os.OpenFile(dest, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, perm.FilePermDefault)
	if err != nil {
		return fmt.Errorf("create archive file: %w", err)
	}
	defer func() { err = closeWithError(f, "close archive file", err) }()

	gw := gzip.NewWriter(f)
	defer func() { err = closeWithError(gw, "close gzip writer", err) }()

	tw := tar.NewWriter(gw)
	defer func() { err = closeWithError(tw, "close tar writer", err) }()

	for _, path := range paths {
		fullPath := filepath.Join(baseDir, path)
		if walkErr := addToTar(tw, baseDir, fullPath); walkErr != nil {
			return fmt.Errorf("add %s to archive: %w", path, walkErr)
		}
	}

	return nil
}

// addToTar recursively adds a file or directory to the tar writer.
func addToTar(tw *tar.Writer, baseDir, path string) error {
	walkErr := filepath.Walk(path, func(filePath string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		return addEntryToTar(tw, baseDir, filePath, info)
	})
	if walkErr != nil {
		return fmt.Errorf("walk %s: %w", path, walkErr)
	}
	return nil
}

// addEntryToTar adds a single file or directory entry to the tar writer.
func addEntryToTar(tw *tar.Writer, baseDir, filePath string, info os.FileInfo) error {
	relPath, err := filepath.Rel(baseDir, filePath)
	if err != nil {
		return fmt.Errorf("compute relative path: %w", err)
	}

	// Convert to forward slashes for tar (cross-platform compatibility)
	tarPath := filepath.ToSlash(relPath)

	header, err := tar.FileInfoHeader(info, "")
	if err != nil {
		return fmt.Errorf("create tar header: %w", err)
	}
	header.Name = tarPath

	if err := tw.WriteHeader(header); err != nil {
		return fmt.Errorf("write tar header: %w", err)
	}

	if info.IsDir() {
		return nil
	}

	return addFileContent(tw, filePath)
}

// addFileContent copies file content to the tar writer.
func addFileContent(tw *tar.Writer, filePath string) (err error) {
	//nolint:gosec // G304: filePath is from trusted dev tooling input via filepath.Walk
	f, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("open file: %w", err)
	}
	defer func() { err = closeWithError(f, "close source file", err) }()

	if _, copyErr := io.Copy(tw, f); copyErr != nil {
		return fmt.Errorf("copy file content: %w", copyErr)
	}

	return nil
}

// closeWithError closes a closer and combines any close error with an existing error.
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
