package appfrontend_test

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"altinn.studio/studioctl/internal/appfrontend"
)

// writeBundle creates the named bundle files under a fresh Studio repository root.
func writeBundle(t *testing.T, names ...string) string {
	t.Helper()

	studioRoot := t.TempDir()
	dist := appfrontend.DistPath(studioRoot)
	if err := os.MkdirAll(dist, 0o755); err != nil {
		t.Fatalf("MkdirAll(%q) error = %v", dist, err)
	}
	for _, name := range names {
		if err := os.WriteFile(filepath.Join(dist, name), []byte("x"), 0o644); err != nil {
			t.Fatalf("WriteFile(%q) error = %v", name, err)
		}
	}
	return studioRoot
}

func TestIsBuiltRequiresBothBundleFiles(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		files []string
		want  bool
	}{
		{
			name:  "script and stylesheet",
			files: []string{"altinn-app-frontend.js", "altinn-app-frontend.css"},
			want:  true,
		},
		{name: "script only", files: []string{"altinn-app-frontend.js"}, want: false},
		{name: "stylesheet only", files: []string{"altinn-app-frontend.css"}, want: false},
		{name: "empty dist", files: nil, want: false},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()

			studioRoot := writeBundle(t, test.files...)
			if got := appfrontend.IsBuilt(studioRoot); got != test.want {
				t.Fatalf("IsBuilt() = %v, want %v for %v", got, test.want, test.files)
			}
		})
	}
}

func TestIsBuiltWithoutDistDirectory(t *testing.T) {
	t.Parallel()

	if appfrontend.IsBuilt(t.TempDir()) {
		t.Fatal("IsBuilt() = true, want false when dist does not exist")
	}
}

func TestIsBuiltWithoutStudioRoot(t *testing.T) {
	t.Parallel()

	if appfrontend.IsBuilt("") {
		t.Fatal("IsBuilt() = true, want false without a Studio repository root")
	}
}

// A directory named like a bundle file is not something an app can serve.
func TestIsBuiltRejectsDirectoryNamedLikeBundleFile(t *testing.T) {
	t.Parallel()

	studioRoot := writeBundle(t, "altinn-app-frontend.css")
	if err := os.Mkdir(filepath.Join(appfrontend.DistPath(studioRoot), "altinn-app-frontend.js"), 0o755); err != nil {
		t.Fatalf("Mkdir() error = %v", err)
	}
	if appfrontend.IsBuilt(studioRoot) {
		t.Fatal("IsBuilt() = true, want false when a bundle file is a directory")
	}
}

// touch sets a path's mtime, creating parent directories and the file when needed.
func touch(t *testing.T, path string, modTime time.Time) {
	t.Helper()

	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("MkdirAll(%q) error = %v", filepath.Dir(path), err)
	}
	if _, err := os.Stat(path); err != nil {
		if err := os.WriteFile(path, []byte("x"), 0o644); err != nil {
			t.Fatalf("WriteFile(%q) error = %v", path, err)
		}
	}
	if err := os.Chtimes(path, modTime, modTime); err != nil {
		t.Fatalf("Chtimes(%q) error = %v", path, err)
	}
}

// builtAt returns a checkout whose bundle carries the given modification time.
func builtAt(t *testing.T, modTime time.Time) string {
	t.Helper()

	studioRoot := writeBundle(t, "altinn-app-frontend.js", "altinn-app-frontend.css")
	for _, name := range []string{"altinn-app-frontend.js", "altinn-app-frontend.css"} {
		touch(t, filepath.Join(appfrontend.DistPath(studioRoot), name), modTime)
	}
	return studioRoot
}

func TestNeedsBuildWhenBundleIsMissing(t *testing.T) {
	t.Parallel()

	if !appfrontend.NeedsBuild(t.TempDir()) {
		t.Fatal("NeedsBuild() = false, want true when the bundle is missing")
	}
}

func TestNeedsBuildComparesInputsAgainstTheBundle(t *testing.T) {
	t.Parallel()

	bundleTime := time.Now().Add(-time.Hour)
	older := bundleTime.Add(-time.Hour)
	newer := bundleTime.Add(time.Hour)

	tests := []struct {
		when  time.Time
		name  string
		input string
		want  bool
	}{
		{name: "source older than the bundle", input: "src/App/frontend/src/index.tsx", when: older, want: false},
		{name: "source newer than the bundle", input: "src/App/frontend/src/index.tsx", when: newer, want: true},
		{name: "public asset newer", input: "src/App/frontend/public/logo.svg", when: newer, want: true},
		{name: "schema newer", input: "src/App/frontend/schemas/layout.json", when: newer, want: true},
		{name: "build script newer", input: "src/App/frontend/scripts/build.ts", when: newer, want: true},
		{name: "vite config newer", input: "src/App/frontend/vite.config.ts", when: newer, want: true},
		{name: "root lockfile newer", input: "yarn.lock", when: newer, want: true},
		{name: "shared library source newer", input: "src/common/ts/shared/src/index.ts", when: newer, want: true},
		{name: "shared library manifest newer", input: "src/common/ts/shared/package.json", when: newer, want: true},
		// Installed dependencies and build output are not sources, so they must not
		// trigger a rebuild - node_modules alone would make every run stale.
		{
			name:  "installed dependency newer",
			input: "src/App/frontend/src/node_modules/dep/index.js",
			when:  newer,
			want:  false,
		},
		{name: "nested build output newer", input: "src/common/ts/shared/src/dist/bundle.js", when: newer, want: false},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()

			studioRoot := builtAt(t, bundleTime)
			touch(t, filepath.Join(studioRoot, filepath.FromSlash(test.input)), test.when)

			if got := appfrontend.NeedsBuild(studioRoot); got != test.want {
				t.Fatalf("NeedsBuild() = %v, want %v after touching %s", got, test.want, test.input)
			}
		})
	}
}

// The bundle is only as fresh as its stalest file.
func TestNeedsBuildUsesTheOldestBundleFile(t *testing.T) {
	t.Parallel()

	now := time.Now()
	studioRoot := builtAt(t, now)
	touch(t, filepath.Join(appfrontend.DistPath(studioRoot), "altinn-app-frontend.css"), now.Add(-2*time.Hour))
	touch(t, filepath.Join(studioRoot, filepath.FromSlash("src/App/frontend/src/index.tsx")), now.Add(-time.Hour))

	if !appfrontend.NeedsBuild(studioRoot) {
		t.Fatal("NeedsBuild() = false, want true when a source is newer than the oldest bundle file")
	}
}

func TestDistPathIsUnderTheFrontendProject(t *testing.T) {
	t.Parallel()

	studioRoot := filepath.FromSlash("/studio")
	want := filepath.Join(studioRoot, "src", "App", "frontend", "dist")
	if got := appfrontend.DistPath(studioRoot); got != want {
		t.Fatalf("DistPath() = %q, want %q", got, want)
	}
	if got, wantProject := appfrontend.ProjectPath(
		studioRoot,
	), filepath.Join(
		studioRoot,
		"src",
		"App",
		"frontend",
	); got != wantProject {
		t.Fatalf("ProjectPath() = %q, want %q", got, wantProject)
	}
}
