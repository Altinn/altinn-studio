package install

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

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
	content, err := os.ReadFile(src) //nolint:gosec // G304: src is a fixed dev tool path.
	if err != nil {
		return "", fmt.Errorf("read install script %s: %w", src, err)
	}
	info, err := os.Stat(src)
	if err != nil {
		return "", fmt.Errorf("stat install script %s: %w", src, err)
	}

	stamped := strings.Replace(string(content), "__STUDIOCTL_DEFAULT_VERSION__", releaseTag, 1)
	if err := writeFileWithMode(dst, stamped, info.Mode().Perm()); err != nil {
		return "", fmt.Errorf("write install script %s: %w", filepath.Base(dst), err)
	}
	return dst, nil
}
