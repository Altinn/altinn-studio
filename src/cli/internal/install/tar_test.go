//nolint:testpackage // testing unexported functions
package install

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"altinn.studio/studioctl/internal/osutil"
)

func TestValidateArchivePath(t *testing.T) {
	tests := []struct {
		wantErr   error
		setup     func(t *testing.T) string
		name      string
		wantValid bool
	}{
		{
			name:      "valid regular file",
			wantValid: true,
			setup: func(t *testing.T) string {
				t.Helper()
				dir := t.TempDir()
				path := filepath.Join(dir, "test.tar.gz")
				if err := os.WriteFile(path, []byte("test"), 0o644); err != nil {
					t.Fatal(err)
				}
				return path
			},
		},
		{
			name:    "empty path",
			wantErr: errInvalidArchivePath,
			setup: func(t *testing.T) string {
				t.Helper()
				return ""
			},
		},
		{
			name:    "whitespace only path",
			wantErr: errInvalidArchivePath,
			setup: func(t *testing.T) string {
				t.Helper()
				return "   "
			},
		},
		{
			name:    "non-existent file",
			wantErr: errArchiveNotFound,
			setup: func(t *testing.T) string {
				t.Helper()
				return filepath.Join(t.TempDir(), "nonexistent.tar.gz")
			},
		},
		{
			name:    "symlink rejected",
			wantErr: errInvalidArchivePath,
			setup: func(t *testing.T) string {
				t.Helper()
				if runtime.GOOS == osutil.OSWindows {
					t.Skip("symlink setup requires elevated privileges on some Windows hosts")
				}
				dir := t.TempDir()
				target := filepath.Join(dir, "target.tar.gz")
				if err := os.WriteFile(target, []byte("test"), 0o644); err != nil {
					t.Fatal(err)
				}
				link := filepath.Join(dir, "link.tar.gz")
				if err := os.Symlink(target, link); err != nil {
					t.Fatal(err)
				}
				return link
			},
		},
		{
			name:    "directory rejected",
			wantErr: errInvalidArchivePath,
			setup: func(t *testing.T) string {
				t.Helper()
				return t.TempDir()
			},
		},
		{
			name:      "relative path resolved",
			wantValid: true,
			setup: func(t *testing.T) string {
				t.Helper()
				dir := t.TempDir()
				path := filepath.Join(dir, "test.tar.gz")
				if err := os.WriteFile(path, []byte("test"), 0o644); err != nil {
					t.Fatal(err)
				}
				t.Chdir(dir)
				return "test.tar.gz"
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			path := tt.setup(t)

			result, err := validateArchivePath(path)

			if tt.wantErr != nil {
				if !errors.Is(err, tt.wantErr) {
					t.Errorf("validateArchivePath() error = %v, wantErr %v", err, tt.wantErr)
				}
				return
			}

			if err != nil {
				t.Errorf("validateArchivePath() unexpected error = %v", err)
				return
			}

			if !tt.wantValid {
				t.Error("validateArchivePath() expected error but got nil")
				return
			}

			if !filepath.IsAbs(result) {
				t.Errorf("validateArchivePath() result not absolute: %s", result)
			}
		})
	}
}

func TestExtractTarGz(t *testing.T) {
	tests := []struct {
		wantErrType error
		wantFiles   map[string]string
		createTar   func(t *testing.T) []byte
		name        string
		wantErr     bool
	}{
		{
			name: "valid archive with files",
			wantFiles: map[string]string{
				"testdata/file1.txt":         "content1",
				"testdata/subdir/file2.json": `{"key": "value"}`,
			},
			createTar: func(t *testing.T) []byte {
				t.Helper()
				return createTestTarGz(t, map[string]string{
					"testdata/file1.txt":         "content1",
					"testdata/subdir/file2.json": `{"key": "value"}`,
				})
			},
		},
		{
			name: "path traversal attempt - relative",
			wantFiles: map[string]string{
				"safe.txt": "safe",
			},
			createTar: func(t *testing.T) []byte {
				t.Helper()
				return createTestTarGzRaw(t, []tarEntry{
					{name: "../outside.txt", content: "malicious", isDir: false},
					{name: "safe.txt", content: "safe", isDir: false},
				})
			},
		},
		{
			name: "path traversal attempt - absolute",
			wantFiles: map[string]string{
				"safe.txt": "safe",
			},
			createTar: func(t *testing.T) []byte {
				t.Helper()
				return createTestTarGzRaw(t, []tarEntry{
					{name: "/etc/passwd", content: "malicious", isDir: false},
					{name: "safe.txt", content: "safe", isDir: false},
				})
			},
		},
		{
			name:        "file size limit exceeded",
			wantErr:     true,
			wantErrType: errFileTooLarge,
			createTar: func(t *testing.T) []byte {
				t.Helper()
				largeContent := strings.Repeat("x", maxFileSize+1)
				return createTestTarGz(t, map[string]string{
					"large.txt": largeContent,
				})
			},
		},
		{
			name:      "empty archive",
			wantFiles: map[string]string{},
			createTar: func(t *testing.T) []byte {
				t.Helper()
				return createTestTarGz(t, map[string]string{})
			},
		},
		{
			name: "directory entries",
			wantFiles: map[string]string{
				"testdata/subdir/file.txt": "content",
			},
			createTar: func(t *testing.T) []byte {
				t.Helper()
				return createTestTarGzRaw(t, []tarEntry{
					{name: "testdata/", content: "", isDir: true},
					{name: "testdata/subdir/", content: "", isDir: true},
					{name: "testdata/subdir/file.txt", content: "content", isDir: false},
				})
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dst := t.TempDir()
			tarData := tt.createTar(t)

			err := extractTarGzWithOptions(bytes.NewReader(tarData), dst, testExtractOptions())

			if tt.wantErr {
				if err == nil {
					t.Fatal("extractTarGzWithOptions() expected error but got nil")
				}
				if tt.wantErrType != nil && !errors.Is(err, tt.wantErrType) {
					t.Errorf("extractTarGzWithOptions() error = %v, wantErrType %v", err, tt.wantErrType)
				}
				return
			}

			if err != nil {
				t.Fatalf("extractTarGzWithOptions() unexpected error = %v", err)
			}

			for path, wantContent := range tt.wantFiles {
				fullPath := filepath.Join(dst, path)
				got, readErr := os.ReadFile(fullPath)
				if readErr != nil {
					t.Errorf("failed to read %s: %v", path, readErr)
					continue
				}
				if string(got) != wantContent {
					t.Errorf("file %s content = %q, want %q", path, got, wantContent)
				}
			}
		})
	}
}

func TestExtractTarGz_ReplacesWrongTypePaths(t *testing.T) {
	t.Parallel()

	t.Run("file target currently directory", func(t *testing.T) {
		t.Parallel()
		dst := t.TempDir()
		conflictPath := filepath.Join(dst, "infra", "tempo.yaml")
		if err := os.MkdirAll(conflictPath, 0o755); err != nil {
			t.Fatalf("create conflicting directory: %v", err)
		}

		tarData := createTestTarGz(t, map[string]string{
			"infra/tempo.yaml": "tempo: {}",
		})

		if err := extractTarGzWithOptions(bytes.NewReader(tarData), dst, testExtractOptions()); err != nil {
			t.Fatalf("extractTarGzWithOptions() error = %v", err)
		}

		verifyFileContent(t, conflictPath, "tempo: {}")
	})

	t.Run("directory target currently file", func(t *testing.T) {
		t.Parallel()
		dst := t.TempDir()
		conflictPath := filepath.Join(dst, "testdata", "subdir")
		if err := os.MkdirAll(filepath.Dir(conflictPath), 0o755); err != nil {
			t.Fatalf("create parent directory: %v", err)
		}
		if err := os.WriteFile(conflictPath, []byte("not a directory"), 0o644); err != nil {
			t.Fatalf("create conflicting file: %v", err)
		}

		tarData := createTestTarGzRaw(t, []tarEntry{
			{name: "testdata/subdir/", isDir: true},
			{name: "testdata/subdir/file.txt", content: "ok", isDir: false},
		})

		if err := extractTarGzWithOptions(bytes.NewReader(tarData), dst, testExtractOptions()); err != nil {
			t.Fatalf("extractTarGzWithOptions() error = %v", err)
		}

		verifyFileContent(t, filepath.Join(conflictPath, "file.txt"), "ok")
	})
}

func testExtractOptions() extractTarGzOptions {
	return extractTarGzOptions{
		MaxFileSize:      maxFileSize,
		PreserveFileMode: false,
	}
}

func TestExtractTarGz_PreservesFileModeWhenEnabled(t *testing.T) {
	t.Parallel()
	if runtime.GOOS == osutil.OSWindows {
		t.Skip("Windows does not preserve POSIX executable bits")
	}

	dst := t.TempDir()
	tarData := createTestTarGzRaw(t, []tarEntry{
		{name: "bin/app-manager", content: "binary", mode: 0o755},
	})

	err := extractTarGzWithOptions(bytes.NewReader(tarData), dst, extractTarGzOptions{PreserveFileMode: true})
	if err != nil {
		t.Fatalf("extractTarGzWithOptions() error = %v", err)
	}

	info, err := os.Stat(filepath.Join(dst, "bin", "app-manager"))
	if err != nil {
		t.Fatalf("stat extracted file: %v", err)
	}
	if info.Mode()&0o111 == 0 {
		t.Fatalf("extracted file mode = %v, want executable bit", info.Mode().Perm())
	}
}

func TestExtractRegularFile_NegativeSize(t *testing.T) {
	t.Parallel()

	target := filepath.Join(t.TempDir(), "bad.txt")
	err := extractRegularFile(tar.NewReader(bytes.NewReader(nil)), &tar.Header{
		Name: "bad.txt",
		Size: -1,
	}, target)
	if err == nil {
		t.Fatal("extractRegularFile() expected error for negative file size")
	}
	if !errors.Is(err, errInvalidArchiveFileSize) {
		t.Fatalf("extractRegularFile() error = %v, want errInvalidArchiveFileSize", err)
	}
	if _, statErr := os.Stat(target); !os.IsNotExist(statErr) {
		t.Fatalf("target file should not be created, stat err = %v", statErr)
	}
}

func verifyFileContent(t *testing.T, path, want string) {
	t.Helper()
	got, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("failed to read %s: %v", path, err)
	}
	if string(got) != want {
		t.Errorf("%s content = %q, want %q", path, got, want)
	}
}

type tarEntry struct {
	name    string
	content string
	mode    int64
	isDir   bool
}

func createTestTarGz(t *testing.T, files map[string]string) []byte {
	t.Helper()

	entries := make([]tarEntry, 0, len(files))
	for name, content := range files {
		entries = append(entries, tarEntry{name: name, content: content, isDir: false})
	}
	return createTestTarGzRaw(t, entries)
}

func createTestTarGzRaw(t *testing.T, entries []tarEntry) []byte {
	t.Helper()

	var buf bytes.Buffer
	gzw := gzip.NewWriter(&buf)
	tw := tar.NewWriter(gzw)

	for _, entry := range entries {
		var header *tar.Header
		if entry.isDir {
			mode := entry.mode
			if mode == 0 {
				mode = 0o755
			}
			header = &tar.Header{
				Name:     entry.name,
				Mode:     mode,
				Typeflag: tar.TypeDir,
			}
		} else {
			mode := entry.mode
			if mode == 0 {
				mode = 0o644
			}
			header = &tar.Header{
				Name:     entry.name,
				Mode:     mode,
				Size:     int64(len(entry.content)),
				Typeflag: tar.TypeReg,
			}
		}

		if err := tw.WriteHeader(header); err != nil {
			t.Fatalf("write tar header: %v", err)
		}

		if !entry.isDir && entry.content != "" {
			if _, err := tw.Write([]byte(entry.content)); err != nil {
				t.Fatalf("write tar content: %v", err)
			}
		}
	}

	if err := tw.Close(); err != nil {
		t.Fatalf("close tar writer: %v", err)
	}
	if err := gzw.Close(); err != nil {
		t.Fatalf("close gzip writer: %v", err)
	}

	return buf.Bytes()
}
