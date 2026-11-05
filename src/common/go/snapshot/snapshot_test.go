package snapshot

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// recorder stands in for testing.T so that a test can check failures that would otherwise fail it.
type recorder struct {
	name   string
	errors []string
	fatals []string
}

func (*recorder) Helper()                     {}
func (r *recorder) Name() string              { return r.name }
func (*recorder) Logf(string, ...any)         {}
func (r *recorder) Errorf(f string, a ...any) { r.errors = append(r.errors, fmt.Sprintf(f, a...)) }
func (r *recorder) Fatalf(f string, a ...any) { r.fatals = append(r.fatals, fmt.Sprintf(f, a...)) }

func (r *recorder) failed() bool {
	return len(r.errors) > 0 || len(r.fatals) > 0
}

// inTempDir runs the test in an empty working directory with CI set as ci says.
func inTempDir(t *testing.T, ci bool) string {
	t.Helper()
	directory := t.TempDir()
	t.Chdir(directory)
	if ci {
		t.Setenv("CI", "true")
	} else {
		t.Setenv("CI", "")
	}
	return directory
}

func readSnapshot(t *testing.T, directory, file string) string {
	t.Helper()
	data, err := os.ReadFile(filepath.Join(directory, "_snapshots", file))
	if err != nil {
		t.Fatalf("read snapshot: %v", err)
	}
	return string(data)
}

func writeSnapshot(t *testing.T, directory, file, content string) {
	t.Helper()
	path := filepath.Join(directory, "_snapshots", file)
	if err := os.MkdirAll(filepath.Dir(path), 0o750); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
}

func TestFileName(t *testing.T) {
	tests := []struct {
		testName, name, ext, want string
	}{
		{"TestA", "", "", "TestA.txt"},
		{"TestA", "output", "pdf", "TestA_output.pdf"},
		{"TestA/sub/case_1", "testoutput", "json", "TestA_sub_case_1_testoutput.json"},
	}
	for _, test := range tests {
		got := fileName(&recorder{name: test.testName}, test.name, test.ext)
		if got != test.want {
			t.Errorf("fileName(%q, %q, %q) = %q, want %q", test.testName, test.name, test.ext, got, test.want)
		}
	}
}

func TestMatchWritesMissingSnapshotOutsideCI(t *testing.T) {
	directory := inTempDir(t, false)
	r := &recorder{name: "TestA/sub"}

	Match(r, []byte("hello\n"), "out", "txt")

	if r.failed() {
		t.Fatalf("Match failed: %v %v", r.errors, r.fatals)
	}
	if got := readSnapshot(t, directory, "TestA_sub_out.txt"); got != "hello\n" {
		t.Errorf("snapshot = %q, want %q", got, "hello\n")
	}
}

func TestMatchUpdatesDifferentSnapshotOutsideCI(t *testing.T) {
	directory := inTempDir(t, false)
	writeSnapshot(t, directory, "TestA.txt", "old\n")
	r := &recorder{name: "TestA"}

	Match(r, []byte("new\n"), "", "")

	if r.failed() {
		t.Fatalf("Match failed: %v %v", r.errors, r.fatals)
	}
	if got := readSnapshot(t, directory, "TestA.txt"); got != "new\n" {
		t.Errorf("snapshot = %q, want %q", got, "new\n")
	}
}

func TestMatchPassesEqualSnapshotInCI(t *testing.T) {
	directory := inTempDir(t, true)
	writeSnapshot(t, directory, "TestA.txt", "same\n")
	r := &recorder{name: "TestA"}

	Match(r, []byte("same\n"), "", "")

	if r.failed() {
		t.Fatalf("Match failed: %v %v", r.errors, r.fatals)
	}
}

func TestMatchFailsOnMissingSnapshotInCI(t *testing.T) {
	directory := inTempDir(t, true)
	r := &recorder{name: "TestA"}

	Match(r, []byte("hello\n"), "", "")

	if len(r.errors) != 1 || !strings.Contains(r.errors[0], "is missing") {
		t.Errorf("errors = %v, want one about the missing snapshot", r.errors)
	}
	if _, err := os.Stat(filepath.Join(directory, "_snapshots")); !os.IsNotExist(err) {
		t.Errorf("snapshot directory exists after a CI run, stat error = %v", err)
	}
}

func TestMatchFailsOnDifferentSnapshotInCI(t *testing.T) {
	directory := inTempDir(t, true)
	writeSnapshot(t, directory, "TestA.txt", "line 1\nold\n")
	r := &recorder{name: "TestA"}

	Match(r, []byte("line 1\nnew\n"), "", "")

	if len(r.errors) != 1 || !strings.Contains(r.errors[0], `line 2`) ||
		!strings.Contains(r.errors[0], `"old\n"`) || !strings.Contains(r.errors[0], `"new\n"`) {
		t.Errorf("errors = %v, want one naming line 2 with both versions", r.errors)
	}
	if got := readSnapshot(t, directory, "TestA.txt"); got != "line 1\nold\n" {
		t.Errorf("snapshot = %q, want it unchanged", got)
	}
}

func TestMatchFileRejectsNonLocalPath(t *testing.T) {
	inTempDir(t, false)
	for _, file := range []string{"../escape.txt", "/escape.txt", "nested/../TestA.txt", `nested\file.txt`, ".", ""} {
		r := &recorder{name: "TestA"}
		MatchFile(r, []byte("x"), file)
		if len(r.fatals) != 1 {
			t.Errorf("MatchFile(%q) fatals = %v, want one", file, r.fatals)
		}
	}
}

func TestMatchRejectsPathComponents(t *testing.T) {
	inTempDir(t, false)
	for _, test := range []struct{ name, ext string }{
		{"/../TestOther", "json"},
		{"", "json/../TestOther.json"},
	} {
		r := &recorder{name: "TestA"}
		Match(r, []byte("x"), test.name, test.ext)
		if len(r.fatals) != 1 {
			t.Errorf("Match(%q, %q) fatals = %v, want one", test.name, test.ext, r.fatals)
		}
	}
}

func TestMatchJSONFormatsDeterministically(t *testing.T) {
	directory := inTempDir(t, false)
	r := &recorder{name: "TestA"}
	type value struct {
		Zebra  string `json:"zebra"`
		Markup string `json:"markup"`
		Apple  int64  `json:"apple"`
	}

	MatchJSON(r, value{Zebra: "z", Apple: 9007199254740993, Markup: "<a & b>"}, "struct")
	MatchJSON(r, []byte(`{"b":[1,2],"a":{}}`), "bytes")
	MatchJSON(r, json.RawMessage(`[]`), "raw")

	if r.failed() {
		t.Fatalf("MatchJSON failed: %v %v", r.errors, r.fatals)
	}
	want := "{\n  \"apple\": 9007199254740993,\n  \"markup\": \"<a & b>\",\n  \"zebra\": \"z\"\n}\n"
	if got := readSnapshot(t, directory, "TestA_struct.json"); got != want {
		t.Errorf("struct snapshot = %q, want %q", got, want)
	}
	want = "{\n  \"a\": {},\n  \"b\": [\n    1,\n    2\n  ]\n}\n"
	if got := readSnapshot(t, directory, "TestA_bytes.json"); got != want {
		t.Errorf("bytes snapshot = %q, want %q", got, want)
	}
	if got := readSnapshot(t, directory, "TestA_raw.json"); got != "[]\n" {
		t.Errorf("raw snapshot = %q, want %q", got, "[]\n")
	}
}

func TestJSONRejectsInvalidJSON(t *testing.T) {
	for _, input := range []string{`{"a":`, `{} {}`} {
		r := &recorder{name: "TestA"}
		JSON(r, []byte(input))
		if len(r.fatals) != 1 {
			t.Errorf("JSON(%q) fatals = %v, want one", input, r.fatals)
		}
	}
}

func TestFirstDifference(t *testing.T) {
	for _, test := range []struct {
		snapshot, actual, want string
	}{
		{"same", "same", ""},
		{"line 1\nold\n", "line 1\nnew\n", "line 2"},
		{"same", "same\n", "line 1"},
		{strings.Repeat("x", 200) + "old", strings.Repeat("x", 200) + "new", "line 1, byte 201"},
	} {
		got := firstDifference([]byte(test.snapshot), []byte(test.actual))
		if test.want == "" && got != "" || test.want != "" && !strings.Contains(got, test.want) {
			t.Errorf("firstDifference = %q, want %q", got, test.want)
		}
		if strings.Contains(test.snapshot, "old") && (!strings.Contains(got, "old") || !strings.Contains(got, "new")) {
			t.Errorf("firstDifference = %q, want both changed values", got)
		}
	}
}
