package install

import (
	"archive/tar"
	"compress/gzip"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"altinn.studio/studioctl/internal/osutil"
)

const (
	maxFileSize = 10 * 1024 * 1024
)

type extractTarGzOptions struct {
	MaxArchiveSize   int64
	MaxFileSize      int64
	PreserveFileMode bool
}

var (
	errNoPathsSpecified       = errors.New("no paths specified")
	errFileTooLarge           = errors.New("file exceeds maximum size")
	errArchiveNotFound        = errors.New("local archive not found")
	errInvalidArchivePath     = errors.New("invalid archive path")
	errInvalidArchiveFileSize = errors.New("invalid archive file size")
	errArchiveTooLarge        = errors.New("archive exceeds maximum size")
)

func createTarGz(dest, baseDir string, paths ...string) (err error) {
	if len(paths) == 0 {
		return errNoPathsSpecified
	}

	if ensureErr := os.MkdirAll(filepath.Dir(dest), osutil.DirPermDefault); ensureErr != nil {
		return fmt.Errorf("create destination directory: %w", ensureErr)
	}

	//nolint:gosec // G304: dest path is from trusted packaging input.
	f, err := os.OpenFile(dest, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, osutil.FilePermDefault)
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

func addEntryToTar(tw *tar.Writer, baseDir, filePath string, info os.FileInfo) (err error) {
	relPath, err := filepath.Rel(baseDir, filePath)
	if err != nil {
		return fmt.Errorf("compute relative path: %w", err)
	}

	header, err := tar.FileInfoHeader(info, "")
	if err != nil {
		return fmt.Errorf("create tar header: %w", err)
	}
	header.Name = filepath.ToSlash(relPath)

	if writeErr := tw.WriteHeader(header); writeErr != nil {
		return fmt.Errorf("write tar header: %w", writeErr)
	}

	if info.IsDir() {
		return nil
	}

	//nolint:gosec // G304: filePath comes from filepath.Walk below trusted packaging input.
	srcFile, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("open file: %w", err)
	}
	defer func() { err = closeWithError(srcFile, "close source", err) }()

	if _, copyErr := io.Copy(tw, srcFile); copyErr != nil {
		return fmt.Errorf("copy file content: %w", copyErr)
	}
	return nil
}

func validateArchivePath(path string) (string, error) {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		return "", fmt.Errorf("%w: empty path", errInvalidArchivePath)
	}

	cleaned := filepath.Clean(trimmed)
	if !filepath.IsAbs(cleaned) {
		abs, err := filepath.Abs(cleaned)
		if err != nil {
			return "", fmt.Errorf("resolve archive path: %w", err)
		}
		cleaned = abs
	}

	info, err := os.Lstat(cleaned)
	if err != nil {
		if os.IsNotExist(err) {
			return "", fmt.Errorf("%w: %s", errArchiveNotFound, cleaned)
		}
		return "", fmt.Errorf("stat archive: %w", err)
	}
	if info.Mode()&os.ModeSymlink != 0 {
		return "", fmt.Errorf("%w: %s", errInvalidArchivePath, cleaned)
	}
	if !info.Mode().IsRegular() {
		return "", fmt.Errorf("%w: %s", errInvalidArchivePath, cleaned)
	}

	return cleaned, nil
}

func extractTarGzFile(path, dst string, opts extractTarGzOptions) (err error) {
	validatedPath, err := validateArchivePath(path)
	if err != nil {
		return err
	}

	info, err := os.Stat(validatedPath)
	if err != nil {
		return fmt.Errorf("stat archive: %w", err)
	}
	if opts.MaxArchiveSize > 0 && info.Size() > opts.MaxArchiveSize {
		return fmt.Errorf("%w: %s", errArchiveTooLarge, validatedPath)
	}

	//nolint:gosec // G304: path validated by validateArchivePath
	f, err := os.Open(validatedPath)
	if err != nil {
		return fmt.Errorf("open archive: %w", err)
	}
	defer func() { err = closeWithError(f, "close archive", err) }()

	return extractTarGzWithOptions(f, dst, opts)
}

func extractTarGzWithOptions(r io.Reader, dst string, opts extractTarGzOptions) (err error) {
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

		if err := extractTarEntry(tr, header, dst, opts); err != nil {
			return err
		}
	}

	return nil
}

func extractTarEntry(tr *tar.Reader, header *tar.Header, dst string, opts extractTarGzOptions) error {
	cleanName := filepath.Clean(header.Name)
	if strings.HasPrefix(cleanName, "..") || filepath.IsAbs(cleanName) {
		return nil
	}

	target := filepath.Join(dst, cleanName)
	cleanDst := filepath.Clean(dst)
	cleanTarget := filepath.Clean(target)
	relPath, err := filepath.Rel(cleanDst, cleanTarget)
	if err != nil {
		return fmt.Errorf("resolve archive entry path %s: %w", header.Name, err)
	}
	if relPath == ".." || strings.HasPrefix(relPath, ".."+string(filepath.Separator)) {
		return nil
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
		if err := extractRegularFileWithOptions(tr, header, target, opts); err != nil {
			return err
		}
	}

	return nil
}

func extractRegularFile(tr *tar.Reader, header *tar.Header, target string) error {
	return extractRegularFileWithOptions(
		tr,
		header,
		target,
		extractTarGzOptions{
			MaxArchiveSize:   0,
			MaxFileSize:      maxFileSize,
			PreserveFileMode: false,
		},
	)
}

func extractRegularFileWithOptions(
	tr *tar.Reader,
	header *tar.Header,
	target string,
	opts extractTarGzOptions,
) (err error) {
	if header.Size < 0 {
		return fmt.Errorf("%w: %s (%d)", errInvalidArchiveFileSize, header.Name, header.Size)
	}

	if opts.MaxFileSize > 0 && header.Size > opts.MaxFileSize {
		return fmt.Errorf("%w: %s", errFileTooLarge, header.Name)
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

	fileMode := archiveFileMode(header, opts.PreserveFileMode)
	//nolint:gosec // G304: target is sanitized in extractTarEntry
	f, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, fileMode)
	if err != nil {
		return fmt.Errorf("create file %s: %w", target, err)
	}
	defer func() { err = closeWithError(f, "close file "+target, err) }()

	if _, copyErr := io.Copy(f, io.LimitReader(tr, header.Size)); copyErr != nil {
		return fmt.Errorf("write file %s: %w", target, copyErr)
	}
	if opts.PreserveFileMode {
		if chmodErr := f.Chmod(fileMode); chmodErr != nil {
			return fmt.Errorf("set file mode for %s: %w", target, chmodErr)
		}
	}

	return nil
}

func archiveFileMode(header *tar.Header, preserve bool) os.FileMode {
	if !preserve {
		return osutil.FilePermDefault
	}
	const permissionBits = 0o777
	perm := header.Mode & permissionBits
	if perm < 0 || perm > permissionBits {
		return osutil.FilePermDefault
	}
	mode := os.FileMode(perm)
	if mode == 0 {
		return osutil.FilePermDefault
	}
	return mode
}
