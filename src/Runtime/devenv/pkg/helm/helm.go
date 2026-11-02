// Package helm packages Helm charts and pushes them to the local runtime fixture's OCI registry, in the format
// `helm package` and `helm push` produce.
package helm

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"maps"
	"os"
	"path"
	"path/filepath"
	"slices"
	"strings"
	"time"

	"sigs.k8s.io/yaml"

	"altinn.studio/devenv/pkg/oci"
)

// Media types of Helm charts in OCI registries.
const (
	ConfigMediaType = "application/vnd.cncf.helm.config.v1+json"
	ChartMediaType  = "application/vnd.cncf.helm.chart.content.v1.tar+gzip"
)

const (
	chartFileName  = "Chart.yaml"
	ignoreFileName = ".helmignore"
	chartFileMode  = 0o644
	defaultVersion = "v1"

	annotationTitle   = "org.opencontainers.image.title"
	annotationVersion = "org.opencontainers.image.version"
)

var (
	errInvalidChart     = errors.New("invalid chart")
	errUnsupportedChart = errors.New("unsupported chart")
)

// metadata is Helm's chart.Metadata, whose JSON is the config blob that Helm decodes on pull.
type metadata struct {
	Name         string            `json:"name,omitempty"`
	Home         string            `json:"home,omitempty"`
	Sources      []string          `json:"sources,omitempty"`
	Version      string            `json:"version,omitempty"`
	Description  string            `json:"description,omitempty"`
	Keywords     []string          `json:"keywords,omitempty"`
	Maintainers  []maintainer      `json:"maintainers,omitempty"`
	Icon         string            `json:"icon,omitempty"`
	APIVersion   string            `json:"apiVersion,omitempty"`
	Condition    string            `json:"condition,omitempty"`
	Tags         string            `json:"tags,omitempty"`
	AppVersion   string            `json:"appVersion,omitempty"`
	Annotations  map[string]string `json:"annotations,omitempty"`
	KubeVersion  string            `json:"kubeVersion,omitempty"`
	Type         string            `json:"type,omitempty"`
	Dependencies []any             `json:"dependencies,omitempty"`
	Deprecated   bool              `json:"deprecated,omitempty"`
}

type maintainer struct {
	Name  string `json:"name,omitempty"`
	Email string `json:"email,omitempty"`
	URL   string `json:"url,omitempty"`
}

// Client packages Helm charts and pushes them to an OCI registry.
type Client struct {
	registry *oci.Client
}

// NewClient creates a Helm client for the local runtime fixture's plain-HTTP registry.
func NewClient() *Client {
	return &Client{registry: oci.NewClient()}
}

// PackageChart packages the chart directory chartPath into destDir as <name>-<version>.tgz, like
// `helm package`, and returns the file's path.
//
// It supports charts without dependencies or symlinks, and .helmignore without negation (!). Like Helm, it
// rejects **. The archive has the files under <name>/ with mode 0644 and no times, and Chart.yaml as it is
// on disk rather than re-encoded.
func (c *Client) PackageChart(chartPath, destDir string) (string, error) {
	chart, err := os.OpenRoot(chartPath)
	if err != nil {
		return "", fmt.Errorf("open chart %s: %w", chartPath, err)
	}
	defer closeRoot(chart)
	data, err := chart.ReadFile(chartFileName)
	if err != nil {
		return "", fmt.Errorf("load chart from %s: %w", chartPath, err)
	}
	meta, err := parseMetadata(data)
	if err != nil {
		return "", fmt.Errorf("load chart from %s: %w", chartPath, err)
	}
	files, err := chartFiles(chart)
	if err != nil {
		return "", fmt.Errorf("load chart from %s: %w", chartPath, err)
	}
	archive, err := archiveChart(chart, meta.Name, files)
	if err != nil {
		return "", fmt.Errorf("package chart %s: %w", meta.Name, err)
	}
	out := filepath.Join(destDir, meta.Name+"-"+meta.Version+".tgz")
	if err := os.WriteFile(out, archive, chartFileMode); err != nil {
		return "", fmt.Errorf("write chart package: %w", err)
	}
	return out, nil
}

// PushChart pushes a packaged chart to ociRef/<name>:<version>, like `helm push`. ociRef is a registry
// reference without repository, such as oci://localhost:5001.
func (c *Client) PushChart(chartFile, ociRef string) error {
	//nolint:gosec // G304: chartFile is the package PackageChart wrote.
	archive, err := os.ReadFile(chartFile)
	if err != nil {
		return fmt.Errorf("read chart file %s: %w", chartFile, err)
	}
	meta, err := metadataFromArchive(archive)
	if err != nil {
		return fmt.Errorf("load chart archive %s: %w", chartFile, err)
	}
	config, err := json.Marshal(meta)
	if err != nil {
		return fmt.Errorf("encode chart config: %w", err)
	}
	// OCI tags cannot contain +, so Helm replaces it in semver build metadata.
	tag := strings.ReplaceAll(meta.Version, "+", "_")
	ref := strings.TrimSuffix(ociRef, "/") + "/" + meta.Name + ":" + tag
	err = c.registry.Push(
		context.Background(),
		ref,
		oci.Blob{MediaType: ConfigMediaType, Data: config},
		oci.Blob{MediaType: ChartMediaType, Data: archive},
		manifestAnnotations(meta, time.Now()),
	)
	if err != nil {
		return fmt.Errorf("push chart to %s: %w", ref, err)
	}
	return nil
}

// manifestAnnotations returns the annotations `helm push` sets: OCI annotations from the chart's metadata,
// overridden by the chart's own annotations except for the title and version.
func manifestAnnotations(meta metadata, created time.Time) map[string]string {
	authors := make([]string, 0, len(meta.Maintainers))
	for _, m := range meta.Maintainers {
		author := m.Name
		if m.Email != "" {
			author += " (" + m.Email + ")"
		}
		authors = append(authors, author)
	}
	source := ""
	if len(meta.Sources) > 0 {
		source = meta.Sources[0]
	}
	annotations := map[string]string{}
	for key, value := range map[string]string{
		"org.opencontainers.image.description": meta.Description,
		"org.opencontainers.image.url":         meta.Home,
		oci.AnnotationCreated:                  created.UTC().Format(time.RFC3339),
		oci.AnnotationSource:                   source,
		"org.opencontainers.image.authors":     strings.Join(authors, ", "),
	} {
		if strings.TrimSpace(value) != "" {
			annotations[key] = value
		}
	}
	maps.Copy(annotations, meta.Annotations)
	annotations[annotationTitle] = meta.Name
	annotations[annotationVersion] = meta.Version
	return annotations
}

func parseMetadata(data []byte) (metadata, error) {
	var meta metadata
	if err := yaml.Unmarshal(data, &meta); err != nil {
		return meta, fmt.Errorf("parse %s: %w", chartFileName, err)
	}
	if meta.APIVersion == "" {
		meta.APIVersion = defaultVersion
	}
	if meta.Name == "" || meta.Version == "" || path.Base(meta.Name) != meta.Name {
		return meta, fmt.Errorf("%w: %s needs a name without slashes and a version", errInvalidChart, chartFileName)
	}
	if len(meta.Dependencies) > 0 {
		return meta, fmt.Errorf("%w: dependencies are not supported", errUnsupportedChart)
	}
	return meta, nil
}

// chartFiles lists the chart's regular files that .helmignore keeps, relative to the chart, with Chart.yaml
// first as in `helm package`.
func chartFiles(chart *os.Root) ([]string, error) {
	ignored, err := readIgnoreRules(chart)
	if err != nil {
		return nil, err
	}
	files := []string{chartFileName}
	err = fs.WalkDir(chart.FS(), ".", func(rel string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if rel == "." {
			return nil
		}
		skip := ignored(rel, entry.IsDir())
		switch {
		case skip && entry.IsDir():
			return fs.SkipDir
		case skip || entry.IsDir() || rel == chartFileName:
			return nil
		case strings.HasPrefix(rel, "charts/") || rel == "requirements.yaml":
			return fmt.Errorf("%w: %s: dependencies are not supported", errUnsupportedChart, rel)
		case !entry.Type().IsRegular():
			return fmt.Errorf("%w: %s is not a regular file", errUnsupportedChart, rel)
		}
		files = append(files, rel)
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("list chart files: %w", err)
	}
	return files, nil
}

func archiveChart(chart *os.Root, name string, files []string) ([]byte, error) {
	var buf bytes.Buffer
	gz := gzip.NewWriter(&buf)
	tw := tar.NewWriter(gz)
	for _, rel := range files {
		data, err := chart.ReadFile(rel)
		if err != nil {
			return nil, fmt.Errorf("read %s: %w", rel, err)
		}
		header := &tar.Header{
			Name:     name + "/" + rel,
			Typeflag: tar.TypeReg,
			Mode:     chartFileMode,
			Size:     int64(len(data)),
		}
		if err := tw.WriteHeader(header); err != nil {
			return nil, fmt.Errorf("write tar header for %s: %w", rel, err)
		}
		if _, err := tw.Write(data); err != nil {
			return nil, fmt.Errorf("archive %s: %w", rel, err)
		}
	}
	if err := tw.Close(); err != nil {
		return nil, fmt.Errorf("close tar: %w", err)
	}
	if err := gz.Close(); err != nil {
		return nil, fmt.Errorf("close gzip: %w", err)
	}
	return buf.Bytes(), nil
}

func metadataFromArchive(archive []byte) (metadata, error) {
	gz, err := gzip.NewReader(bytes.NewReader(archive))
	if err != nil {
		return metadata{}, fmt.Errorf("read gzip: %w", err)
	}
	tr := tar.NewReader(gz)
	for {
		header, err := tr.Next()
		if errors.Is(err, io.EOF) {
			return metadata{}, fmt.Errorf("%w: no <name>/%s", errInvalidChart, chartFileName)
		}
		if err != nil {
			return metadata{}, fmt.Errorf("read tar: %w", err)
		}
		dir, file := path.Split(header.Name)
		if file != chartFileName || strings.Count(dir, "/") != 1 {
			continue
		}
		data, err := io.ReadAll(tr)
		if err != nil {
			return metadata{}, fmt.Errorf("read %s: %w", header.Name, err)
		}
		return parseMetadata(data)
	}
}

// ignoreRule is one .helmignore line, matched the way Helm's pkg/ignore does without negation.
type ignoreRule struct {
	pattern  string
	dirOnly  bool
	wholeRel bool
}

// readIgnoreRules reads .helmignore, adding Helm's default rule that ignores dotfiles in templates/.
func readIgnoreRules(chart *os.Root) (func(rel string, isDir bool) bool, error) {
	lines := []string{"templates/.?*"}
	data, err := chart.ReadFile(ignoreFileName)
	switch {
	case err == nil:
		lines = append(lines, strings.Split(string(data), "\n")...)
	case !errors.Is(err, os.ErrNotExist):
		return nil, fmt.Errorf("read %s: %w", ignoreFileName, err)
	}
	rules := make([]ignoreRule, 0, len(lines))
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if strings.HasPrefix(line, "!") || strings.Contains(line, "**") {
			return nil, fmt.Errorf(
				"%w: %s rule %q: ! and ** are not supported",
				errUnsupportedChart,
				ignoreFileName,
				line,
			)
		}
		if _, err := path.Match(line, "abc"); err != nil {
			return nil, fmt.Errorf("%w: %s rule %q: %w", errInvalidChart, ignoreFileName, line, err)
		}
		rule := ignoreRule{pattern: strings.TrimSuffix(line, "/"), dirOnly: strings.HasSuffix(line, "/")}
		rule.wholeRel = strings.Contains(rule.pattern, "/")
		rule.pattern = strings.TrimPrefix(rule.pattern, "/")
		rules = append(rules, rule)
	}
	return func(rel string, isDir bool) bool {
		return slices.ContainsFunc(rules, func(rule ignoreRule) bool {
			if rule.dirOnly && !isDir {
				return false
			}
			name := rel
			if !rule.wholeRel {
				name = path.Base(rel)
			}
			matched, err := path.Match(rule.pattern, name)
			return err == nil && matched
		})
	}, nil
}

func closeRoot(root *os.Root) {
	if err := root.Close(); err != nil {
		return
	}
}
