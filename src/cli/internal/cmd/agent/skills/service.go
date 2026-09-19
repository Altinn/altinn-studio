// Package skills manages Agent Skills distributed with studioctl.
package skills

import (
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"

	"gopkg.in/yaml.v3"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/osutil"
)

const (
	// HarnessCodex installs skills for Codex.
	HarnessCodex = "codex"
	// HarnessClaude installs skills for Claude Code.
	HarnessClaude = "claude"
	// HarnessAll installs skills for every supported harness.
	HarnessAll = "all"

	// ScopeUser installs skills in harness user directories.
	ScopeUser = "user"
	// ScopeRepo installs skills in the current repository.
	ScopeRepo = "repo"

	managedMetadataFileName = ".studioctl-skill.json"
	metadataSchemaVersion   = 1
)

var (
	// ErrSkillNotFound indicates that the named skill is not distributed by studioctl.
	ErrSkillNotFound = errors.New("agent skill not found")
	// ErrInvalidHarness indicates an unsupported harness name.
	ErrInvalidHarness = errors.New("unsupported agent harness")
	// ErrInvalidScope indicates an unsupported installation scope.
	ErrInvalidScope = errors.New("unsupported Agent Skill scope")
	// ErrNoHarnessDetected indicates that automatic harness detection found no supported harness.
	ErrNoHarnessDetected = errors.New("no supported agent harness detected")
	// ErrRepoNotFound indicates that repository scope was requested outside a Git repository.
	ErrRepoNotFound = errors.New("git repository not found")
	// ErrUnmanagedTarget indicates that installing would replace a directory studioctl does not own.
	ErrUnmanagedTarget = errors.New("refusing to replace an unmanaged Agent Skill")
	// ErrModifiedTarget indicates that a studioctl-managed skill has local changes.
	ErrModifiedTarget = errors.New("refusing to replace a modified Agent Skill")

	errInvalidSkillMetadata     = errors.New("invalid Agent Skill metadata")
	errMissingFrontmatter       = errors.New("missing YAML frontmatter")
	errUnterminatedFrontmatter  = errors.New("unterminated YAML frontmatter")
	errOverlappingSkillPaths    = errors.New("agent skill source and target paths overlap")
	errTargetHarnessConflict    = errors.New("--target cannot be combined with --harness")
	errUnsupportedSkillFileType = errors.New("unsupported file type in Agent Skill")
)

// Skill describes an Agent Skill distributed with studioctl.
type Skill struct {
	Name        string
	Description string
	Path        string
}

// InstallOptions controls where an Agent Skill is installed.
type InstallOptions struct {
	Name       string
	Harness    string
	Scope      string
	TargetDir  string
	WorkingDir string
}

// InstallStatus describes whether an install created, updated, or retained a skill.
type InstallStatus string

const (
	// InstallStatusInstalled indicates a new installation.
	InstallStatusInstalled InstallStatus = "installed"
	// InstallStatusUpdated indicates replacement of an older managed installation.
	InstallStatusUpdated InstallStatus = "updated"
	// InstallStatusUnchanged indicates the installed skill already matches the source.
	InstallStatusUnchanged InstallStatus = "unchanged"
)

// InstallResult describes one harness installation target.
type InstallResult struct {
	Harness string
	Path    string
	Status  InstallStatus
}

type managedMetadata struct {
	Name          string `json:"name"`
	SourceDigest  string `json:"sourceDigest"`
	SourceVersion string `json:"sourceVersion"`
	SchemaVersion int    `json:"schemaVersion"`
}

type installPlan struct {
	target InstallResult
	source string
	digest string
}

type resourceRename struct {
	source string
	target string
}

// Service manages the canonical Agent Skills installed with studioctl.
type Service struct {
	cfg     *config.Config
	homeDir func() (string, error)
}

// NewService creates an Agent Skills service.
func NewService(cfg *config.Config) *Service {
	return &Service{
		cfg:     cfg,
		homeDir: os.UserHomeDir,
	}
}

// CanonicalizeResourceDirs renames authored skill directories to their frontmatter names before distribution.
func CanonicalizeResourceDirs(root string) error {
	absRoot, err := filepath.Abs(root)
	if err != nil {
		return fmt.Errorf("resolve Agent Skill resources: %w", err)
	}
	entries, err := os.ReadDir(absRoot)
	if err != nil {
		return fmt.Errorf("read Agent Skill resources: %w", err)
	}

	names := make(map[string]string, len(entries))
	renames := make([]resourceRename, 0, len(entries))
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		skill, err := readSkill(filepath.Join(absRoot, entry.Name()))
		if err != nil {
			return err
		}
		if !isSafeName(skill.Name) {
			return fmt.Errorf("%w: unsafe frontmatter name %q", errInvalidSkillMetadata, skill.Name)
		}
		if previous, exists := names[skill.Name]; exists {
			return fmt.Errorf(
				"%w: directories %q and %q declare the same name %q",
				errInvalidSkillMetadata,
				previous,
				entry.Name(),
				skill.Name,
			)
		}
		names[skill.Name] = entry.Name()

		target := filepath.Join(absRoot, skill.Name)
		if filepath.Clean(skill.Path) != filepath.Clean(target) {
			renames = append(renames, resourceRename{source: skill.Path, target: target})
		}
	}

	for _, rename := range renames {
		if _, err := os.Lstat(rename.target); err == nil {
			return fmt.Errorf(
				"%w: canonical resource directory already exists at %q",
				errInvalidSkillMetadata,
				rename.target,
			)
		} else if !errors.Is(err, os.ErrNotExist) {
			return fmt.Errorf("inspect canonical Agent Skill resource %q: %w", rename.target, err)
		}
	}
	for _, rename := range renames {
		if err := os.Rename(rename.source, rename.target); err != nil {
			return fmt.Errorf("canonicalize Agent Skill resource directory: %w", err)
		}
	}
	return nil
}

// List returns every Agent Skill distributed with this studioctl installation.
func (s *Service) List() ([]Skill, error) {
	entries, err := os.ReadDir(s.cfg.AgentSkillsDir())
	if err != nil {
		return nil, fmt.Errorf("read installed Agent Skills: %w", err)
	}

	skills := make([]Skill, 0, len(entries))
	for _, entry := range entries {
		if !entry.IsDir() || !isSafeName(entry.Name()) {
			continue
		}
		skill, err := readSkill(filepath.Join(s.cfg.AgentSkillsDir(), entry.Name()))
		if err != nil {
			return nil, err
		}
		if skill.Name != entry.Name() {
			return nil, fmt.Errorf(
				"%w for %q: frontmatter name %q does not match its directory",
				errInvalidSkillMetadata,
				entry.Name(),
				skill.Name,
			)
		}
		skills = append(skills, skill)
	}

	sort.Slice(skills, func(i, j int) bool { return skills[i].Name < skills[j].Name })
	return skills, nil
}

// Path returns the canonical path for a named Agent Skill.
func (s *Service) Path(name string) (string, error) {
	skill, err := s.find(name)
	if err != nil {
		return "", err
	}
	return skill.Path, nil
}

// Install copies an Agent Skill into one or more harness discovery directories.
func (s *Service) Install(opts InstallOptions) ([]InstallResult, error) {
	skill, err := s.find(opts.Name)
	if err != nil {
		return nil, err
	}

	digest, err := hashDir(skill.Path)
	if err != nil {
		return nil, fmt.Errorf("hash Agent Skill source: %w", err)
	}

	targets, err := s.resolveTargets(opts, skill.Name)
	if err != nil {
		return nil, err
	}

	plans := make([]installPlan, 0, len(targets))
	for _, target := range targets {
		if err := ensureSeparateTrees(skill.Path, target.Path); err != nil {
			return nil, err
		}
		status, err := inspectTarget(target.Path, skill.Name, digest)
		if err != nil {
			return nil, err
		}
		target.Status = status
		plans = append(plans, installPlan{target: target, source: skill.Path, digest: digest})
	}

	results := make([]InstallResult, 0, len(plans))
	for _, plan := range plans {
		if plan.target.Status != InstallStatusUnchanged {
			if err := installManagedSkill(plan, skill.Name, s.cfg.Version.String()); err != nil {
				return nil, err
			}
		}
		results = append(results, plan.target)
	}
	return results, nil
}

func (s *Service) find(name string) (Skill, error) {
	if !isSafeName(name) {
		return Skill{}, fmt.Errorf("%w: %q", ErrSkillNotFound, name)
	}
	skill, err := readSkill(filepath.Join(s.cfg.AgentSkillsDir(), name))
	if errors.Is(err, os.ErrNotExist) {
		return Skill{}, fmt.Errorf("%w: %q", ErrSkillNotFound, name)
	}
	if err != nil {
		return Skill{}, err
	}
	if skill.Name != name {
		return Skill{}, fmt.Errorf(
			"%w for %q: frontmatter name %q does not match",
			errInvalidSkillMetadata,
			name,
			skill.Name,
		)
	}
	return skill, nil
}

func readSkill(dir string) (Skill, error) {
	path := filepath.Join(dir, "SKILL.md")
	content, err := os.ReadFile(path) //nolint:gosec // Path is constrained to the installed resources directory.
	if err != nil {
		return Skill{}, fmt.Errorf("read Agent Skill metadata %q: %w", path, err)
	}

	frontmatter, err := parseFrontmatter(content)
	if err != nil {
		return Skill{}, fmt.Errorf("parse Agent Skill metadata %q: %w", path, err)
	}
	if frontmatter.Name == "" || frontmatter.Description == "" {
		return Skill{}, fmt.Errorf("%w in %q: name and description are required", errInvalidSkillMetadata, path)
	}
	absDir, err := filepath.Abs(dir)
	if err != nil {
		return Skill{}, fmt.Errorf("resolve Agent Skill path: %w", err)
	}
	return Skill{Name: frontmatter.Name, Description: frontmatter.Description, Path: absDir}, nil
}

func parseFrontmatter(content []byte) (managedSkillFrontmatter, error) {
	lines := strings.Split(strings.ReplaceAll(string(content), "\r\n", "\n"), "\n")
	if len(lines) < 3 || lines[0] != "---" {
		return managedSkillFrontmatter{}, errMissingFrontmatter
	}
	end := -1
	for i := 1; i < len(lines); i++ {
		if lines[i] == "---" {
			end = i
			break
		}
	}
	if end < 0 {
		return managedSkillFrontmatter{}, errUnterminatedFrontmatter
	}

	var frontmatter managedSkillFrontmatter
	if err := yaml.Unmarshal([]byte(strings.Join(lines[1:end], "\n")), &frontmatter); err != nil {
		return managedSkillFrontmatter{}, fmt.Errorf("decode YAML frontmatter: %w", err)
	}
	return frontmatter, nil
}

type managedSkillFrontmatter struct {
	Name        string `yaml:"name"`
	Description string `yaml:"description"`
}

func (s *Service) resolveTargets(opts InstallOptions, skillName string) ([]InstallResult, error) {
	if opts.TargetDir != "" {
		if opts.Harness != "" {
			return nil, errTargetHarnessConflict
		}
		root, err := filepath.Abs(opts.TargetDir)
		if err != nil {
			return nil, fmt.Errorf("resolve target directory: %w", err)
		}
		return []InstallResult{{
			Harness: "custom",
			Path:    filepath.Join(root, skillName),
			Status:  "",
		}}, nil
	}

	scope := opts.Scope
	if scope == "" {
		scope = ScopeUser
	}
	if scope != ScopeUser && scope != ScopeRepo {
		return nil, fmt.Errorf("%w: %q (supported: user, repo)", ErrInvalidScope, scope)
	}

	root, err := s.scopeRoot(scope, opts.WorkingDir)
	if err != nil {
		return nil, err
	}
	harnesses, err := s.resolveHarnesses(opts.Harness, root)
	if err != nil {
		return nil, err
	}

	results := make([]InstallResult, 0, len(harnesses))
	for _, harness := range harnesses {
		results = append(results, InstallResult{
			Harness: harness,
			Path:    filepath.Join(harnessSkillsRoot(root, harness), skillName),
			Status:  "",
		})
	}
	return results, nil
}

func (s *Service) scopeRoot(scope, workingDir string) (string, error) {
	if scope == ScopeUser {
		home, err := s.homeDir()
		if err != nil {
			return "", fmt.Errorf("resolve user home: %w", err)
		}
		return home, nil
	}
	if workingDir == "" {
		var err error
		workingDir, err = os.Getwd()
		if err != nil {
			return "", fmt.Errorf("get current directory: %w", err)
		}
	}
	root, err := findRepoRoot(workingDir)
	if err != nil {
		return "", err
	}
	return root, nil
}

func (s *Service) resolveHarnesses(requested, root string) ([]string, error) {
	if requested != "" {
		switch requested {
		case HarnessCodex, HarnessClaude:
			return []string{requested}, nil
		case HarnessAll:
			return []string{HarnessCodex, HarnessClaude}, nil
		default:
			return nil, fmt.Errorf(
				"%w: %q (supported: codex, claude, all)",
				ErrInvalidHarness,
				requested,
			)
		}
	}

	var harnesses []string
	for _, harness := range []string{HarnessCodex, HarnessClaude} {
		if pathExists(filepath.Dir(harnessSkillsRoot(root, harness))) || commandExists(harness) {
			harnesses = append(harnesses, harness)
		}
	}
	if len(harnesses) == 0 {
		return nil, fmt.Errorf("%w; pass --harness codex, claude, or all", ErrNoHarnessDetected)
	}
	return harnesses, nil
}

func harnessSkillsRoot(root, harness string) string {
	switch harness {
	case HarnessCodex:
		return filepath.Join(root, ".agents", "skills")
	case HarnessClaude:
		return filepath.Join(root, ".claude", "skills")
	default:
		panic("unsupported harness")
	}
}

func commandExists(harness string) bool {
	_, err := exec.LookPath(harness)
	return err == nil
}

func pathExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func findRepoRoot(start string) (string, error) {
	current, err := filepath.Abs(start)
	if err != nil {
		return "", fmt.Errorf("resolve current directory: %w", err)
	}
	for {
		if _, err := os.Lstat(filepath.Join(current, ".git")); err == nil {
			return current, nil
		} else if !errors.Is(err, os.ErrNotExist) {
			return "", fmt.Errorf("inspect repository root: %w", err)
		}
		parent := filepath.Dir(current)
		if parent == current {
			return "", fmt.Errorf("%w from %q", ErrRepoNotFound, start)
		}
		current = parent
	}
}

func inspectTarget(targetPath, skillName, sourceDigest string) (InstallStatus, error) {
	info, err := os.Lstat(targetPath)
	if errors.Is(err, os.ErrNotExist) {
		return InstallStatusInstalled, nil
	}
	if err != nil {
		return "", fmt.Errorf("inspect Agent Skill target %q: %w", targetPath, err)
	}
	if !info.IsDir() || info.Mode()&os.ModeSymlink != 0 {
		return "", fmt.Errorf("%w at %q", ErrUnmanagedTarget, targetPath)
	}

	metadataPath := filepath.Join(targetPath, managedMetadataFileName)
	content, err := os.ReadFile(metadataPath) //nolint:gosec // Target is a resolved skill installation directory.
	if errors.Is(err, os.ErrNotExist) {
		return "", fmt.Errorf("%w at %q", ErrUnmanagedTarget, targetPath)
	}
	if err != nil {
		return "", fmt.Errorf("read managed Agent Skill metadata %q: %w", metadataPath, err)
	}
	var metadata managedMetadata
	if jsonErr := json.Unmarshal(content, &metadata); jsonErr != nil {
		return "", fmt.Errorf("%w at %q: invalid management metadata", ErrUnmanagedTarget, targetPath)
	}
	if metadata.SchemaVersion != metadataSchemaVersion || metadata.Name != skillName || metadata.SourceDigest == "" {
		return "", fmt.Errorf("%w at %q: unexpected management metadata", ErrUnmanagedTarget, targetPath)
	}

	currentDigest, err := hashDir(targetPath)
	if err != nil {
		return "", fmt.Errorf("hash installed Agent Skill %q: %w", targetPath, err)
	}
	if currentDigest != metadata.SourceDigest {
		return "", fmt.Errorf("%w at %q", ErrModifiedTarget, targetPath)
	}
	if currentDigest == sourceDigest {
		return InstallStatusUnchanged, nil
	}
	return InstallStatusUpdated, nil
}

func installManagedSkill(plan installPlan, skillName, version string) error {
	parent := filepath.Dir(plan.target.Path)
	if err := os.MkdirAll(parent, osutil.DirPermDefault); err != nil {
		return fmt.Errorf("create Agent Skill target directory: %w", err)
	}

	staging, err := os.MkdirTemp(parent, "."+filepath.Base(plan.target.Path)+".tmp-*")
	if err != nil {
		return fmt.Errorf("create Agent Skill staging directory: %w", err)
	}
	defer os.RemoveAll(staging) //nolint:errcheck // Best-effort cleanup after a reported install result.

	if copyErr := copySkillDir(plan.source, staging); copyErr != nil {
		return fmt.Errorf("stage Agent Skill: %w", copyErr)
	}
	metadata := managedMetadata{
		Name:          skillName,
		SourceDigest:  plan.digest,
		SourceVersion: version,
		SchemaVersion: metadataSchemaVersion,
	}
	metadataContent, err := json.MarshalIndent(metadata, "", "  ")
	if err != nil {
		return fmt.Errorf("encode Agent Skill management metadata: %w", err)
	}
	metadataContent = append(metadataContent, '\n')
	if err := os.WriteFile(
		filepath.Join(staging, managedMetadataFileName),
		metadataContent,
		osutil.FilePermDefault,
	); err != nil {
		return fmt.Errorf("write Agent Skill management metadata: %w", err)
	}

	if plan.target.Status == InstallStatusInstalled {
		if err := os.Rename(staging, plan.target.Path); err != nil {
			return fmt.Errorf("install Agent Skill at %q: %w", plan.target.Path, err)
		}
		return nil
	}
	if err := osutil.ReplacePath(staging, plan.target.Path); err != nil {
		return fmt.Errorf("replace Agent Skill %q: %w", plan.target.Path, err)
	}
	return nil
}

func copySkillDir(source, target string) error {
	walkErr := filepath.WalkDir(source, func(path string, entry fs.DirEntry, entryErr error) error {
		if entryErr != nil {
			return fmt.Errorf("walk Agent Skill source: %w", entryErr)
		}
		rel, err := filepath.Rel(source, path)
		if err != nil {
			return fmt.Errorf("resolve Agent Skill relative path: %w", err)
		}
		destination := filepath.Join(target, rel)
		info, err := entry.Info()
		if err != nil {
			return fmt.Errorf("read Agent Skill file info: %w", err)
		}
		if entry.IsDir() {
			if err := os.MkdirAll(destination, info.Mode().Perm()); err != nil {
				return fmt.Errorf("create Agent Skill directory: %w", err)
			}
			return nil
		}
		if !entry.Type().IsRegular() {
			return fmt.Errorf("%w at %q", errUnsupportedSkillFileType, path)
		}
		return copySkillFile(path, destination, info.Mode().Perm())
	})
	if walkErr != nil {
		return fmt.Errorf("copy Agent Skill directory: %w", walkErr)
	}
	return nil
}

func copySkillFile(source, target string, mode os.FileMode) (err error) {
	input, err := os.Open(source) //nolint:gosec // Source is inside the installed studioctl resources directory.
	if err != nil {
		return fmt.Errorf("open Agent Skill source file: %w", err)
	}
	defer func() { err = errors.Join(err, input.Close()) }()

	//nolint:gosec // Mode comes from trusted packaged resources.
	output, err := os.OpenFile(target, os.O_CREATE|os.O_EXCL|os.O_WRONLY, mode)
	if err != nil {
		return fmt.Errorf("create Agent Skill target file: %w", err)
	}
	defer func() { err = errors.Join(err, output.Close()) }()
	if _, err := io.Copy(output, input); err != nil {
		return fmt.Errorf("copy Agent Skill file: %w", err)
	}
	if err := output.Chmod(mode); err != nil {
		return fmt.Errorf("preserve Agent Skill file mode: %w", err)
	}
	return nil
}

func hashDir(root string) (string, error) {
	hash := sha256.New()
	walkErr := filepath.WalkDir(root, func(path string, entry fs.DirEntry, entryErr error) error {
		if entryErr != nil {
			return fmt.Errorf("walk Agent Skill directory: %w", entryErr)
		}
		return hashDirEntry(hash, root, path, entry)
	})
	if walkErr != nil {
		return "", fmt.Errorf("hash Agent Skill directory: %w", walkErr)
	}
	return "sha256:" + hex.EncodeToString(hash.Sum(nil)), nil
}

func hashDirEntry(writer io.Writer, root, path string, entry fs.DirEntry) error {
	rel, err := filepath.Rel(root, path)
	if err != nil {
		return fmt.Errorf("resolve Agent Skill relative path: %w", err)
	}
	if rel == managedMetadataFileName {
		return nil
	}
	if !entry.IsDir() && !entry.Type().IsRegular() {
		return fmt.Errorf("%w at %q", errUnsupportedSkillFileType, path)
	}
	entryType := byte('f')
	if entry.IsDir() {
		entryType = 'd'
	}
	if fieldErr := writeHashField(writer, []byte{entryType}); fieldErr != nil {
		return fmt.Errorf("hash Agent Skill entry type: %w", fieldErr)
	}
	if fieldErr := writeHashField(writer, []byte(filepath.ToSlash(rel))); fieldErr != nil {
		return fmt.Errorf("hash Agent Skill path: %w", fieldErr)
	}
	if entry.IsDir() {
		return nil
	}

	info, err := entry.Info()
	if err != nil {
		return fmt.Errorf("read Agent Skill file info: %w", err)
	}
	var mode [4]byte
	binary.BigEndian.PutUint32(mode[:], uint32(info.Mode().Perm()))
	if fieldErr := writeHashField(writer, mode[:]); fieldErr != nil {
		return fmt.Errorf("hash Agent Skill file mode: %w", fieldErr)
	}
	if fieldErr := writeHashField(writer, []byte(strconv.FormatInt(info.Size(), 10))); fieldErr != nil {
		return fmt.Errorf("hash Agent Skill file size: %w", fieldErr)
	}
	file, err := os.Open(path) //nolint:gosec // Paths are constrained to the walked skill directory.
	if err != nil {
		return fmt.Errorf("open Agent Skill file for hashing: %w", err)
	}
	_, copyErr := io.Copy(writer, file)
	closeErr := file.Close()
	if copyErr != nil || closeErr != nil {
		return errors.Join(copyErr, closeErr)
	}
	return nil
}

func writeHashField(writer io.Writer, value []byte) error {
	var size [8]byte
	binary.BigEndian.PutUint64(size[:], uint64(len(value)))
	if _, err := writer.Write(size[:]); err != nil {
		return fmt.Errorf("write field size: %w", err)
	}
	_, err := writer.Write(value)
	if err != nil {
		return fmt.Errorf("write field value: %w", err)
	}
	return nil
}

func ensureSeparateTrees(source, target string) error {
	resolvedSource, err := resolvePath(source)
	if err != nil {
		return fmt.Errorf("resolve Agent Skill source path: %w", err)
	}
	resolvedTarget, err := resolvePath(target)
	if err != nil {
		return fmt.Errorf("resolve Agent Skill target path: %w", err)
	}
	overlaps, err := pathsOverlap(resolvedSource, resolvedTarget)
	if err != nil {
		return fmt.Errorf("compare Agent Skill source and target paths: %w", err)
	}
	if overlaps {
		return fmt.Errorf(
			"%w: source %q and target %q must be separate",
			errOverlappingSkillPaths,
			resolvedSource,
			resolvedTarget,
		)
	}
	return nil
}

func resolvePath(path string) (string, error) {
	absPath, err := filepath.Abs(path)
	if err != nil {
		return "", fmt.Errorf("make path absolute: %w", err)
	}
	resolved, err := filepath.EvalSymlinks(absPath)
	if err == nil {
		return resolved, nil
	}
	if !errors.Is(err, os.ErrNotExist) {
		return "", fmt.Errorf("evaluate symbolic links: %w", err)
	}
	parent := filepath.Dir(absPath)
	if parent == absPath {
		return absPath, nil
	}
	resolvedParent, err := resolvePath(parent)
	if err != nil {
		return "", err
	}
	return filepath.Join(resolvedParent, filepath.Base(absPath)), nil
}

func pathsOverlap(first, second string) (bool, error) {
	firstContainsSecond, err := pathContains(first, second)
	if err != nil {
		return false, err
	}
	secondContainsFirst, err := pathContains(second, first)
	if err != nil {
		return false, err
	}
	return firstContainsSecond || secondContainsFirst, nil
}

func pathContains(parent, child string) (bool, error) {
	if !strings.EqualFold(filepath.VolumeName(parent), filepath.VolumeName(child)) {
		return false, nil
	}
	rel, err := filepath.Rel(parent, child)
	if err != nil {
		return false, fmt.Errorf("make child path relative: %w", err)
	}
	return rel == "." || rel != ".." && !strings.HasPrefix(rel, ".."+string(filepath.Separator)), nil
}

func isSafeName(name string) bool {
	return name != "" && name != "." && name != ".." && filepath.Base(name) == name &&
		!strings.ContainsAny(name, `/\`)
}
