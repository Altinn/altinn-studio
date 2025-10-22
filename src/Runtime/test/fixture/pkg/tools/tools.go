package tools

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

// URL templates for downloading binaries
// Note: version parameter includes "v" prefix (e.g., "v0.29.0")
var (
	kindURLTemplate    = "https://kind.sigs.k8s.io/dl/%s/kind-%s-%s"
	helmURLTemplate    = "https://get.helm.sh/helm-%s-%s-%s.tar.gz"
	kubectlURLTemplate = "https://dl.k8s.io/release/%s/bin/%s/%s/kubectl"
	fluxURLTemplate    = "https://github.com/fluxcd/flux2/releases/download/%s/flux_%s_%s_%s.tar.gz"
)

// install dispatches to the appropriate installer based on tool name
func (i *Installer) install(ctx context.Context, name, version, checksumURL string) error {
	switch name {
	case "golangci-lint":
		return i.installGolangCILint(ctx, version, checksumURL)
	case "kind":
		return i.installKind(ctx, version, checksumURL)
	case "helm":
		return i.installHelm(ctx, version, checksumURL)
	case "kubectl":
		return i.installKubectl(ctx, version, checksumURL)
	case "flux":
		return i.installFlux(ctx, version, checksumURL)
	default:
		return fmt.Errorf("unknown tool: %s", name)
	}
}

// getVersion returns the installed version of a tool
func (i *Installer) getVersion(name string) string {
	binaryPath := filepath.Join(i.installDir, name)

	var cmd *exec.Cmd
	switch name {
	case "golangci-lint":
		cmd = exec.Command(binaryPath, "version")
	case "kind":
		cmd = exec.Command(binaryPath, "version")
	case "helm":
		cmd = exec.Command(binaryPath, "version", "--short")
	case "kubectl":
		cmd = exec.Command(binaryPath, "version", "--client")
	case "flux":
		cmd = exec.Command(binaryPath, "version", "--client")
	default:
		return ""
	}

	output, err := cmd.CombinedOutput()
	if err != nil {
		return ""
	}

	return parseVersion(name, string(output))
}

// parseVersion extracts version from tool output
func parseVersion(name, output string) string {
	switch name {
	case "golangci-lint":
		// "golangci-lint has version 2.5.0 built with go1.25.1 from ..."
		parts := strings.Fields(output)
		if len(parts) >= 4 {
			return parts[3]
		}

	case "kind":
		// "kind v0.29.0 go1.23.4 linux/amd64"
		parts := strings.Fields(output)
		if len(parts) >= 2 {
			return strings.TrimPrefix(parts[1], "v")
		}

	case "helm":
		// "v3.19.0+g..."
		parts := strings.Fields(output)
		if len(parts) >= 1 {
			version := strings.TrimPrefix(parts[0], "v")
			// Remove +g... suffix if present
			if idx := strings.Index(version, "+"); idx != -1 {
				version = version[:idx]
			}
			return version
		}

	case "kubectl":
		// "Client Version: v1.34.1"
		parts := strings.Fields(output)
		for i, part := range parts {
			if part == "Version:" && i+1 < len(parts) {
				return strings.TrimPrefix(parts[i+1], "v")
			}
		}

	case "flux":
		// "flux: v2.7.2"
		parts := strings.Fields(output)
		if len(parts) >= 2 && parts[0] == "flux:" {
			return strings.TrimPrefix(parts[1], "v")
		}
	}

	return ""
}

// extractTarGz extracts a tar.gz archive to the specified directory
func extractTarGz(tarGzPath, destDir string) error {
	// Open the tar.gz file
	file, err := os.Open(tarGzPath)
	if err != nil {
		return fmt.Errorf("failed to open archive: %w", err)
	}
	defer func() { _ = file.Close() }()

	// Create gzip reader
	gzr, err := gzip.NewReader(file)
	if err != nil {
		return fmt.Errorf("failed to create gzip reader: %w", err)
	}
	defer func() { _ = gzr.Close() }()

	// Create tar reader
	tr := tar.NewReader(gzr)

	// Extract all files
	for {
		header, err := tr.Next()
		if err == io.EOF {
			break // End of archive
		}
		if err != nil {
			return fmt.Errorf("failed to read tar entry: %w", err)
		}

		// Construct the full path
		target := filepath.Join(destDir, header.Name)

		// Ensure the target path is within destDir (security check)
		if !strings.HasPrefix(filepath.Clean(target), filepath.Clean(destDir)+string(os.PathSeparator)) &&
			filepath.Clean(target) != filepath.Clean(destDir) {
			return fmt.Errorf("illegal file path in archive: %s", header.Name)
		}

		switch header.Typeflag {
		case tar.TypeDir:
			// Create directory
			if err := os.MkdirAll(target, 0755); err != nil {
				return fmt.Errorf("failed to create directory: %w", err)
			}

		case tar.TypeReg:
			// Create parent directory if needed
			if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
				return fmt.Errorf("failed to create parent directory: %w", err)
			}

			// Create file
			outFile, err := os.OpenFile(target, os.O_CREATE|os.O_RDWR|os.O_TRUNC, os.FileMode(header.Mode))
			if err != nil {
				return fmt.Errorf("failed to create file: %w", err)
			}

			// Copy file contents
			if _, err := io.Copy(outFile, tr); err != nil {
				_ = outFile.Close()
				return fmt.Errorf("failed to write file: %w", err)
			}
			_ = outFile.Close()

		default:
			// Skip other types (symlinks, etc.)
		}
	}

	return nil
}

// installGolangCILint installs golangci-lint by downloading the official release
func (i *Installer) installGolangCILint(ctx context.Context, version, checksumURL string) error {
	// Build download URL
	// Format: https://github.com/golangci/golangci-lint/releases/download/{version}/golangci-lint-{version_no_v}-{os}-{arch}.tar.gz
	versionNoV := strings.TrimPrefix(version, "v")
	filename := fmt.Sprintf("golangci-lint-%s-%s-%s.tar.gz", versionNoV, runtime.GOOS, runtime.GOARCH)
	url := fmt.Sprintf("https://github.com/golangci/golangci-lint/releases/download/%s/%s", version, filename)

	// Fetch checksum
	checksumURLExpanded := expandURLTemplate(checksumURL, runtime.GOOS, runtime.GOARCH, version)
	expectedChecksum, err := i.fetchChecksum(checksumURLExpanded, filename)
	if err != nil {
		return fmt.Errorf("failed to fetch checksum: %w", err)
	}

	// Download tar.gz to temporary file
	tmpFile := filepath.Join(i.installDir, filename)
	defer func() {
		_ = os.Remove(tmpFile)
	}()

	if err := i.downloadBinary(url, tmpFile, expectedChecksum); err != nil {
		return err
	}

	// Extract the binary from tar.gz
	return i.extractGolangCILintBinary(tmpFile, filepath.Join(i.installDir, "golangci-lint"))
}

// extractGolangCILintBinary extracts the golangci-lint binary from a tar.gz archive
func (i *Installer) extractGolangCILintBinary(tarGzPath, destPath string) error {
	tmpDir := filepath.Dir(destPath) + "/golangci-lint-tmp"
	defer func() {
		_ = os.RemoveAll(tmpDir)
	}()

	if err := os.MkdirAll(tmpDir, 0755); err != nil {
		return err
	}

	// Extract tar.gz using Go stdlib
	if err := extractTarGz(tarGzPath, tmpDir); err != nil {
		return fmt.Errorf("failed to extract golangci-lint: %w", err)
	}

	// Find and copy binary
	// The archive contains: golangci-lint-{version}-{os}-{arch}/golangci-lint
	pattern := filepath.Join(tmpDir, "golangci-lint-*", "golangci-lint")
	matches, err := filepath.Glob(pattern)
	if err != nil || len(matches) == 0 {
		return fmt.Errorf("binary not found in archive")
	}

	if err := copyFile(matches[0], destPath); err != nil {
		return err
	}

	return os.Chmod(destPath, 0755)
}

// installKind installs kind binary
func (i *Installer) installKind(ctx context.Context, version, checksumURL string) error {
	url := fmt.Sprintf(kindURLTemplate, version, runtime.GOOS, runtime.GOARCH)
	dest := filepath.Join(i.installDir, "kind")

	// Fetch checksum
	checksumURLExpanded := expandURLTemplate(checksumURL, runtime.GOOS, runtime.GOARCH, version)
	expectedChecksum, err := i.fetchChecksum(checksumURLExpanded, "")
	if err != nil {
		return fmt.Errorf("failed to fetch checksum: %w", err)
	}

	return i.downloadBinary(url, dest, expectedChecksum)
}

// installKubectl installs kubectl binary
func (i *Installer) installKubectl(ctx context.Context, version, checksumURL string) error {
	url := fmt.Sprintf(kubectlURLTemplate, version, runtime.GOOS, runtime.GOARCH)
	dest := filepath.Join(i.installDir, "kubectl")

	// Fetch checksum
	checksumURLExpanded := expandURLTemplate(checksumURL, runtime.GOOS, runtime.GOARCH, version)
	expectedChecksum, err := i.fetchChecksum(checksumURLExpanded, "")
	if err != nil {
		return fmt.Errorf("failed to fetch checksum: %w", err)
	}

	return i.downloadBinary(url, dest, expectedChecksum)
}

// installHelm installs helm by extracting from tar.gz
func (i *Installer) installHelm(ctx context.Context, version, checksumURL string) error {
	url := fmt.Sprintf(helmURLTemplate, version, runtime.GOOS, runtime.GOARCH)
	dest := filepath.Join(i.installDir, "helm")

	// Download tar.gz to temporary file
	tmpFile := dest + ".tar.gz"
	defer func() {
		_ = os.Remove(tmpFile)
	}()

	// Fetch checksum
	filename := fmt.Sprintf("helm-%s-%s-%s.tar.gz", version, runtime.GOOS, runtime.GOARCH)
	checksumURLExpanded := expandURLTemplate(checksumURL, runtime.GOOS, runtime.GOARCH, version)
	expectedChecksum, err := i.fetchChecksum(checksumURLExpanded, filename)
	if err != nil {
		return fmt.Errorf("failed to fetch checksum: %w", err)
	}

	// Download and verify checksum
	if err := i.downloadBinary(url, tmpFile, expectedChecksum); err != nil {
		return err
	}

	// Extract helm binary from tar.gz
	return i.extractHelmBinary(tmpFile, dest)
}

// extractHelmBinary extracts the helm binary from a tar.gz archive
func (i *Installer) extractHelmBinary(tarGzPath, destPath string) error {
	tmpDir := filepath.Dir(destPath) + "/helm-tmp"
	defer func() {
		_ = os.RemoveAll(tmpDir)
	}()

	if err := os.MkdirAll(tmpDir, 0755); err != nil {
		return err
	}

	// Extract tar.gz using Go stdlib
	if err := extractTarGz(tarGzPath, tmpDir); err != nil {
		return fmt.Errorf("failed to extract helm: %w", err)
	}

	// Find and copy helm binary
	helmSrc := filepath.Join(tmpDir, fmt.Sprintf("%s-%s", runtime.GOOS, runtime.GOARCH), "helm")
	if err := copyFile(helmSrc, destPath); err != nil {
		return err
	}

	return os.Chmod(destPath, 0755)
}

// installFlux installs flux by downloading and extracting from tar.gz
func (i *Installer) installFlux(ctx context.Context, version, checksumURL string) error {
	// Build download URL
	// Format: https://github.com/fluxcd/flux2/releases/download/{version}/flux_{version_no_v}_{os}_{arch}.tar.gz
	versionNoV := strings.TrimPrefix(version, "v")
	filename := fmt.Sprintf("flux_%s_%s_%s.tar.gz", versionNoV, runtime.GOOS, runtime.GOARCH)
	url := fmt.Sprintf(fluxURLTemplate, version, versionNoV, runtime.GOOS, runtime.GOARCH)

	// Fetch checksum
	checksumURLExpanded := expandURLTemplate(checksumURL, runtime.GOOS, runtime.GOARCH, version)
	expectedChecksum, err := i.fetchChecksum(checksumURLExpanded, filename)
	if err != nil {
		return fmt.Errorf("failed to fetch checksum: %w", err)
	}

	// Download tar.gz to temporary file
	tmpFile := filepath.Join(i.installDir, filename)
	defer func() {
		_ = os.Remove(tmpFile)
	}()

	if err := i.downloadBinary(url, tmpFile, expectedChecksum); err != nil {
		return err
	}

	// Extract the binary from tar.gz
	return i.extractFluxBinary(tmpFile, filepath.Join(i.installDir, "flux"))
}

// extractFluxBinary extracts the flux binary from a tar.gz archive
func (i *Installer) extractFluxBinary(tarGzPath, destPath string) error {
	tmpDir := filepath.Dir(destPath) + "/flux-tmp"
	defer func() {
		_ = os.RemoveAll(tmpDir)
	}()

	if err := os.MkdirAll(tmpDir, 0755); err != nil {
		return err
	}

	// Extract tar.gz using Go stdlib
	if err := extractTarGz(tarGzPath, tmpDir); err != nil {
		return fmt.Errorf("failed to extract flux: %w", err)
	}

	// The flux binary is directly in the archive root
	fluxSrc := filepath.Join(tmpDir, "flux")
	if err := copyFile(fluxSrc, destPath); err != nil {
		return err
	}

	return os.Chmod(destPath, 0755)
}
