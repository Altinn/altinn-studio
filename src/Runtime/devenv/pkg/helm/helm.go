// Package helm pushes Helm charts to the local runtime fixture's OCI registry, in the format `helm package`
// and `helm push` produce.
package helm

import (
	"archive/tar"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path"
	"regexp"
	"slices"
	"strings"
	"time"

	"sigs.k8s.io/yaml"

	"altinn.studio/devenv/pkg/oci"
)

const chartFileMode = 0o644

var (
	errInvalid      = errors.New("invalid chart")
	errUnsupported  = errors.New("unsupported chart")
	dependencyFiles = []string{"Chart.lock", "requirements.yaml", "requirements.lock"}
	tagPattern      = regexp.MustCompile(`^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,127}$`)
)

// metadata is the subset of Helm's chart.Metadata that charts/deployment uses, in Helm's field order so the
// config JSON matches Helm's. Dependencies are only read to reject them.
type metadata struct {
	Name         string `json:"name,omitempty"`
	Version      string `json:"version,omitempty"`
	Description  string `json:"description,omitempty"`
	APIVersion   string `json:"apiVersion,omitempty"`
	Dependencies []any  `json:"dependencies,omitempty"`
}

// Client pushes Helm charts to an OCI registry.
type Client struct {
	registry *oci.Client
}

// NewClient creates a Helm client for the local runtime fixture's plain-HTTP registry.
func NewClient() *Client {
	return &Client{registry: oci.NewClient()}
}

// PushChart packages the chart directory chartPath like `helm package` and pushes it to ociRef/<name>:<version>
// like `helm push`. ociRef is a registry without repository, such as oci://localhost:5001.
//
// It supports what charts/deployment uses. Charts with dependencies and .helmignore rules other than globs of
// base names, optionally ending in / to match only directories, are rejected. Files are under <name>/ with
// mode 0644 and no times, and Chart.yaml is kept as it is on disk.
func (c *Client) PushChart(chartPath, ociRef string) error {
	meta, err := readMetadata(chartPath)
	if err != nil {
		return err
	}
	archive, err := archiveChart(chartPath, meta.Name)
	if err != nil {
		return err
	}
	config, err := json.Marshal(meta)
	if err != nil {
		return fmt.Errorf("encode chart config: %w", err)
	}
	annotations := map[string]string{
		"org.opencontainers.image.title":   meta.Name,
		"org.opencontainers.image.version": meta.Version,
		"org.opencontainers.image.created": time.Now().UTC().Format(time.RFC3339),
	}
	if strings.TrimSpace(meta.Description) != "" {
		annotations["org.opencontainers.image.description"] = meta.Description
	}
	ref := strings.TrimSuffix(ociRef, "/") + "/" + meta.Name + ":" + meta.tag()
	err = c.registry.Push(
		context.Background(),
		ref,
		oci.Blob{MediaType: "application/vnd.cncf.helm.config.v1+json", Data: config},
		oci.Blob{MediaType: "application/vnd.cncf.helm.chart.content.v1.tar+gzip", Data: archive},
		annotations,
	)
	if err != nil {
		return fmt.Errorf("push chart to %s: %w", ref, err)
	}
	return nil
}

// tag returns the chart's OCI tag. Tags cannot contain +, so Helm replaces it in semver build metadata.
func (m metadata) tag() string {
	return strings.ReplaceAll(m.Version, "+", "_")
}

func readMetadata(chartPath string) (metadata, error) {
	var meta metadata
	data, err := fs.ReadFile(os.DirFS(chartPath), "Chart.yaml")
	if err == nil {
		err = yaml.Unmarshal(data, &meta)
	}
	switch {
	case err != nil:
		return meta, fmt.Errorf("load chart from %s: %w", chartPath, err)
	case meta.Name == "" || !tagPattern.MatchString(meta.tag()):
		return meta, fmt.Errorf("%w: %s needs a name and a version that is a valid tag", errInvalid, chartPath)
	case len(meta.Dependencies) > 0:
		return meta, fmt.Errorf("%w: %s: dependencies are not supported", errUnsupported, chartPath)
	case meta.APIVersion == "":
		meta.APIVersion = "v1"
	}
	return meta, nil
}

func archiveChart(chartPath, name string) ([]byte, error) {
	ignored, err := readIgnoreRules(chartPath)
	if err != nil {
		return nil, err
	}
	archive, err := oci.TarGz(chartPath, func(rel string, info fs.FileInfo) (*tar.Header, error) {
		skip := rel == "." || ignored(rel, info.IsDir())
		switch {
		case skip && info.IsDir() && rel != ".":
			return nil, fs.SkipDir
		case skip || info.IsDir():
			return nil, nil //nolint:nilnil // nil leaves the entry out.
		case strings.HasPrefix(rel, "charts/") || slices.Contains(dependencyFiles, rel):
			return nil, fmt.Errorf("%w: %s: dependencies are not supported", errUnsupported, rel)
		case !info.Mode().IsRegular():
			return nil, fmt.Errorf("%w: %s is not a regular file", errUnsupported, rel)
		}
		return &tar.Header{Name: name + "/" + rel, Typeflag: tar.TypeReg, Mode: chartFileMode, Size: info.Size()}, nil
	})
	if err != nil {
		return nil, fmt.Errorf("package chart %s: %w", chartPath, err)
	}
	return archive, nil
}

// readIgnoreRules reads .helmignore, adding Helm's default rule that ignores dotfiles in templates/.
func readIgnoreRules(chartPath string) (func(rel string, isDir bool) bool, error) {
	data, err := fs.ReadFile(os.DirFS(chartPath), ".helmignore")
	if err != nil && !errors.Is(err, fs.ErrNotExist) {
		return nil, fmt.Errorf("read %s/.helmignore: %w", chartPath, err)
	}
	var rules []string
	for line := range strings.Lines(string(data)) {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if strings.HasPrefix(line, "!") || strings.Contains(line, "**") || strings.Contains(line[:len(line)-1], "/") {
			return nil, fmt.Errorf("%w: .helmignore rule %q: only base name globs are supported", errUnsupported, line)
		}
		rules = append(rules, line)
	}
	return func(rel string, isDir bool) bool {
		for _, rule := range rules {
			pattern, dirOnly := strings.CutSuffix(rule, "/")
			matched, err := path.Match(pattern, path.Base(rel))
			if err == nil && matched && (isDir || !dirOnly) {
				return true
			}
		}
		matched, err := path.Match("templates/.?*", rel)
		return err == nil && matched
	}, nil
}
