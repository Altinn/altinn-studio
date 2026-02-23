package self

import (
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

const (
	osWindows = "windows"

	executablePerm = 0o755
)

// Sentinel errors for self-install operations.
var (
	// ErrNoWritableLocation is returned when no candidate directory is writable.
	ErrNoWritableLocation = errors.New("no writable install location found")

	// ErrSkipped is returned when the user chooses to skip installation.
	ErrSkipped = errors.New("installation skipped")

	// ErrAlreadyInstalled is returned when the binary is already at the target location.
	ErrAlreadyInstalled = errors.New("binary already installed at this location")
)

// Candidate represents a potential installation directory.
type Candidate struct {
	Path        string // Absolute path to the directory
	InPath      bool   // Whether this directory is in the user's PATH
	Writable    bool   // Whether the directory is writable
	NeedsSudo   bool   // Whether writing requires elevated privileges
	Recommended bool   // Whether this is the recommended option
}

// Label returns a human-readable label for the candidate.
func (c Candidate) Label() string {
	var parts []string
	parts = append(parts, c.Path)

	if c.Recommended {
		parts = append(parts, "(recommended)")
	}
	if c.InPath && !c.Recommended {
		parts = append(parts, "(in PATH)")
	}
	if c.NeedsSudo {
		parts = append(parts, "(requires sudo)")
	}
	if !c.Writable && !c.NeedsSudo {
		parts = append(parts, "(not writable)")
	}

	return strings.Join(parts, " ")
}

// DetectCandidates returns potential installation directories for the current platform.
// Candidates are sorted by preference: recommended first, then in-PATH, then others.
func DetectCandidates(out *ui.Output) []Candidate {
	pathEnv := os.Getenv("PATH")
	pathDirs := filepath.SplitList(pathEnv)
	inPath := make(map[string]bool, len(pathDirs))
	for _, p := range pathDirs {
		cleaned := filepath.Clean(p)
		inPath[cleaned] = true
	}

	var candidates []Candidate

	switch runtime.GOOS {
	case "linux", "darwin":
		candidates = unixCandidates(inPath, out)
	case osWindows:
		candidates = windowsCandidates(inPath, out)
	default:
		home, err := os.UserHomeDir()
		if err == nil {
			localBin := filepath.Join(home, ".local", "bin")
			candidates = append(candidates, Candidate{
				Path:        localBin,
				InPath:      inPath[filepath.Clean(localBin)],
				Writable:    isWritable(localBin, out),
				NeedsSudo:   false,
				Recommended: false,
			})
		}
	}

	markRecommended(candidates)

	return candidates
}

func unixCandidates(inPath map[string]bool, out *ui.Output) []Candidate {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil
	}

	localBin := filepath.Join(home, ".local", "bin")
	usrLocalBin := "/usr/local/bin"
	usrLocalWritable := isWritable(usrLocalBin, out)

	candidates := []Candidate{
		{
			Path:        localBin,
			InPath:      inPath[filepath.Clean(localBin)],
			Writable:    isWritable(localBin, out),
			NeedsSudo:   false,
			Recommended: false,
		},
		{
			Path:        usrLocalBin,
			InPath:      inPath[filepath.Clean(usrLocalBin)],
			Writable:    usrLocalWritable,
			NeedsSudo:   !usrLocalWritable,
			Recommended: false,
		},
	}

	return candidates
}

func windowsCandidates(inPath map[string]bool, out *ui.Output) []Candidate {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil
	}

	// On Windows, there's no standard user bin directory in PATH
	// We offer some options but expect manual PATH setup
	localBin := filepath.Join(home, ".local", "bin")

	var candidates []Candidate

	if localAppData := os.Getenv("LOCALAPPDATA"); localAppData != "" {
		appDataBin := filepath.Join(localAppData, "Programs", "studioctl")
		candidates = append(candidates, Candidate{
			Path:        appDataBin,
			InPath:      inPath[filepath.Clean(appDataBin)],
			Writable:    isWritable(appDataBin, out),
			NeedsSudo:   false,
			Recommended: false,
		})
	}

	candidates = append(candidates, Candidate{
		Path:        localBin,
		InPath:      inPath[filepath.Clean(localBin)],
		Writable:    isWritable(localBin, out),
		NeedsSudo:   false,
		Recommended: false,
	})

	return candidates
}

func markRecommended(candidates []Candidate) {
	for i := range candidates {
		if candidates[i].Writable && candidates[i].InPath {
			candidates[i].Recommended = true
			return
		}
	}

	for i := range candidates {
		if candidates[i].Writable {
			candidates[i].Recommended = true
			return
		}
	}
}

func isWritable(dir string, out *ui.Output) bool {
	if dir == "" {
		return false
	}

	info, err := os.Stat(dir)
	if err != nil {
		parent := filepath.Dir(dir)
		if parent == dir {
			return false
		}
		return isWritable(parent, out)
	}

	if !info.IsDir() {
		return false
	}

	testFile := filepath.Join(dir, ".studioctl-write-test")
	//nolint:gosec // G304: testFile is constructed from known dir path
	f, err := os.Create(testFile)
	if err != nil {
		return false
	}

	if err := f.Close(); err != nil && out != nil {
		out.Verbosef("failed to close test file %s: %v", testFile, err)
	}
	if err := os.Remove(testFile); err != nil && out != nil {
		out.Verbosef("failed to remove test file %s: %v", testFile, err)
	}

	return true
}

// Install copies the current executable to the target directory.
// Returns the full path to the installed binary.
func Install(targetDir string) (string, error) {
	execPath, err := os.Executable()
	if err != nil {
		return "", fmt.Errorf("get executable path: %w", err)
	}

	execPath, err = filepath.EvalSymlinks(execPath)
	if err != nil {
		return "", fmt.Errorf("resolve executable symlinks: %w", err)
	}

	binaryName := "studioctl"
	if runtime.GOOS == osWindows {
		binaryName += ".exe"
	}
	targetPath := filepath.Join(targetDir, binaryName)

	if filepath.Clean(execPath) == filepath.Clean(targetPath) {
		return targetPath, ErrAlreadyInstalled
	}

	if err := os.MkdirAll(targetDir, osutil.DirPermDefault); err != nil {
		return "", fmt.Errorf("create target directory: %w", err)
	}

	if err := copyFile(execPath, targetPath); err != nil {
		return "", fmt.Errorf("copy binary: %w", err)
	}

	if runtime.GOOS != osWindows {
		if err := os.Chmod(targetPath, executablePerm); err != nil {
			return "", fmt.Errorf("make binary executable: %w", err)
		}
	}

	return targetPath, nil
}

func copyFile(src, dst string) (err error) {
	//nolint:gosec // G304: src is from os.Executable(), trusted
	srcFile, err := os.Open(src)
	if err != nil {
		return fmt.Errorf("open source: %w", err)
	}
	defer func() {
		if closeErr := srcFile.Close(); closeErr != nil && err == nil {
			err = fmt.Errorf("close source: %w", closeErr)
		}
	}()

	//nolint:gosec // G304: dst is constructed from user-selected directory
	dstFile, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, osutil.FilePermDefault)
	if err != nil {
		return fmt.Errorf("create destination: %w", err)
	}
	defer func() {
		if closeErr := dstFile.Close(); closeErr != nil && err == nil {
			err = fmt.Errorf("close destination: %w", closeErr)
		}
	}()

	if _, err := io.Copy(dstFile, srcFile); err != nil {
		return fmt.Errorf("copy content: %w", err)
	}

	return nil
}

// PathInstructions returns platform-specific instructions for adding a directory to PATH.
func PathInstructions(dir string) string {
	switch runtime.GOOS {
	case "linux":
		return fmt.Sprintf(`Add %s to your PATH by adding this to your shell profile:

  # For bash (~/.bashrc):
  export PATH="$PATH:%s"

  # For zsh (~/.zshrc):
  export PATH="$PATH:%s"

  # For fish (~/.config/fish/config.fish):
  fish_add_path %s

Then restart your shell or run: source ~/.bashrc (or equivalent)`, dir, dir, dir, dir)

	case "darwin":
		return fmt.Sprintf(`Add %s to your PATH by adding this to your shell profile:

  # For zsh (~/.zshrc) - default on macOS:
  export PATH="$PATH:%s"

  # For bash (~/.bash_profile):
  export PATH="$PATH:%s"

Then restart your shell or run: source ~/.zshrc`, dir, dir, dir)

	case osWindows:
		return fmt.Sprintf(`Add %s to your PATH:

  1. Open System Properties > Environment Variables
  2. Under "User variables", select "Path" and click "Edit"
  3. Click "New" and add: %s
  4. Click OK and restart your terminal

Or run this in PowerShell (as Administrator):
  [Environment]::SetEnvironmentVariable("Path", $env:Path + ";%s", "User")`, dir, dir, dir)

	default:
		return fmt.Sprintf("Add %s to your PATH environment variable.", dir)
	}
}
