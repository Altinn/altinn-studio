package localbackend

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"slices"
	"strings"
	"testing"
	"time"

	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/devenv/pkg/resource/executor"
)

func TestApplyLocalFileWritesContentAtomically(t *testing.T) {
	t.Parallel()

	path := filepath.Join(t.TempDir(), "nested", "config.yml")
	file := &resource.LocalFile{Name: "config", Path: path, Content: []byte("content"), Mode: 0o600}

	if _, err := New().Apply(t.Context(), executor.BackendContext{GraphID: "test"}, file); err != nil {
		t.Fatalf("Apply() error = %v", err)
	}

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile() error = %v", err)
	}
	if string(data) != "content" {
		t.Fatalf("content = %q", data)
	}
	info, err := os.Stat(path)
	if err != nil {
		t.Fatalf("Stat() error = %v", err)
	}
	if got := info.Mode().Perm(); got != 0o600 {
		t.Fatalf("mode = %o, want 0600", got)
	}
}

func TestApplyGitCheckoutClonesOnlyTheRefShallowly(t *testing.T) {
	t.Parallel()

	upstream := newTestUpstream(t)
	upstream.commit("first")
	upstream.commit("second")
	upstream.branch("other")
	for name, repoURL := range map[string]string{"file URL": upstream.url(), "local path": upstream.bare} {
		t.Run(name, func(t *testing.T) {
			t.Parallel()

			checkout := upstream.checkout(t)
			checkout.RepoURL = repoURL
			applyCheckout(t, checkout)

			assertFileContent(t, filepath.Join(checkout.Path, "file.txt"), "second")
			assertHead(t, checkout.Path, upstream.head())
			if got := runTestGit(t, checkout.Path, "rev-list", "--count", "HEAD"); got != "1" {
				t.Fatalf("commit count = %s, want a shallow clone of 1", got)
			}
			if got := runTestGit(t, checkout.Path, "branch", "--remotes"); got != "origin/main" {
				t.Fatalf("remote branches = %q, want only origin/main", got)
			}
		})
	}
}

func TestApplyGitCheckoutUpdatesToNewUpstreamCommit(t *testing.T) {
	t.Parallel()

	upstream := newTestUpstream(t)
	upstream.commit("first")
	checkout := upstream.checkout(t)
	applyCheckout(t, checkout)

	upstream.commit("second")
	applyCheckout(t, checkout)

	assertFileContent(t, filepath.Join(checkout.Path, "file.txt"), "second")
	assertHead(t, checkout.Path, upstream.head())
}

func TestApplyGitCheckoutResetsToForcePushedBranch(t *testing.T) {
	t.Parallel()

	upstream := newTestUpstream(t)
	upstream.commit("first")
	checkout := upstream.checkout(t)
	applyCheckout(t, checkout)

	runTestGit(t, upstream.working, "checkout", "--orphan", "rewritten")
	writeTestFile(t, filepath.Join(upstream.working, "file.txt"), "rewritten")
	runTestGit(t, upstream.working, "commit", "--all", "--message", "rewritten")
	runTestGit(t, upstream.working, "push", "--quiet", "--force", upstream.bare, "HEAD:refs/heads/main")
	runTestGit(t, checkout.Path, "fetch", "--depth=1", "--force", "origin", "+refs/heads/main:refs/remotes/origin/main")

	observed, err := New().Observe(t.Context(), executor.BackendContext{GraphID: "test"}, checkout)
	if err != nil || observed.Status != executor.StatusPending {
		t.Fatalf("Observe() = %v, %v, want pending before reset", observed.Status, err)
	}
	applyCheckout(t, checkout)

	assertFileContent(t, filepath.Join(checkout.Path, "file.txt"), "rewritten")
	assertHead(t, checkout.Path, upstream.head())
	observed, err = New().Observe(t.Context(), executor.BackendContext{GraphID: "test"}, checkout)
	if err != nil || observed.Status != executor.StatusReady {
		t.Fatalf("Observe() = %v, %v, want ready after reset", observed.Status, err)
	}
}

func TestApplyGitCheckoutRetriesFailedClone(t *testing.T) {
	t.Parallel()

	upstream := newTestUpstream(t)
	upstream.commit("content")
	checkout := upstream.checkout(t)
	checkout.Ref = "missing"
	if _, err := New().Apply(t.Context(), executor.BackendContext{GraphID: "test"}, checkout); err == nil {
		t.Fatal("Apply() error = nil, want an error for the missing branch")
	}

	checkout.Ref = "main"
	applyCheckout(t, checkout)
	assertHead(t, checkout.Path, upstream.head())
}

func TestApplyGitCheckoutRejectsTagOnlyRef(t *testing.T) {
	t.Parallel()

	upstream := newTestUpstream(t)
	upstream.commit("content")
	runTestGit(t, upstream.working, "tag", "release")
	runTestGit(t, upstream.working, "push", "--quiet", upstream.bare, "refs/tags/release")
	checkout := upstream.checkout(t)
	checkout.Ref = "release"

	if _, err := New().Apply(t.Context(), executor.BackendContext{GraphID: "test"}, checkout); err == nil {
		t.Fatal("Apply() error = nil, want an error for a tag without a matching branch")
	}
	if _, err := os.Stat(checkout.Path); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("Stat() error = %v, want the failed clone removed", err)
	}
}

func TestEnsureGitCheckoutTimesOutOnlyNetworkOperations(t *testing.T) {
	upstream := newTestUpstream(t)
	upstream.commit("first")
	checkout := upstream.checkout(t)
	applyCheckout(t, checkout)
	upstream.commit("second")
	// A reset that outlasts the network timeout, which would leave a partial working tree if
	// the timeout killed it.
	wrapGit(t, "reset", "sleep 2")

	if err := EnsureGitCheckout(t.Context(), checkout, time.Second); err != nil {
		t.Fatalf("EnsureGitCheckout() error = %v", err)
	}

	assertFileContent(t, filepath.Join(checkout.Path, "file.txt"), "second")
	assertHead(t, checkout.Path, upstream.head())
}

func TestApplyGitCheckoutIgnoresTemplates(t *testing.T) {
	upstream := newTestUpstream(t)
	upstream.commit("content")
	checkout := upstream.checkout(t)
	template := t.TempDir()
	writeTestFile(t, filepath.Join(template, "hooks", "post-checkout"), "custom hook")
	t.Setenv("GIT_TEMPLATE_DIR", template)

	applyCheckout(t, checkout)

	hook := filepath.Join(checkout.Path, ".git", "hooks", "post-checkout")
	if _, err := os.Stat(hook); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("Stat() error = %v, want no hook copied from the user's template", err)
	}
}

func TestGitEnvironmentIgnoresMixedCaseRepositoryVariables(t *testing.T) {
	// Windows environment variable names are case-insensitive.
	t.Setenv("Git_Dir", "other-repository")
	t.Setenv("Git_Work_Tree", "other-working-tree")
	t.Setenv("Git_Config_Count", "1")
	t.Setenv("Git_Config_Key_0", "core.worktree")
	t.Setenv("Git_Config_Value_0", "other-working-tree")

	env := gitEnvironment("")
	for _, name := range []string{"GIT_DIR", "GIT_WORK_TREE", "GIT_CONFIG_COUNT", "GIT_CONFIG_KEY_0", "GIT_CONFIG_VALUE_0"} {
		if slices.ContainsFunc(env, func(entry string) bool {
			key, _, _ := strings.Cut(entry, "=")
			return strings.EqualFold(key, name)
		}) {
			t.Errorf("git environment contains %s", name)
		}
	}
}

func TestApplyGitCheckoutResetsLocalChanges(t *testing.T) {
	t.Parallel()

	upstream := newTestUpstream(t)
	upstream.commit("upstream")
	checkout := upstream.checkout(t)
	applyCheckout(t, checkout)

	file := filepath.Join(checkout.Path, "file.txt")
	writeTestFile(t, file, "committed locally")
	runTestGit(t, checkout.Path, "commit", "--all", "--message", "local")
	writeTestFile(t, file, "uncommitted")

	applyCheckout(t, checkout)

	assertFileContent(t, file, "upstream")
	assertHead(t, checkout.Path, upstream.head())
}

func TestApplyGitCheckoutRejectsExistingCheckoutWithWrongOrigin(t *testing.T) {
	t.Parallel()

	upstream := newTestUpstream(t)
	upstream.commit("content")
	checkout := upstream.checkout(t)
	applyCheckout(t, checkout)

	checkout.RepoURL = "file:///elsewhere.git"
	_, err := New().Apply(t.Context(), executor.BackendContext{GraphID: "test"}, checkout)
	if !errors.Is(err, errGitCheckoutOriginMismatch) {
		t.Fatalf("Apply() error = %v, want %v", err, errGitCheckoutOriginMismatch)
	}
}

func TestApplyGitCheckoutRejectsDirectoryThatIsNotACheckout(t *testing.T) {
	t.Parallel()

	upstream := newTestUpstream(t)
	upstream.commit("content")

	tests := map[string]struct {
		prepare func(t *testing.T, path string)
		wantErr error
	}{
		"plain directory": {
			prepare: func(t *testing.T, path string) {
				t.Helper()
				writeTestFile(t, filepath.Join(path, "file.txt"), "local")
			},
			wantErr: errLocalPathNotGitRepo,
		},
		// git would otherwise find the enclosing repository and reset that.
		"broken .git": {
			prepare: func(t *testing.T, path string) {
				t.Helper()
				if err := os.MkdirAll(filepath.Join(path, ".git"), 0o750); err != nil {
					t.Fatalf("MkdirAll() error = %v", err)
				}
			},
		},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			t.Parallel()

			// A clone of the same upstream, which a reset would overwrite.
			enclosing := upstream.checkout(t)
			applyCheckout(t, enclosing)
			enclosingFile := filepath.Join(enclosing.Path, "file.txt")
			writeTestFile(t, enclosingFile, "local")
			checkout := upstream.checkout(t)
			checkout.Path = filepath.Join(enclosing.Path, "checkout")
			tt.prepare(t, checkout.Path)

			_, err := New().Apply(t.Context(), executor.BackendContext{GraphID: "test"}, checkout)

			if err == nil {
				t.Fatal("Apply() error = nil, want an error")
			}
			if tt.wantErr != nil && !errors.Is(err, tt.wantErr) {
				t.Fatalf("Apply() error = %v, want %v", err, tt.wantErr)
			}
			assertFileContent(t, enclosingFile, "local")
		})
	}
}

func TestApplyGitCheckoutReportsMissingGit(t *testing.T) {
	t.Setenv("PATH", t.TempDir())
	checkout := &resource.GitCheckout{
		Name:    "chart",
		RepoURL: "file:///upstream.git",
		Ref:     "main",
		Path:    filepath.Join(t.TempDir(), "checkout"),
	}

	_, err := New().Apply(t.Context(), executor.BackendContext{GraphID: "test"}, checkout)

	if !errors.Is(err, errGitNotFound) {
		t.Fatalf("Apply() error = %v, want %v", err, errGitNotFound)
	}
}

func TestApplyGitCheckoutIgnoresRepositoryFromEnvironment(t *testing.T) {
	upstream := newTestUpstream(t)
	upstream.commit("content")
	checkout := upstream.checkout(t)
	applyCheckout(t, checkout)
	other := t.TempDir()
	runTestGit(t, other, "init", "--quiet", "--template=", "--initial-branch=main")
	// As set for a test run from a Git hook.
	t.Setenv("GIT_DIR", filepath.Join(other, ".git"))
	t.Setenv("GIT_WORK_TREE", other)

	applyCheckout(t, checkout)

	if _, err := os.Stat(filepath.Join(other, "file.txt")); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("Stat() error = %v, want the other repository untouched", err)
	}
}

func TestObserveGitCheckout(t *testing.T) {
	t.Parallel()

	upstream := newTestUpstream(t)
	upstream.commit("content")

	tests := map[string]struct {
		prepare func(t *testing.T, checkout *resource.GitCheckout)
		want    executor.Status
	}{
		"missing": {
			prepare: func(*testing.T, *resource.GitCheckout) {},
			want:    executor.StatusDestroyed,
		},
		"not a checkout": {
			prepare: func(t *testing.T, checkout *resource.GitCheckout) {
				t.Helper()
				writeTestFile(t, filepath.Join(checkout.Path, "file.txt"), "local")
			},
			want: executor.StatusFailed,
		},
		"at the fetched ref": {
			prepare: applyCheckout,
			want:    executor.StatusReady,
		},
		"local commit": {
			prepare: func(t *testing.T, checkout *resource.GitCheckout) {
				t.Helper()
				applyCheckout(t, checkout)
				runTestGit(t, checkout.Path, "commit", "--allow-empty", "--message", "local")
			},
			want: executor.StatusPending,
		},
		"other origin": {
			prepare: func(t *testing.T, checkout *resource.GitCheckout) {
				t.Helper()
				applyCheckout(t, checkout)
				checkout.RepoURL = "file:///elsewhere.git"
			},
			want: executor.StatusPending,
		},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			t.Parallel()

			checkout := upstream.checkout(t)
			tt.prepare(t, checkout)

			observed, err := New().Observe(t.Context(), executor.BackendContext{GraphID: "test"}, checkout)
			if err != nil {
				t.Fatalf("Observe() error = %v", err)
			}
			if observed.Status != tt.want {
				t.Fatalf("Observe() status = %v, want %v", observed.Status, tt.want)
			}
		})
	}
}

// testUpstream is a bare repository served over file://, so that clones are shallow as they
// are from a remote, with a working tree to commit to it from.
type testUpstream struct {
	t       *testing.T
	bare    string
	working string
}

func newTestUpstream(t *testing.T) *testUpstream {
	t.Helper()
	root := t.TempDir()
	upstream := &testUpstream{
		t:       t,
		bare:    filepath.Join(root, "upstream.git"),
		working: filepath.Join(root, "working"),
	}
	runTestGit(t, root, "init", "--quiet", "--template=", "--bare", "--initial-branch=main", upstream.bare)
	runTestGit(t, root, "init", "--quiet", "--template=", "--initial-branch=main", upstream.working)
	return upstream
}

func (u *testUpstream) url() string {
	return "file://" + filepath.ToSlash(u.bare)
}

// commit sets file.txt to content and pushes it to main.
func (u *testUpstream) commit(content string) {
	u.t.Helper()
	writeTestFile(u.t, filepath.Join(u.working, "file.txt"), content)
	runTestGit(u.t, u.working, "add", "file.txt")
	runTestGit(u.t, u.working, "commit", "--quiet", "--message", content)
	runTestGit(u.t, u.working, "push", "--quiet", u.bare, "HEAD:refs/heads/main")
}

func (u *testUpstream) branch(name string) {
	u.t.Helper()
	runTestGit(u.t, u.working, "push", "--quiet", u.bare, "HEAD:refs/heads/"+name)
}

func (u *testUpstream) head() string {
	u.t.Helper()
	return runTestGit(u.t, u.bare, "rev-parse", "refs/heads/main")
}

func (u *testUpstream) checkout(t *testing.T) *resource.GitCheckout {
	t.Helper()
	return &resource.GitCheckout{
		Name:    "chart",
		RepoURL: u.url(),
		Ref:     "main",
		Path:    filepath.Join(t.TempDir(), "checkout"),
	}
}

// wrapGit puts a git first on PATH that runs script before the git command it wraps.
func wrapGit(t *testing.T, command, script string) {
	t.Helper()
	if runtime.GOOS == "windows" {
		t.Skip("the git wrapper is a shell script")
	}
	git, err := exec.LookPath("git")
	if err != nil {
		t.Fatalf("LookPath() error = %v", err)
	}
	dir := t.TempDir()
	wrapper := fmt.Sprintf("#!/bin/sh\nif [ \"$1\" = %s ]; then %s; fi\nexec %q \"$@\"\n", command, script, git)
	if err := os.WriteFile(filepath.Join(dir, "git"), []byte(wrapper), 0o700); err != nil {
		t.Fatalf("WriteFile() error = %v", err)
	}
	t.Setenv("PATH", dir+string(os.PathListSeparator)+os.Getenv("PATH"))
}

func applyCheckout(t *testing.T, checkout *resource.GitCheckout) {
	t.Helper()
	if _, err := New().Apply(t.Context(), executor.BackendContext{GraphID: "test"}, checkout); err != nil {
		t.Fatalf("Apply() error = %v", err)
	}
}

func assertHead(t *testing.T, path, want string) {
	t.Helper()
	if got := runTestGit(t, path, "rev-parse", "HEAD"); got != want {
		t.Fatalf("HEAD = %s, want %s", got, want)
	}
}

func assertFileContent(t *testing.T, path, want string) {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile() error = %v", err)
	}
	if string(data) != want {
		t.Fatalf("content of %s = %q, want %q", path, data, want)
	}
}

func writeTestFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o750); err != nil {
		t.Fatalf("MkdirAll() error = %v", err)
	}
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatalf("WriteFile() error = %v", err)
	}
}

// runTestGit runs git in dir, isolated from the user's configuration, and returns its
// trimmed output.
func runTestGit(t *testing.T, dir string, args ...string) string {
	t.Helper()
	cmd := exec.CommandContext(t.Context(), "git", args...)
	cmd.Dir = dir
	cmd.Env = append(
		gitEnvironment(""),
		"GIT_AUTHOR_NAME=Test",
		"GIT_AUTHOR_EMAIL=test@example.com",
		"GIT_COMMITTER_NAME=Test",
		"GIT_COMMITTER_EMAIL=test@example.com",
	)
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("git %s: %v\n%s", strings.Join(args, " "), err, out)
	}
	return strings.TrimSpace(string(out))
}
