// Package self contains implementation helpers for the studioctl self command.
package self

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

// ErrNoWritableInstallLocation is returned when no install location can be used.
var ErrNoWritableInstallLocation = errors.New("no writable install location found")

const installedCommandName = "studioctl"

// Candidate describes a possible binary install directory.
type Candidate struct {
	Path        string
	InPath      bool
	Writable    bool
	NeedsSudo   bool
	Recommended bool
}

// ExistingInstallDir returns the directory of an existing studioctl on PATH.
func ExistingInstallDir() (string, bool) {
	path, err := exec.LookPath(installedCommandName)
	if err != nil || path == "" {
		return "", false
	}
	absPath, err := filepath.Abs(path)
	if err != nil {
		return filepath.Dir(path), true
	}
	resolvedPath, err := filepath.EvalSymlinks(absPath)
	if err != nil {
		return filepath.Dir(absPath), true
	}
	return filepath.Dir(resolvedPath), true
}

// DetectCandidates discovers possible binary install directories.
func DetectCandidates(out *ui.Output) []Candidate {
	pathDirs := filepath.SplitList(os.Getenv("PATH"))
	inPath := make(map[string]bool, len(pathDirs))
	for _, p := range pathDirs {
		inPath[filepath.Clean(p)] = true
	}

	var candidates []Candidate
	switch runtime.GOOS {
	case osutil.OSLinux, osutil.OSDarwin:
		candidates = unixInstallLocationCandidates(inPath, out)
	case osutil.OSWindows:
		candidates = windowsInstallLocationCandidates(inPath, out)
	default:
		home, err := os.UserHomeDir()
		if err == nil {
			localBin := filepath.Join(home, ".local", "bin")
			candidates = append(candidates, Candidate{
				Path:        localBin,
				InPath:      inPath[filepath.Clean(localBin)],
				Writable:    installLocationWritable(localBin, out),
				NeedsSudo:   false,
				Recommended: false,
			})
		}
	}

	markRecommendedInstallLocation(candidates)
	return candidates
}

func unixInstallLocationCandidates(inPath map[string]bool, out *ui.Output) []Candidate {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil
	}

	localBin := filepath.Join(home, ".local", "bin")
	usrLocalBin := "/usr/local/bin"
	usrLocalWritable := installLocationWritable(usrLocalBin, out)

	return []Candidate{
		{
			Path:        localBin,
			InPath:      inPath[filepath.Clean(localBin)],
			Writable:    installLocationWritable(localBin, out),
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
}

func windowsInstallLocationCandidates(inPath map[string]bool, out *ui.Output) []Candidate {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil
	}

	localBin := filepath.Join(home, ".local", "bin")
	var candidates []Candidate

	if localAppData := os.Getenv("LOCALAPPDATA"); localAppData != "" {
		appDataBin := filepath.Join(localAppData, "Programs", "studioctl")
		candidates = append(candidates, Candidate{
			Path:        appDataBin,
			InPath:      inPath[filepath.Clean(appDataBin)],
			Writable:    installLocationWritable(appDataBin, out),
			NeedsSudo:   false,
			Recommended: false,
		})
	}

	candidates = append(candidates, Candidate{
		Path:        localBin,
		InPath:      inPath[filepath.Clean(localBin)],
		Writable:    installLocationWritable(localBin, out),
		NeedsSudo:   false,
		Recommended: false,
	})

	return candidates
}

func markRecommendedInstallLocation(candidates []Candidate) {
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

// DefaultInstallLocation returns the best writable install directory.
func DefaultInstallLocation(candidates []Candidate) (string, bool) {
	for _, candidate := range candidates {
		if candidate.Recommended && candidate.Writable {
			return candidate.Path, true
		}
	}
	for _, candidate := range candidates {
		if candidate.Writable {
			return candidate.Path, true
		}
	}
	return "", false
}

// LocationInPath reports whether dir is on PATH according to candidates.
func LocationInPath(dir string, candidates []Candidate) bool {
	for _, candidate := range candidates {
		if candidate.Path == dir {
			return candidate.InPath
		}
	}
	return dirInPath(dir)
}

func dirInPath(dir string) bool {
	cleanDir := filepath.Clean(dir)
	for _, pathDir := range filepath.SplitList(os.Getenv("PATH")) {
		if filepath.Clean(pathDir) == cleanDir {
			return true
		}
	}
	return false
}

func installLocationWritable(dir string, out *ui.Output) bool {
	if dir == "" {
		return false
	}

	cleanDir, err := filepath.Abs(dir)
	if err != nil {
		return false
	}

	//nolint:gosec // G703: this is an intentional writability probe on the user-selected install directory.
	info, err := os.Stat(cleanDir)
	if err != nil {
		parent := filepath.Dir(cleanDir)
		if parent == cleanDir {
			return false
		}
		return installLocationWritable(parent, out)
	}

	if !info.IsDir() {
		return false
	}

	testFile := filepath.Join(cleanDir, ".studioctl-write-test")
	//nolint:gosec // G304: testFile is constructed from known dir path.
	f, err := os.Create(testFile)
	if err != nil {
		return false
	}

	if err := f.Close(); err != nil && out != nil {
		out.Verbosef("failed to close test file %s: %v", testFile, err)
	}
	//nolint:gosec // G703: this removes the temporary probe file created in the validated install directory above.
	if err := os.Remove(testFile); err != nil && out != nil {
		out.Verbosef("failed to remove test file %s: %v", testFile, err)
	}

	return true
}

// LocationPathInstructions returns shell-specific PATH setup instructions.
func LocationPathInstructions(dir string) string {
	switch runtime.GOOS {
	case osutil.OSLinux:
		return joinLines(
			fmt.Sprintf("Add %s to your PATH by adding this to your shell profile:", dir),
			"",
			"  # For bash (~/.bashrc):",
			fmt.Sprintf("  export PATH=\"$PATH:%s\"", dir),
			"",
			"  # For zsh (~/.zshrc):",
			fmt.Sprintf("  export PATH=\"$PATH:%s\"", dir),
			"",
			"  # For fish (~/.config/fish/config.fish):",
			"  fish_add_path "+dir,
			"",
			"Then restart your shell or run: source ~/.bashrc (or equivalent)",
		)

	case osutil.OSDarwin:
		return joinLines(
			fmt.Sprintf("Add %s to your PATH by adding this to your shell profile:", dir),
			"",
			"  # For zsh (~/.zshrc) - default on macOS:",
			fmt.Sprintf("  export PATH=\"$PATH:%s\"", dir),
			"",
			"  # For bash (~/.bash_profile):",
			fmt.Sprintf("  export PATH=\"$PATH:%s\"", dir),
			"",
			"Then restart your shell or run: source ~/.zshrc",
		)

	case osutil.OSWindows:
		displayDir := strings.TrimRight(dir, `\/`) + `\`
		return joinLines(
			fmt.Sprintf("Add %s to your PATH:", displayDir),
			"",
			"  1. Open System Properties > Environment Variables",
			`  2. Under "User variables", select "Path" and click "Edit"`,
			"  3. Click \"New\" and add: "+displayDir,
			"  4. Click OK and restart your terminal",
			"",
			"Or run this in PowerShell (as Administrator):",
			fmt.Sprintf(`  [Environment]::SetEnvironmentVariable("Path", $env:Path + ";%s", "User")`, displayDir),
		)

	default:
		return fmt.Sprintf("Add %s to your PATH environment variable.", dir)
	}
}

func joinLines(lines ...string) string {
	return strings.Join(lines, "\n")
}
