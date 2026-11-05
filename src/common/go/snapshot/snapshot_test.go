package snapshot

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
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

func inTempDir(t *testing.T, ci string) {
	t.Helper()
	t.Chdir(t.TempDir())
	t.Setenv("CI", ci)
}

func readSnapshot(t *testing.T, file string) string {
	t.Helper()
	data, err := os.ReadFile(filepath.Join("_snapshots", file))
	if err != nil {
		t.Fatalf("read snapshot: %v", err)
	}
	return string(data)
}

func writeSnapshot(t *testing.T, file, content string) {
	t.Helper()
	path := filepath.Join("_snapshots", file)
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
		{"controller should reconcile / client", "", "json", "controller should reconcile _ client.json"},
	}
	for _, test := range tests {
		got := fileName(&recorder{name: test.testName}, test.name, test.ext)
		if got != test.want {
			t.Errorf("fileName(%q, %q, %q) = %q, want %q", test.testName, test.name, test.ext, got, test.want)
		}
	}
}

func TestMatch(t *testing.T) {
	for _, test := range []struct{ name, ci, before, data, wantError string }{
		{"create", "", "", "hello\n", ""},
		{"update", "", "old\n", "new", ""},
		{"binary", "", "", "\x00\xff", ""},
		{"equal", "true", "same\n", "same\n", ""},
		{"missing", "false", "", "hello\n", "is missing"},
		{"changed", "true", "old\n", "new\n", "differs"},
		{"newline", "true", "same\n", "same", "differs"},
	} {
		t.Run(test.name, func(t *testing.T) {
			inTempDir(t, test.ci)
			const file = "TestA_sub_out.txt"
			if test.before != "" {
				writeSnapshot(t, file, test.before)
			}
			r := &recorder{name: "TestA/sub"}
			Match(r, []byte(test.data), "out", "")
			if test.wantError == "" {
				if r.failed() {
					t.Fatalf("Match failed: %v %v", r.errors, r.fatals)
				}
			} else if len(r.errors) != 1 || !strings.Contains(r.errors[0], test.wantError) ||
				!strings.Contains(r.errors[0], filepath.Join("_snapshots", file)) {
				t.Errorf("errors = %v, want %q and snapshot path", r.errors, test.wantError)
			}
			if test.ci != "" && test.before == "" {
				if _, err := os.Stat("_snapshots"); !os.IsNotExist(err) {
					t.Errorf("snapshot directory exists after a CI run, stat error = %v", err)
				}
				return
			}
			want := test.data
			if test.ci != "" {
				want = test.before
			}
			if got := readSnapshot(t, file); got != want {
				t.Errorf("snapshot = %q, want %q", got, want)
			}
		})
	}
}

func TestMatchFileRejectsNonLocalPath(t *testing.T) {
	inTempDir(t, "")
	for _, file := range []string{"../escape.txt", "/escape.txt", "nested/../TestA.txt", `nested\file.txt`, ".", ""} {
		r := &recorder{name: "TestA"}
		MatchFile(r, []byte("x"), file)
		if len(r.fatals) != 1 {
			t.Errorf("MatchFile(%q) fatals = %v, want one", file, r.fatals)
		}
	}
}

func TestMatchRejectsPathComponents(t *testing.T) {
	inTempDir(t, "")
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

func TestMatchConcurrent(t *testing.T) {
	inTempDir(t, "")
	var group sync.WaitGroup
	for index := range 8 {
		group.Go(func() {
			r := &recorder{name: fmt.Sprintf("TestA/%d", index)}
			data := fmt.Sprintf("snapshot %d\n", index)
			Match(r, []byte(data), "", "")
			if r.failed() {
				t.Errorf("Match failed: %v %v", r.errors, r.fatals)
			}
			if got := readSnapshot(t, fileName(r, "", "")); got != data {
				t.Errorf("snapshot = %q, want %q", got, data)
			}
		})
	}
	group.Wait()
}

func TestMatchJSONFormatsDeterministically(t *testing.T) {
	inTempDir(t, "")
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
	if got := readSnapshot(t, "TestA_struct.json"); got != want {
		t.Errorf("struct snapshot = %q, want %q", got, want)
	}
	want = "{\n  \"a\": {},\n  \"b\": [\n    1,\n    2\n  ]\n}\n"
	if got := readSnapshot(t, "TestA_bytes.json"); got != want {
		t.Errorf("bytes snapshot = %q, want %q", got, want)
	}
	if got := readSnapshot(t, "TestA_raw.json"); got != "[]\n" {
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
