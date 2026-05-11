package install

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

const (
	releaseInstallScriptShell      = "cmd/studioctl/install.sh"
	releaseInstallScriptPowerShell = "cmd/studioctl/install.ps1"
)

var errUnexpectedReleaseInstallScript = errors.New("unexpected release install script")

func studioctlReleaseTag(buildVersion string) (string, error) {
	releaseTag, err := normalizeReleaseVersion(buildVersion)
	if err != nil {
		return "", fmt.Errorf("normalize release version: %w", err)
	}
	if releaseTag == "" {
		return "", fmt.Errorf("%w: release version required", errInvalidReleaseVersion)
	}
	if _, ok := parseStudioctlTagVersion(releaseTag); !ok {
		return "", fmt.Errorf("%w: expected vX.Y.Z or studioctl/vX.Y.Z", errInvalidReleaseVersion)
	}
	return releaseTag, nil
}

func copyInstallScript(src, outputDir, releaseTag string) (string, error) {
	dst := filepath.Join(outputDir, filepath.Base(src))
	content, info, err := readReleaseInstallScript(src)
	if err != nil {
		return "", err
	}

	stamped := strings.Replace(string(content), "__STUDIOCTL_DEFAULT_VERSION__", releaseTag, 1)
	if err := writeFileWithMode(dst, stamped, info.Mode().Perm()); err != nil {
		return "", fmt.Errorf("write install script %s: %w", filepath.Base(dst), err)
	}
	return dst, nil
}

func readReleaseInstallScript(src string) ([]byte, os.FileInfo, error) {
	switch filepath.ToSlash(filepath.Clean(src)) {
	case releaseInstallScriptShell:
		content, err := os.ReadFile(releaseInstallScriptShell)
		if err != nil {
			return nil, nil, fmt.Errorf("read install script %s: %w", releaseInstallScriptShell, err)
		}
		info, err := os.Stat(releaseInstallScriptShell)
		if err != nil {
			return nil, nil, fmt.Errorf("stat install script %s: %w", releaseInstallScriptShell, err)
		}
		return content, info, nil
	case releaseInstallScriptPowerShell:
		content, err := os.ReadFile(releaseInstallScriptPowerShell)
		if err != nil {
			return nil, nil, fmt.Errorf("read install script %s: %w", releaseInstallScriptPowerShell, err)
		}
		info, err := os.Stat(releaseInstallScriptPowerShell)
		if err != nil {
			return nil, nil, fmt.Errorf("stat install script %s: %w", releaseInstallScriptPowerShell, err)
		}
		return content, info, nil
	default:
		return nil, nil, fmt.Errorf("%w: %s", errUnexpectedReleaseInstallScript, src)
	}
}
