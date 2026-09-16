package appfrontend_test

import (
	"os"
	"path/filepath"
	"testing"

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
