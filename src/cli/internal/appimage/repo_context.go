package appimage

import (
	"bytes"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"

	repocontext "altinn.studio/studioctl/internal/context"
)

var (
	errAppProjectNotFound                = errors.New("app project not found")
	errMultipleAppProjectsFound          = errors.New("multiple app projects found")
	errProjectReferenceOutsideContext    = errors.New("project reference outside docker build context")
	errGeneratedDockerfilePathResolution = errors.New("failed to resolve generated dockerfile path")
)

type repoContext struct {
	AppProject    string
	AppRoot       string
	BuildRoot     string
	MetadataFiles []string
	ProjectFiles  []string
	SourceDirs    []string

	UseGeneratedDockerfile bool
}

func newRepoContext(result repocontext.Detection) (repoContext, error) {
	runRepo := repoContext{
		AppProject:             "",
		AppRoot:                result.AppRoot,
		BuildRoot:              result.AppRoot,
		MetadataFiles:          nil,
		ProjectFiles:           nil,
		SourceDirs:             nil,
		UseGeneratedDockerfile: false,
	}
	if !result.InStudioRepo || result.StudioRoot == "" {
		return runRepo, nil
	}

	srcRoot := filepath.Join(result.StudioRoot, "src")
	if !pathWithin(srcRoot, result.AppRoot) {
		return runRepo, nil
	}

	appProject, err := findAppProject(result.AppRoot)
	if err != nil {
		return repoContext{}, err
	}
	projectFiles, err := collectProjectFiles(srcRoot, appProject)
	if err != nil {
		return repoContext{}, err
	}
	metadataFiles, err := collectBuildMetadataFiles(srcRoot, projectFiles)
	if err != nil {
		return repoContext{}, err
	}
	sourceDirs, err := projectSourceDirs(srcRoot, projectFiles)
	if err != nil {
		return repoContext{}, err
	}

	return repoContext{
		AppProject:             appProject,
		AppRoot:                result.AppRoot,
		BuildRoot:              srcRoot,
		MetadataFiles:          metadataFiles,
		ProjectFiles:           projectFiles,
		SourceDirs:             sourceDirs,
		UseGeneratedDockerfile: true,
	}, nil
}

func findAppProject(appPath string) (string, error) {
	appDir := filepath.Join(appPath, "App")
	entries, err := os.ReadDir(appDir)
	if err != nil {
		return "", fmt.Errorf("read app project directory: %w", err)
	}

	projects := make([]string, 0, 1)
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".csproj") {
			continue
		}
		projects = append(projects, filepath.Join(appDir, entry.Name()))
	}
	sort.Strings(projects)

	switch len(projects) {
	case 0:
		return "", fmt.Errorf("%w: %s", errAppProjectNotFound, appDir)
	case 1:
		return projects[0], nil
	default:
		return "", fmt.Errorf("%w: %s", errMultipleAppProjectsFound, appDir)
	}
}

func collectProjectFiles(contextRoot, rootProject string) ([]string, error) {
	var projectFiles []string
	seen := make(map[string]struct{})
	queue := []string{rootProject}

	for len(queue) > 0 {
		project := filepath.Clean(queue[0])
		queue = queue[1:]
		if _, ok := seen[project]; ok {
			continue
		}
		if _, err := relPathWithin(contextRoot, project); err != nil {
			return nil, fmt.Errorf("%w: %s", errProjectReferenceOutsideContext, project)
		}
		seen[project] = struct{}{}
		projectFiles = append(projectFiles, project)

		projectFile, err := readProjectFile(project)
		if err != nil {
			return nil, err
		}
		for _, reference := range projectFile.References {
			queue = append(queue, filepath.Clean(filepath.Join(filepath.Dir(project), normalizeProjectPath(reference))))
		}
	}

	sort.Strings(projectFiles)
	return projectFiles, nil
}

type projectFile struct {
	References []string
}

func readProjectFile(projectPath string) (projectFile, error) {
	//nolint:gosec // G304: callers constrain projectPath to the Docker build context before reading.
	data, err := os.ReadFile(projectPath)
	if err != nil {
		return projectFile{}, fmt.Errorf("read project file: %w", err)
	}

	decoder := xml.NewDecoder(bytes.NewReader(data))
	var project projectFile
	for {
		token, err := decoder.Token()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return projectFile{}, fmt.Errorf("parse project file: %w", err)
		}

		start, ok := token.(xml.StartElement)
		if !ok {
			continue
		}
		readProjectFileElement(start, &project)
	}
	return project, nil
}

func readProjectFileElement(start xml.StartElement, project *projectFile) {
	if start.Name.Local != "ProjectReference" {
		return
	}

	for _, attr := range start.Attr {
		if attr.Name.Local == "Include" && attr.Value != "" {
			project.References = append(project.References, attr.Value)
			return
		}
	}
}

func normalizeProjectPath(value string) string {
	return strings.ReplaceAll(filepath.FromSlash(value), "\\", string(filepath.Separator))
}

func collectBuildMetadataFiles(contextRoot string, projectFiles []string) ([]string, error) {
	buildMetadataFileNames := [...]string{
		"Directory.Build.props",
		"Directory.Build.targets",
		"Directory.Packages.props",
		"NuGet.config",
		"global.json",
	}

	files := make(map[string]struct{})
	for _, project := range projectFiles {
		for dir := filepath.Dir(project); ; dir = filepath.Dir(dir) {
			if _, err := relPathWithin(contextRoot, dir); err != nil {
				return nil, err
			}
			for _, name := range buildMetadataFileNames {
				path := filepath.Join(dir, name)
				if fileExists(path) {
					files[path] = struct{}{}
				}
			}
			if dir == contextRoot {
				break
			}
		}
	}

	return sortedKeys(files), nil
}

func projectSourceDirs(contextRoot string, projectFiles []string) ([]string, error) {
	dirs := make(map[string]struct{}, len(projectFiles))
	for _, project := range projectFiles {
		dir := filepath.Dir(project)
		if _, err := relPathWithin(contextRoot, dir); err != nil {
			return nil, err
		}
		dirs[dir] = struct{}{}
	}
	return sortedKeys(dirs), nil
}

func sortedKeys(values map[string]struct{}) []string {
	keys := make([]string, 0, len(values))
	for value := range values {
		keys = append(keys, value)
	}
	sort.Strings(keys)
	return keys
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

func relPathWithin(root, path string) (string, error) {
	rel, err := filepath.Rel(root, path)
	if err != nil {
		return "", fmt.Errorf("%w: %w", errGeneratedDockerfilePathResolution, err)
	}
	if rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) || filepath.IsAbs(rel) {
		return "", fmt.Errorf("%w: %s", errProjectReferenceOutsideContext, path)
	}
	return filepath.ToSlash(rel), nil
}

func pathWithin(root, path string) bool {
	_, err := relPathWithin(root, path)
	return err == nil
}
