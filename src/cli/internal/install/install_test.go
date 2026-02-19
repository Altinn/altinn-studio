//nolint:testpackage // testing unexported functions
package install

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"context"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"altinn.studio/studioctl/internal/config"
)

const releaseMarkerV1 = "release-version:studioctl/v1.0.0\n"

func TestIsInstalled(t *testing.T) {
	tests := []struct {
		setup          func(t *testing.T, dataDir string)
		name           string
		currentVersion string
		want           bool
	}{
		{
			name:           "not installed - no testdata dir",
			currentVersion: "v1.0.0",
			want:           false,
			setup:          setupNoInstall,
		},
		{
			name:           "not installed - empty testdata dir",
			currentVersion: "v1.0.0",
			want:           false,
			setup:          setupEmptyTestdataDir,
		},
		{
			name:           "not installed - no version file",
			currentVersion: "v1.0.0",
			want:           false,
			setup:          setupTestdataNoVersion,
		},
		{
			name:           "not installed - version mismatch",
			currentVersion: "v1.0.0",
			want:           false,
			setup:          setupVersionMismatch,
		},
		{
			name:           "installed - version matches",
			currentVersion: "v1.0.0",
			want:           true,
			setup:          setupInstalledVersionMatch,
		},
		{
			name:           "installed - version with whitespace matches",
			currentVersion: "v1.0.0",
			want:           true,
			setup:          setupInstalledVersionWhitespaceMatch,
		},
		{
			name:           "installed - tarball marker remains valid without tarball env override",
			currentVersion: "v1.0.0",
			want:           true,
			setup:          setupInstalledFromTarballMarker,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dataDir := t.TempDir()
			tt.setup(t, dataDir)

			got := IsInstalled(dataDir, tt.currentVersion)
			if got != tt.want {
				t.Errorf("IsInstalled() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestCheckInstallStatus(t *testing.T) {
	tests := []struct {
		setup          func(t *testing.T, dataDir string)
		name           string
		currentVersion string
		wantState      State
	}{
		{
			name:           "not installed",
			currentVersion: "v1.0.0",
			wantState:      StateNotInstalled,
			setup:          setupNoInstall,
		},
		{
			name:           "partial install - missing metadata",
			currentVersion: "v1.0.0",
			wantState:      StatePartial,
			setup:          setupTestdataNoVersion,
		},
		{
			name:           "version mismatch",
			currentVersion: "v1.0.0",
			wantState:      StateVersionMismatch,
			setup:          setupVersionMismatch,
		},
		{
			name:           "source marker mismatch",
			currentVersion: "v1.0.0",
			wantState:      StateSourceMarkerMismatch,
			setup:          setupMarkerMismatch,
		},
		{
			name:           "installed",
			currentVersion: "v1.0.0",
			wantState:      StateInstalled,
			setup:          setupInstalledVersionMatch,
		},
		{
			name:           "installed from tarball marker without env override",
			currentVersion: "v1.0.0",
			wantState:      StateInstalled,
			setup:          setupInstalledFromTarballMarker,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dataDir := t.TempDir()
			tt.setup(t, dataDir)

			status := CheckInstallStatus(dataDir, tt.currentVersion)
			if status.State != tt.wantState {
				t.Fatalf("CheckInstallStatus() state = %v, want %v", status.State, tt.wantState)
			}
		})
	}
}

func setupNoInstall(_ *testing.T, _ string) {}

func setupEmptyTestdataDir(t *testing.T, dataDir string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Join(dataDir, testdataDir), 0o755); err != nil {
		t.Fatal(err)
	}
}

func setupTestdataNoVersion(t *testing.T, dataDir string) {
	t.Helper()
	writeTestdataFile(t, dataDir, "dummy.txt", "test")
}

func setupVersionMismatch(t *testing.T, dataDir string) {
	t.Helper()
	writeTestdataFile(t, dataDir, "dummy.txt", "test")
	writeInstallMetadata(t, dataDir, "v0.9.0\n", releaseMarkerV1)
}

func setupInstalledVersionMatch(t *testing.T, dataDir string) {
	t.Helper()
	writeTestdataFile(t, dataDir, "dummy.txt", "test")
	writeInstallMetadata(t, dataDir, "v1.0.0\n", releaseMarkerV1)
}

func setupInstalledVersionWhitespaceMatch(t *testing.T, dataDir string) {
	t.Helper()
	writeTestdataFile(t, dataDir, "file.json", "{}")
	writeInstallMetadata(t, dataDir, "  v1.0.0  \n", releaseMarkerV1)
}

func setupMarkerMismatch(t *testing.T, dataDir string) {
	t.Helper()
	writeTestdataFile(t, dataDir, "dummy.txt", "test")
	writeInstallMetadata(t, dataDir, "v1.0.0\n", "release-version:studioctl/v0.9.0\n")
}

func setupInstalledFromTarballMarker(t *testing.T, dataDir string) {
	t.Helper()
	writeTestdataFile(t, dataDir, "dummy.txt", "test")
	writeInstallMetadata(t, dataDir, "v1.0.0\n", "tarball-sha256:abc123\n")
}

func writeTestdataFile(t *testing.T, dataDir, name, contents string) {
	t.Helper()
	testdataPath := filepath.Join(dataDir, testdataDir)
	if err := os.MkdirAll(testdataPath, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(testdataPath, name), []byte(contents), 0o644); err != nil {
		t.Fatal(err)
	}
}

func writeInstallMetadata(t *testing.T, dataDir, version, sourceMarker string) {
	t.Helper()
	if err := os.WriteFile(filepath.Join(dataDir, versionFile), []byte(version), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dataDir, sourceMarkerFile), []byte(sourceMarker), 0o644); err != nil {
		t.Fatal(err)
	}
}

func TestValidateTarballPath(t *testing.T) {
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
			wantErr: ErrInvalidTarballPath,
			setup: func(t *testing.T) string {
				t.Helper()
				return ""
			},
		},
		{
			name:    "whitespace only path",
			wantErr: ErrInvalidTarballPath,
			setup: func(t *testing.T) string {
				t.Helper()
				return "   "
			},
		},
		{
			name:    "non-existent file",
			wantErr: ErrTarballNotFound,
			setup: func(t *testing.T) string {
				t.Helper()
				return filepath.Join(t.TempDir(), "nonexistent.tar.gz")
			},
		},
		{
			name:    "symlink rejected",
			wantErr: ErrInvalidTarballPath,
			setup: func(t *testing.T) string {
				t.Helper()
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
			wantErr: ErrInvalidTarballPath,
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
				// Change to the directory and return relative path
				t.Chdir(dir)
				return "test.tar.gz"
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			path := tt.setup(t)

			result, err := validateTarballPath(path)

			if tt.wantErr != nil {
				if !errors.Is(err, tt.wantErr) {
					t.Errorf("validateTarballPath() error = %v, wantErr %v", err, tt.wantErr)
				}
				return
			}

			if err != nil {
				t.Errorf("validateTarballPath() unexpected error = %v", err)
				return
			}

			if !tt.wantValid {
				t.Error("validateTarballPath() expected error but got nil")
				return
			}

			// Result should be absolute
			if !filepath.IsAbs(result) {
				t.Errorf("validateTarballPath() result not absolute: %s", result)
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
				// ../outside.txt should be skipped
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
				// /etc/passwd should be skipped
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
			wantErrType: ErrFileTooLarge,
			createTar: func(t *testing.T) []byte {
				t.Helper()
				// Create content larger than maxFileSize (10MB)
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

			err := extractTarGz(bytes.NewReader(tarData), dst)

			if tt.wantErr {
				if err == nil {
					t.Fatal("extractTarGz() expected error but got nil")
				}
				if tt.wantErrType != nil && !errors.Is(err, tt.wantErrType) {
					t.Errorf("extractTarGz() error = %v, wantErrType %v", err, tt.wantErrType)
				}
				return
			}

			if err != nil {
				t.Fatalf("extractTarGz() unexpected error = %v", err)
			}

			// Verify expected files
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

		if err := extractTarGz(bytes.NewReader(tarData), dst); err != nil {
			t.Fatalf("extractTarGz() error = %v", err)
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

		if err := extractTarGz(bytes.NewReader(tarData), dst); err != nil {
			t.Fatalf("extractTarGz() error = %v", err)
		}

		verifyFileContent(t, filepath.Join(conflictPath, "file.txt"), "ok")
	})
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
	if !errors.Is(err, ErrInvalidArchiveFileSize) {
		t.Fatalf("extractRegularFile() error = %v, want ErrInvalidArchiveFileSize", err)
	}
	if _, statErr := os.Stat(target); !os.IsNotExist(statErr) {
		t.Fatalf("target file should not be created, stat err = %v", statErr)
	}
}

func TestInstall(t *testing.T) {
	t.Run("already installed - skip", testInstallAlreadyInstalled)
	t.Run("force reinstall", testInstallForceReinstall)
	t.Run("missing data dir", testInstallMissingDataDir)
	t.Run("release mode without version", testInstallReleaseModeNoVersion)
	t.Run("release mode with dev version", testInstallReleaseModeDevVersion)
	t.Run("local tarball install", testInstallLocalTarball)
	t.Run("local tarball unchanged - skip", testInstallLocalTarballUnchangedSkip)
	t.Run("local tarball changed - reinstall", testInstallLocalTarballChangedReinstall)
	t.Run("tarball not found", testInstallTarballNotFound)
}

func testInstallAlreadyInstalled(t *testing.T) {
	dataDir := t.TempDir()
	setupExistingInstall(t, dataDir, "v1.0.0")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err := Install(ctx, Options{DataDir: dataDir, Version: "v1.0.0", Force: false})
	if !errors.Is(err, ErrAlreadyInstalled) {
		t.Errorf("Install() error = %v, want %v", err, ErrAlreadyInstalled)
	}
}

func testInstallForceReinstall(t *testing.T) {
	dataDir := t.TempDir()

	// Set up tarball env var
	tarball := createTestTarballFile(t, map[string]string{"testdata/new.txt": "new content"})
	t.Setenv(config.EnvResourcesTarball, tarball)

	// Create existing install
	setupExistingInstall(t, dataDir, "v1.0.0")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err := Install(ctx, Options{DataDir: dataDir, Version: "v1.0.0", Force: true})
	if err != nil {
		t.Fatalf("Install() error = %v", err)
	}

	// New file should exist
	verifyFileExists(t, filepath.Join(dataDir, "testdata/new.txt"))
}

func testInstallMissingDataDir(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err := Install(ctx, Options{DataDir: "", Version: "v1.0.0"})
	if !errors.Is(err, ErrDataDirRequired) {
		t.Errorf("Install() error = %v, want %v", err, ErrDataDirRequired)
	}
}

func testInstallReleaseModeNoVersion(t *testing.T) {
	dataDir := t.TempDir()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err := Install(ctx, Options{DataDir: dataDir, Version: ""})
	if !errors.Is(err, ErrVersionRequired) {
		t.Errorf("Install() error = %v, want %v", err, ErrVersionRequired)
	}
}

func testInstallReleaseModeDevVersion(t *testing.T) {
	dataDir := t.TempDir()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err := Install(ctx, Options{DataDir: dataDir, Version: "dev"})
	if !errors.Is(err, ErrVersionRequired) {
		t.Errorf("Install() error = %v, want %v", err, ErrVersionRequired)
	}
}

func testInstallLocalTarball(t *testing.T) {
	dataDir := t.TempDir()

	tarball := createTestTarballFile(t, map[string]string{
		"testdata/config.json": `{"setting": true}`,
		"infra/otel.yaml":      "receivers: []",
	})
	t.Setenv(config.EnvResourcesTarball, tarball)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err := Install(ctx, Options{DataDir: dataDir, Version: "v1.0.0", Force: false})
	if err != nil {
		t.Fatalf("Install() error = %v", err)
	}

	// Verify files extracted
	verifyFileContent(t, filepath.Join(dataDir, "testdata/config.json"), `{"setting": true}`)

	// Verify AltinnPlatformLocal directory created
	verifyFileExists(t, filepath.Join(dataDir, "AltinnPlatformLocal"))

	// Verify version file
	verifyFileContent(t, filepath.Join(dataDir, versionFile), "v1.0.0\n")

	// Verify source marker file
	verifyFileExists(t, filepath.Join(dataDir, sourceMarkerFile))
}

func testInstallLocalTarballUnchangedSkip(t *testing.T) {
	dataDir := t.TempDir()

	tarball := createTestTarballFile(t, map[string]string{
		"testdata/config.json": `{"setting": true}`,
	})
	t.Setenv(config.EnvResourcesTarball, tarball)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := Install(ctx, Options{DataDir: dataDir, Version: "v1.0.0", Force: false}); err != nil {
		t.Fatalf("initial Install() error = %v", err)
	}

	err := Install(ctx, Options{DataDir: dataDir, Version: "v1.0.0", Force: false})
	if !errors.Is(err, ErrAlreadyInstalled) {
		t.Errorf("Install() error = %v, want %v", err, ErrAlreadyInstalled)
	}
}

func testInstallLocalTarballChangedReinstall(t *testing.T) {
	dataDir := t.TempDir()

	tarballV1 := createTestTarballFile(t, map[string]string{
		"testdata/config.json": `{"setting": true}`,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	t.Setenv(config.EnvResourcesTarball, tarballV1)
	if err := Install(ctx, Options{DataDir: dataDir, Version: "v1.0.0", Force: false}); err != nil {
		t.Fatalf("initial Install() error = %v", err)
	}

	tarballV2 := createTestTarballFile(t, map[string]string{
		"testdata/config.json": `{"setting": false}`,
	})
	t.Setenv(config.EnvResourcesTarball, tarballV2)

	if err := Install(ctx, Options{DataDir: dataDir, Version: "v1.0.0", Force: false}); err != nil {
		t.Fatalf("Install() with changed tarball error = %v", err)
	}

	verifyFileContent(t, filepath.Join(dataDir, "testdata/config.json"), `{"setting": false}`)
}

func testInstallTarballNotFound(t *testing.T) {
	dataDir := t.TempDir()
	t.Setenv(config.EnvResourcesTarball, "/nonexistent/path.tar.gz")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err := Install(ctx, Options{DataDir: dataDir, Version: "v1.0.0"})
	if !errors.Is(err, ErrTarballNotFound) {
		t.Errorf("Install() error = %v, want %v", err, ErrTarballNotFound)
	}
}

// Test helper functions for Install tests.

func setupExistingInstall(t *testing.T, dataDir, version string) {
	t.Helper()
	testdataPath := filepath.Join(dataDir, testdataDir)
	if err := os.MkdirAll(testdataPath, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(testdataPath, "file.txt"), []byte("existing"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dataDir, versionFile), []byte(version+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	sourceMarker := "release-version:" + normalizeVersionForURL(version) + "\n"
	if err := os.WriteFile(filepath.Join(dataDir, sourceMarkerFile), []byte(sourceMarker), 0o644); err != nil {
		t.Fatal(err)
	}
}

func verifyFileExists(t *testing.T, path string) {
	t.Helper()
	if _, err := os.Stat(path); err != nil {
		t.Errorf("expected %s to exist: %v", path, err)
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

// Helper types and functions

type tarEntry struct {
	name    string
	content string
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
			header = &tar.Header{
				Name:     entry.name,
				Mode:     0o755,
				Typeflag: tar.TypeDir,
			}
		} else {
			header = &tar.Header{
				Name:     entry.name,
				Mode:     0o644,
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

func createTestTarballFile(t *testing.T, files map[string]string) string {
	t.Helper()

	dir := t.TempDir()
	path := filepath.Join(dir, "test.tar.gz")

	data := createTestTarGz(t, files)
	if err := os.WriteFile(path, data, 0o644); err != nil {
		t.Fatalf("write tarball file: %v", err)
	}

	return path
}
