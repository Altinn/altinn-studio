package manifest

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/fs"
	"maps"
	"path"
	"slices"
	"strings"
)

// A container's files are files and folders that ship with the manifest, kept in folders beside manifest.json, which
// the runtimes mount read-only (each runtime writes them out first). A source names a path relative to the manifest's
// directory inside one of those folders: a file (monitoring/otel-collector.yaml) or a folder
// (monitoring/grafana-dashboards). The files at the top level (the manifest itself, its README and code) are never
// sources.

// shippedFiles lists the regular files in the folders of fsys, slash-separated and in lexical order. The files at its
// top level are left out. A nil fsys ships none.
func shippedFiles(fsys fs.FS) ([]string, error) {
	if fsys == nil {
		return nil, nil
	}
	var out []string
	err := fs.WalkDir(fsys, ".", func(name string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.Type().IsRegular() && strings.Contains(name, "/") {
			out = append(out, name)
		}
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("list the manifest's files: %w", err)
	}
	return out, nil
}

// ShippedFiles lists the files that ship with the manifest, relative to its directory, slash-separated and in lexical
// order: every file in the folders beside it. A runtime writes them out before it mounts a container's Files.
func (m *Manifest) ShippedFiles() []string {
	return slices.Clone(m.shipped)
}

// ReadFile returns the content of a file ShippedFiles lists.
func (m *Manifest) ReadFile(name string) ([]byte, error) {
	if !slices.Contains(m.shipped, name) {
		return nil, fmt.Errorf("%w: %s", errNoFile, name)
	}
	data, err := fs.ReadFile(m.files, name)
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", name, err)
	}
	return data, nil
}

// ships reports whether source is a shipped file or a folder holding one.
func (m *Manifest) ships(source string) bool {
	for _, name := range m.shipped {
		if name == source || strings.HasPrefix(name, source+"/") {
			return true
		}
	}
	return false
}

// checkFiles checks a container's files: each container path absolute and clean, and not a volume's path too. Each
// source a clean relative path without "..", and shipped with the manifest.
func (m *Manifest) checkFiles(c Container) error {
	volumeTargets := map[string]bool{}
	for _, target := range c.Volumes {
		volumeTargets[target] = true
	}
	for _, target := range slices.Sorted(maps.Keys(c.Files)) {
		source := c.Files[target]
		if target == "/" || !strings.HasPrefix(target, "/") || path.Clean(target) != target {
			return fmt.Errorf("%w: files: container path %q is not an absolute, clean path", errValue, target)
		}
		if volumeTargets[target] {
			return fmt.Errorf("%w files: container path %q is a volume's too", errDuplicate, target)
		}
		if !isSource(source) {
			return fmt.Errorf("%w: files: %s: source %q is not a clean relative path", errValue, target, source)
		}
		if !m.ships(source) {
			return fmt.Errorf("files: %s: %w: %q", target, errNoFile, source)
		}
	}
	return nil
}

// isSource reports whether source is a clean, slash-separated path relative to the manifest's directory that stays in
// it: not absolute, no "." or ".." segment, no backslash.
func isSource(source string) bool {
	if source == "" || strings.HasPrefix(source, "/") || strings.Contains(source, `\`) || path.Clean(source) != source {
		return false
	}
	for segment := range strings.SplitSeq(source, "/") {
		if segment == "." || segment == ".." {
			return false
		}
	}
	return true
}

// checkFileTargetsUnique refuses a files object that names a container path twice, which encoding/json would resolve
// silently by keeping the last.
func checkFileTargetsUnique(container json.RawMessage) error {
	var fields struct {
		Files json.RawMessage `json:"files"`
	}
	if err := json.Unmarshal(container, &fields); err != nil {
		return fmt.Errorf("decode files: %w", err)
	}
	if len(fields.Files) == 0 {
		return nil
	}
	decoder := json.NewDecoder(bytes.NewReader(fields.Files))
	tok, err := decoder.Token()
	if err != nil {
		return fmt.Errorf("files: %w", err)
	}
	if tok != json.Delim('{') {
		// null. Anything else the strict decode refused already.
		return nil
	}
	seen := map[string]bool{}
	for decoder.More() {
		tok, err := decoder.Token()
		if err != nil {
			return fmt.Errorf("files: %w", err)
		}
		target, ok := tok.(string)
		if !ok {
			return fmt.Errorf("%w: files: key %v", errValue, tok)
		}
		var source json.RawMessage
		if err := decoder.Decode(&source); err != nil {
			return fmt.Errorf("files: %s: %w", target, err)
		}
		if seen[target] {
			return fmt.Errorf("%w files: container path %q", errDuplicate, target)
		}
		seen[target] = true
	}
	return nil
}
