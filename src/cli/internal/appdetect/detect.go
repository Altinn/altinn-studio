// Package appdetect provides Altinn app detection functionality.
// It walks up from the current directory to find an Altinn app root.
package appdetect

import (
	"bufio"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

const (
	// MaxWalkDepth is the maximum number of directories to walk up.
	MaxWalkDepth = 20

	// PrimarySignal is the primary file that indicates an Altinn app.
	PrimarySignal = "App/config/applicationmetadata.json"
)

// ErrNotFound is returned when no Altinn app is found.
var ErrNotFound = errors.New("no Altinn app found")

// Result contains the detected app information.
type Result struct {
	// Path is the absolute path to the app root directory.
	Path string

	// DetectedFrom indicates how the app was detected.
	DetectedFrom DetectionMethod
}

// DetectionMethod indicates how an app was detected.
type DetectionMethod int

const (
	// DetectedByMetadata means the app was found via applicationmetadata.json.
	DetectedByMetadata DetectionMethod = iota

	// DetectedByCsproj means the app was found via csproj with Altinn.App references.
	DetectedByCsproj

	// DetectedByOverride means the path was explicitly specified.
	DetectedByOverride
)

func (m DetectionMethod) String() string {
	switch m {
	case DetectedByMetadata:
		return "applicationmetadata.json"
	case DetectedByCsproj:
		return "csproj with Altinn.App references"
	case DetectedByOverride:
		return "explicit path"
	default:
		return "unknown"
	}
}

// Detector finds Altinn apps in the filesystem.
type Detector struct {
	// maxDepth limits directory traversal (for testing).
	maxDepth int
}

// NewDetector creates a new app detector.
func NewDetector() *Detector {
	return &Detector{maxDepth: MaxWalkDepth}
}

// Detect finds an Altinn app starting from the given directory.
// If pathOverride is non-empty, it's used directly without walking.
// Returns the app root path and detection method.
func (d *Detector) Detect(startDir, pathOverride string) (Result, error) {
	if pathOverride != "" {
		absPath, err := filepath.Abs(pathOverride)
		if err != nil {
			return Result{}, fmt.Errorf("getting absolute path: %w", err)
		}
		if !d.isAppRoot(absPath) {
			return Result{}, ErrNotFound
		}
		return Result{Path: absPath, DetectedFrom: DetectedByOverride}, nil
	}

	absStart, err := filepath.Abs(startDir)
	if err != nil {
		return Result{}, fmt.Errorf("getting absolute path: %w", err)
	}

	return d.walkUp(absStart)
}

// DetectFromCwd finds an Altinn app starting from the current working directory.
func (d *Detector) DetectFromCwd(pathOverride string) (Result, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return Result{}, fmt.Errorf("getting current directory: %w", err)
	}
	return d.Detect(cwd, pathOverride)
}

// walkUp walks up the directory tree looking for an app root.
func (d *Detector) walkUp(startDir string) (Result, error) {
	current := startDir

	for range d.maxDepth {
		if result, found := d.checkDirectory(current); found {
			return result, nil
		}

		parent := filepath.Dir(current)
		if parent == current {
			break // reached root
		}
		current = parent
	}

	return Result{}, ErrNotFound
}

// checkDirectory checks if the given directory is an app root.
func (d *Detector) checkDirectory(dir string) (Result, bool) {
	// Primary signal: applicationmetadata.json
	metadataPath := filepath.Join(dir, PrimarySignal)
	if fileExists(metadataPath) {
		return Result{Path: dir, DetectedFrom: DetectedByMetadata}, true
	}

	// Fallback: csproj with Altinn.App references
	if d.hasAltinnCsproj(dir) {
		return Result{Path: dir, DetectedFrom: DetectedByCsproj}, true
	}

	return Result{Path: "", DetectedFrom: 0}, false
}

// isAppRoot checks if a directory is an Altinn app root.
func (d *Detector) isAppRoot(dir string) bool {
	_, found := d.checkDirectory(dir)
	return found
}

// hasAltinnCsproj checks if any csproj in the directory references Altinn.App packages.
func (d *Detector) hasAltinnCsproj(dir string) bool {
	appDir := filepath.Join(dir, "App")
	if !dirExists(appDir) {
		return false
	}

	entries, err := os.ReadDir(appDir)
	if err != nil {
		return false
	}

	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".csproj") {
			csprojPath := filepath.Join(appDir, entry.Name())
			if d.csprojHasAltinnRef(csprojPath) {
				return true
			}
		}
	}

	return false
}

// csprojHasAltinnRef checks if a csproj file references Altinn.App packages.
func (d *Detector) csprojHasAltinnRef(path string) bool {
	//nolint:gosec // G304: path is constructed from validated directory traversal, not user input
	file, err := os.Open(path)
	if err != nil {
		return false
	}
	defer func() {
		//nolint:errcheck,gosec // read-only file, close error non-actionable, no logger available
		file.Close()
	}()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		// Match both PackageReference and ProjectReference to Altinn.App
		if strings.Contains(line, "Altinn.App") {
			return true
		}
	}

	return false
}

// fileExists checks if a file exists and is not a directory.
func fileExists(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return !info.IsDir()
}

// dirExists checks if a directory exists.
func dirExists(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return info.IsDir()
}
