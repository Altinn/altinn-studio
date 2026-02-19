// Package context provides repository context detection for CLI commands.
package context

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

const (
	// MaxWalkDepth is the maximum number of directories to walk up.
	MaxWalkDepth = 20

	// appPrimarySignal is the primary file that indicates an Altinn app repository.
	appPrimarySignal = "App/config/applicationmetadata.json"

	// studioRemoteSlug identifies the canonical Altinn Studio git remote.
	studioRemoteSlug = "altinn/altinn-studio"
)

// ErrAppNotFound is returned when no Altinn app repository is found.
var ErrAppNotFound = errors.New("no Altinn app found")

// AppDetectionMethod indicates how an app repository was detected.
type AppDetectionMethod int

const (
	// AppDetectedByMetadata means the app was found via applicationmetadata.json.
	AppDetectedByMetadata AppDetectionMethod = iota

	// AppDetectedByCsproj means the app was found via csproj with Altinn.App references.
	AppDetectedByCsproj

	// AppDetectedByOverride means the path was explicitly specified.
	AppDetectedByOverride
)

func (m AppDetectionMethod) String() string {
	switch m {
	case AppDetectedByMetadata:
		return "applicationmetadata.json"
	case AppDetectedByCsproj:
		return "csproj with Altinn.App references"
	case AppDetectedByOverride:
		return "explicit path"
	default:
		return "unknown"
	}
}

// Detection describes the repository context for a given starting directory.
type Detection struct {
	AppRoot         string
	StudioRoot      string
	AppDetectedFrom AppDetectionMethod
	InAppRepo       bool
	InStudioRepo    bool
}

// DetectFromCwd detects repository context from the current working directory.
func DetectFromCwd(ctx context.Context, pathOverride string) (Detection, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return Detection{}, fmt.Errorf("getting current directory: %w", err)
	}
	return Detect(ctx, cwd, pathOverride)
}

// Detect detects repository context from a start directory.
// If pathOverride is set, detection starts from that path.
func Detect(ctx context.Context, startDir, pathOverride string) (Detection, error) {
	searchStart := startDir
	explicitAppPath := pathOverride != ""
	if explicitAppPath {
		searchStart = pathOverride
	}

	absStart, err := filepath.Abs(searchStart)
	if err != nil {
		return Detection{}, fmt.Errorf("getting absolute path: %w", err)
	}

	result := walkUp(ctx, absStart)
	if explicitAppPath && result.InAppRepo {
		result.AppDetectedFrom = AppDetectedByOverride
	}

	return result, nil
}

func walkUp(ctx context.Context, startDir string) Detection {
	current := startDir
	var result Detection

	for range MaxWalkDepth {
		if !result.InAppRepo {
			if method, found := detectAppInDir(current); found {
				result.InAppRepo = true
				result.AppRoot = current
				result.AppDetectedFrom = method
			}
		}

		if !result.InStudioRepo && isStudioRepoRoot(ctx, current) {
			result.InStudioRepo = true
			result.StudioRoot = current
		}

		if result.InAppRepo && result.InStudioRepo {
			return result
		}

		parent := filepath.Dir(current)
		if parent == current {
			return result
		}
		current = parent
	}

	return result
}

func detectAppInDir(dir string) (AppDetectionMethod, bool) {
	metadataPath := filepath.Join(dir, appPrimarySignal)
	if fileExists(metadataPath) {
		return AppDetectedByMetadata, true
	}

	if hasAltinnCsproj(dir) {
		return AppDetectedByCsproj, true
	}

	return 0, false
}

func hasAltinnCsproj(dir string) bool {
	appDir := filepath.Join(dir, "App")
	if !dirExists(appDir) {
		return false
	}

	entries, err := os.ReadDir(appDir)
	if err != nil {
		return false
	}

	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".csproj") {
			continue
		}

		csprojPath := filepath.Join(appDir, entry.Name())
		if csprojHasAltinnRef(csprojPath) {
			return true
		}
	}

	return false
}

func csprojHasAltinnRef(path string) bool {
	//nolint:gosec // G304: path is constructed from validated directory traversal, not user input
	content, err := os.ReadFile(path)
	if err != nil {
		return false
	}
	return bytes.Contains(content, []byte("Altinn.App"))
}

func isStudioRepoRoot(ctx context.Context, dir string) bool {
	if _, err := os.Stat(filepath.Join(dir, ".git")); err != nil {
		return false
	}

	cmd := exec.CommandContext(ctx, "git", "-C", dir, "remote", "-v")
	out, err := cmd.Output()
	if err != nil {
		return false
	}

	return strings.Contains(strings.ToLower(string(out)), studioRemoteSlug)
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return !info.IsDir()
}

func dirExists(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return info.IsDir()
}
