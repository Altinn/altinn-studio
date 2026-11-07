// Package snapshot compares test output with files under _snapshots in the test's working directory.
// It is for tests only, so production code must not import it.
//
// Outside CI, a missing or different snapshot is written and the test passes, so a developer reviews the
// change in git diff. In CI, which sets the CI environment variable, a missing or different snapshot fails
// the test and the file stays as it is.
package snapshot

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

const (
	// directory, relative to the test's working directory, holds the snapshots.
	directory        = "_snapshots"
	defaultExtension = "txt"
	// maxDifferenceBytes keeps a failure readable when a snapshot has long lines, as a PDF does.
	maxDifferenceBytes = 200
)

// TB is the part of testing.TB the package uses, which Ginkgo's GinkgoT also provides.
type TB interface {
	Helper()
	Name() string
	Logf(format string, args ...any)
	Errorf(format string, args ...any)
	Fatalf(format string, args ...any)
}

// Match compares data with the snapshot named after the test: <test>_<name>.<ext>, where <test> is the
// test name with each / replaced by _. An empty name leaves out _<name>, and an empty ext means txt.
// name and ext must not contain path separators.
func Match(t TB, data []byte, name, ext string) {
	t.Helper()
	MatchFile(t, data, fileName(t, name, ext))
}

// MatchJSON compares value, formatted by JSON, with the snapshot <test>_<name>.json.
func MatchJSON(t TB, value any, name string) {
	t.Helper()
	Match(t, JSON(t, value), name, "json")
}

func fileName(t TB, name, ext string) string {
	file := strings.ReplaceAll(t.Name(), "/", "_")
	if name != "" {
		file += "_" + name
	}
	if ext == "" {
		ext = defaultExtension
	}
	return file + "." + ext
}

// MatchFile compares data with the snapshot file, a base name without path separators. Use it when
// the test name does not make a good file name, as with Ginkgo specs.
func MatchFile(t TB, data []byte, file string) {
	t.Helper()
	if !filepath.IsLocal(file) || file == "." || strings.ContainsAny(file, `/\`) {
		t.Fatalf("snapshot file %q is not a local file name without path separators", file)
		return
	}
	workingDirectory, err := os.OpenRoot(".")
	if err != nil {
		t.Fatalf("open working directory: %v", err)
		return
	}
	defer func() {
		if closeErr := workingDirectory.Close(); closeErr != nil {
			t.Errorf("close working directory: %v", closeErr)
		}
	}()
	path := filepath.Join(directory, file)

	existing, err := workingDirectory.ReadFile(path)
	switch {
	case err == nil && bytes.Equal(existing, data):
		return
	case err != nil && !errors.Is(err, os.ErrNotExist):
		t.Fatalf("read snapshot %s: %v", path, err)
		return
	case isCI():
		if err != nil {
			t.Errorf("snapshot %s is missing. Run the test outside CI to write it, and commit it", path)
		} else {
			t.Errorf("snapshot %s differs. Run the test outside CI to update it, and review the change.\n%s",
				path, firstDifference(existing, data))
		}
		return
	}

	if err := workingDirectory.MkdirAll(filepath.Dir(path), 0o750); err != nil {
		t.Fatalf("create snapshot directory: %v", err)
		return
	}
	if err := workingDirectory.WriteFile(path, data, 0o600); err != nil {
		t.Fatalf("write snapshot %s: %v", path, err)
		return
	}
	t.Logf("wrote snapshot %s", path)
}

// JSON formats value as indented JSON with sorted object keys and a trailing newline. A []byte or
// json.RawMessage is taken as JSON text and reformatted. Any other value is marshaled with encoding/json.
func JSON(t TB, value any) []byte {
	t.Helper()
	var encoded []byte
	switch typed := value.(type) {
	case []byte:
		encoded = typed
	case json.RawMessage:
		encoded = typed
	default:
		var err error
		if encoded, err = json.Marshal(value); err != nil {
			t.Fatalf("marshal snapshot value: %v", err)
			return nil
		}
	}

	// Decoding into any sorts object keys when encoded again, and json.Number keeps numbers as written.
	decoder := json.NewDecoder(bytes.NewReader(encoded))
	decoder.UseNumber()
	var tree any
	if err := decoder.Decode(&tree); err != nil {
		t.Fatalf("parse snapshot JSON: %v", err)
		return nil
	}
	if _, err := decoder.Token(); !errors.Is(err, io.EOF) {
		t.Fatalf("parse snapshot JSON: unexpected data after the first value")
		return nil
	}

	var formatted bytes.Buffer
	encoder := json.NewEncoder(&formatted)
	encoder.SetEscapeHTML(false)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(tree); err != nil {
		t.Fatalf("format snapshot JSON: %v", err)
		return nil
	}
	return formatted.Bytes()
}

// isCI reports whether the test runs in CI. GitHub Actions sets CI for every step.
func isCI() bool {
	return os.Getenv("CI") != ""
}

func firstDifference(snapshot, actual []byte) string {
	index := 0
	for index < min(len(snapshot), len(actual)) && snapshot[index] == actual[index] {
		index++
	}
	if index == len(snapshot) && index == len(actual) {
		return ""
	}
	return fmt.Sprintf(
		"First difference, at line %d, byte %d (up to %d bytes from the difference):\n  snapshot: %q\n  actual:   %q",
		bytes.Count(snapshot[:index], []byte{'\n'})+1,
		index+1,
		maxDifferenceBytes,
		snapshot[index:min(index+maxDifferenceBytes, len(snapshot))],
		actual[index:min(index+maxDifferenceBytes, len(actual))],
	)
}
