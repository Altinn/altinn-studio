package tools

import (
	"bufio"
	"context"
	"crypto/sha256"
	_ "embed"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"altinn.studio/runtime-fixture/pkg/cache"
	"altinn.studio/runtime-fixture/pkg/flux"
	"altinn.studio/runtime-fixture/pkg/kindcli"
	"altinn.studio/runtime-fixture/pkg/kubernetes"
)

//go:embed .tool-versions
var toolVersionsContent string

// ToolInfo contains version and checksum information for a tool
type ToolInfo struct {
	Version     string
	ChecksumURL string
	Path        string
}

// Installer manages tool installation
type Installer struct {
	installDir string
	tools      map[string]*ToolInfo
	verbose    bool
	parallel   bool
}

// NewInstaller creates a new installer for the given directory
func NewInstaller(cachePath string, verbose bool, parallel bool) (*Installer, error) {
	err := cache.EnsureCache(cachePath)
	if err != nil {
		return nil, err
	}

	// Parse embedded tool versions
	tools, err := parseToolVersions(toolVersionsContent)
	if err != nil {
		return nil, fmt.Errorf("failed to parse tool versions: %w", err)
	}

	installDir := filepath.Join(cachePath, cache.BinSubdir)
	for toolName, tool := range tools {
		tool.Path = filepath.Join(installDir, toolName)
	}

	return &Installer{
		installDir: installDir,
		tools:      tools,
		verbose:    verbose,
		parallel:   parallel,
	}, nil
}

func (i *Installer) GetToolInfo(name string) (*ToolInfo, error) {
	tool, ok := i.tools[name]
	if !ok {
		return nil, fmt.Errorf("tool not found: %s", name)
	}

	return tool, nil
}

func (i *Installer) GetFluxClient() (*flux.FluxClient, error) {
	tool, ok := i.tools["flux"]
	if !ok {
		return nil, fmt.Errorf("flux not found")
	}

	return flux.New(tool.Path)
}

func (i *Installer) GetKubernetesClient() (*kubernetes.KubernetesClient, error) {
	tool, ok := i.tools["kubectl"]
	if !ok {
		return nil, fmt.Errorf("kubectl not found")
	}

	return kubernetes.New(tool.Path)
}

func (i *Installer) GetKindClient() (*kindcli.KindClient, error) {
	tool, ok := i.tools["kind"]
	if !ok {
		return nil, fmt.Errorf("kind not found")
	}

	return kindcli.New(tool.Path)
}

// Install installs the specified tools (comma-separated) or all tools if tools is empty
// Returns the number of tools that were installed (0 if all were already up to date)
func (i *Installer) Install(ctx context.Context, tools string) (int, error) {
	var toInstall []string

	if tools != "" {
		// Install specific tools (comma-separated)
		toolList := strings.Split(tools, ",")
		for _, tool := range toolList {
			tool = strings.TrimSpace(tool)
			if tool == "" {
				continue
			}
			if _, ok := i.tools[tool]; !ok {
				return 0, fmt.Errorf("unknown tool: %s", tool)
			}
			toInstall = append(toInstall, tool)
		}
	} else {
		// Install all tools
		for name := range i.tools {
			toInstall = append(toInstall, name)
		}
	}

	// Install each tool
	if i.parallel {
		results := make(chan ParallelResult, len(toInstall))
		for _, name := range toInstall {
			go func(name string) {
				tool := i.tools[name]
				installed, err := i.installTool(ctx, name, tool.Version, tool.ChecksumURL)
				results <- ParallelResult{installed, err}
			}(name)
		}

		installedCount := 0
		for range len(toInstall) {
			result := <-results
			if result.err != nil {
				return installedCount, result.err
			}
			if result.installed {
				installedCount++
			}
		}

		return installedCount, nil
	} else {

		// Install each tool
		installedCount := 0
		for _, name := range toInstall {
			tool := i.tools[name]
			installed, err := i.installTool(ctx, name, tool.Version, tool.ChecksumURL)
			if err != nil {
				return installedCount, err
			}
			if installed {
				installedCount++
			}
		}

		return installedCount, nil
	}
}

type ParallelResult struct {
	installed bool
	err       error
}

func (i *Installer) installTool(ctx context.Context, name, version, checksumURL string) (bool, error) {
	if i.verbose {
		fmt.Printf("Checking %s...\n", name)
	}

	// Check if already installed with correct version
	if installed, installedVersion := i.isInstalled(name, version); installed {
		if i.verbose {
			fmt.Printf("✓ %s %s already installed\n", name, installedVersion)
		}
		return false, nil
	}

	// Install the tool
	versionStr := version
	if versionStr == "" {
		versionStr = "latest"
	}
	fmt.Printf("Installing %s %s...\n", name, versionStr)

	if err := i.install(ctx, name, version, checksumURL); err != nil {
		return false, fmt.Errorf("failed to install %s: %w", name, err)
	}

	_, installedVersion := i.isInstalled(name, version)
	fmt.Printf("✓ %s %s installed successfully\n", name, installedVersion)
	return true, nil
}

func (i *Installer) isInstalled(name, version string) (bool, string) {
	binaryPath := filepath.Join(i.installDir, name)

	// Check if binary exists
	if _, err := os.Stat(binaryPath); os.IsNotExist(err) {
		return false, ""
	}

	// Get installed version
	installedVersion := i.getVersion(name)
	if installedVersion == "" {
		return false, ""
	}

	// If no specific version required, we're good
	if version == "" {
		return true, installedVersion
	}

	// Check if versions match
	installedVersion = strings.TrimPrefix(installedVersion, "v")
	version = strings.TrimPrefix(version, "v")

	return installedVersion == version, installedVersion
}

// parseToolVersions parses the .tool-versions file content
func parseToolVersions(content string) (map[string]*ToolInfo, error) {
	tools := make(map[string]*ToolInfo)
	scanner := bufio.NewScanner(strings.NewReader(content))

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		// Skip empty lines and comments
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		// Parse "tool-name version checksum-url"
		parts := strings.Fields(line)
		if len(parts) == 3 {
			tools[parts[0]] = &ToolInfo{
				Version:     parts[1],
				ChecksumURL: parts[2],
			}
		} else {
			return nil, fmt.Errorf("invalid tool version format: '%s'", line)
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	return tools, nil
}

// downloadFile downloads a file from a URL and saves it to dest
func (i *Installer) downloadFile(url, dest string) error {
	resp, err := http.Get(url)
	if err != nil {
		return fmt.Errorf("failed to download %s: %w", url, err)
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to download %s: status %d", url, resp.StatusCode)
	}

	out, err := os.Create(dest)
	if err != nil {
		return fmt.Errorf("failed to create file %s: %w", dest, err)
	}
	defer func() {
		_ = out.Close()
	}()

	if _, err := io.Copy(out, resp.Body); err != nil {
		return fmt.Errorf("failed to write file %s: %w", dest, err)
	}

	return nil
}

// downloadBinary downloads a binary from a URL and saves it to dest
func (i *Installer) downloadBinary(url, dest, expectedSHA256 string) error {
	if err := i.downloadFile(url, dest); err != nil {
		return err
	}

	// Verify SHA256 if provided
	if expectedSHA256 != "" {
		if err := verifySHA256(dest, expectedSHA256); err != nil {
			_ = os.Remove(dest)
			return err
		}
	}

	// Make executable
	if err := os.Chmod(dest, 0755); err != nil {
		return fmt.Errorf("failed to make binary executable: %w", err)
	}

	return nil
}

// verifySHA256 verifies the SHA256 checksum of a file
func verifySHA256(path, expected string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer func() {
		_ = f.Close()
	}()

	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return err
	}

	actual := fmt.Sprintf("%x", h.Sum(nil))
	if actual != expected {
		return fmt.Errorf("sha256 mismatch: expected %s, got %s", expected, actual)
	}

	return nil
}

// copyFile copies a file from src to dst
func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer func() {
		_ = in.Close()
	}()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer func() {
		_ = out.Close()
	}()

	if _, err := io.Copy(out, in); err != nil {
		return err
	}

	return out.Close()
}

// expandURLTemplate expands {os}, {arch}, {version} placeholders in URL templates
// Also supports {version_no_v} for version without the "v" prefix
func expandURLTemplate(template, goos, goarch, version string) string {
	url := template
	url = strings.ReplaceAll(url, "{os}", goos)
	url = strings.ReplaceAll(url, "{arch}", goarch)
	url = strings.ReplaceAll(url, "{version}", version)
	url = strings.ReplaceAll(url, "{version_no_v}", strings.TrimPrefix(version, "v"))
	return url
}

// fetchChecksum fetches and parses a checksum from the given URL for the specified filename
func (i *Installer) fetchChecksum(checksumURL, filename string) (string, error) {
	if checksumURL == "" {
		return "", nil
	}

	resp, err := http.Get(checksumURL)
	if err != nil {
		return "", fmt.Errorf("failed to fetch checksum from %s: %w", checksumURL, err)
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("failed to fetch checksum: status %d", resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read checksum response: %w", err)
	}

	// Parse checksum file
	// Format can be:
	// 1. Just the checksum (kubectl style)
	// 2. "checksum  filename" (kind, helm style)
	// 3. Multiple lines with "checksum  filename" (golangci-lint style)
	content := string(data)
	lines := strings.Split(content, "\n")

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// If it's just a checksum (64 hex chars), return it
		if len(line) == 64 && isHex(line) {
			return line, nil
		}

		// Parse "checksum  filename" format
		parts := strings.Fields(line)
		if len(parts) >= 2 {
			checksum := parts[0]
			file := parts[1]

			// Match the filename
			if strings.Contains(file, filename) || filename == "" {
				return checksum, nil
			}
		}
	}

	return "", fmt.Errorf("checksum not found in response")
}

// isHex checks if a string contains only hexadecimal characters
func isHex(s string) bool {
	for _, c := range s {
		if (c < '0' || c > '9') && (c < 'a' || c > 'f') && (c < 'A' || c > 'F') {
			return false
		}
	}
	return true
}
