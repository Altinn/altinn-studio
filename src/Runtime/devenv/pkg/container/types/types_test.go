package types

import (
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

func TestMergeCapabilities(t *testing.T) {
	tests := []struct {
		name     string
		defaults []string
		explicit []string
		want     []string
	}{
		{
			name:     "empty inputs",
			defaults: []string{},
			explicit: []string{},
			want:     nil,
		},
		{
			name:     "nil inputs",
			defaults: nil,
			explicit: nil,
			want:     nil,
		},
		{
			name:     "only defaults",
			defaults: []string{"NET_RAW", "MKNOD"},
			explicit: []string{},
			want:     []string{"NET_RAW", "MKNOD"},
		},
		{
			name:     "only explicit",
			defaults: []string{},
			explicit: []string{"SYS_PTRACE", "NET_ADMIN"},
			want:     []string{"SYS_PTRACE", "NET_ADMIN"},
		},
		{
			name:     "no duplicates",
			defaults: []string{"NET_RAW", "MKNOD"},
			explicit: []string{"SYS_PTRACE", "NET_ADMIN"},
			want:     []string{"NET_RAW", "MKNOD", "SYS_PTRACE", "NET_ADMIN"},
		},
		{
			name:     "with duplicates preserves order",
			defaults: []string{"NET_RAW", "MKNOD", "AUDIT_WRITE"},
			explicit: []string{"MKNOD", "SYS_PTRACE", "NET_RAW"},
			want:     []string{"NET_RAW", "MKNOD", "AUDIT_WRITE", "SYS_PTRACE"},
		},
		{
			name:     "real world DefaultPodmanCapabilities with user caps",
			defaults: DefaultPodmanCapabilities(),
			explicit: []string{"SYS_PTRACE", "NET_ADMIN", "NET_RAW"},
			want:     []string{"NET_RAW", "MKNOD", "AUDIT_WRITE", "SYS_PTRACE", "NET_ADMIN"},
		},
		{
			name:     "duplicates within defaults",
			defaults: []string{"NET_RAW", "NET_RAW", "MKNOD"},
			explicit: []string{},
			want:     []string{"NET_RAW", "MKNOD"},
		},
		{
			name:     "duplicates within explicit",
			defaults: []string{},
			explicit: []string{"SYS_PTRACE", "SYS_PTRACE", "NET_ADMIN"},
			want:     []string{"SYS_PTRACE", "NET_ADMIN"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := MergeCapabilities(tt.defaults, tt.explicit)
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("MergeCapabilities() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestDefaultPodmanCapabilities(t *testing.T) {
	// Verify the default capabilities match the expected values
	expected := []string{"NET_RAW", "MKNOD", "AUDIT_WRITE"}
	got := DefaultPodmanCapabilities()
	if !reflect.DeepEqual(got, expected) {
		t.Errorf("DefaultPodmanCapabilities() = %v, want %v", got, expected)
	}

	// Verify callers cannot mutate package defaults.
	got[0] = "MUTATED"
	if reflect.DeepEqual(DefaultPodmanCapabilities(), got) {
		t.Error("DefaultPodmanCapabilities() returned shared backing storage")
	}
}

func TestContainerPlatformBuildCLI(t *testing.T) {
	tests := map[ContainerPlatform]string{
		PlatformDocker:  "docker",
		PlatformColima:  "docker",
		PlatformPodman:  "podman",
		PlatformUnknown: "",
	}

	for platform, want := range tests {
		if got := platform.BuildCLI(); got != want {
			t.Fatalf("%v.BuildCLI() = %q, want %q", platform, got, want)
		}
	}
}

func TestContainerPlatformPushArgs(t *testing.T) {
	tests := []struct {
		name     string
		image    string
		want     []string
		platform ContainerPlatform
	}{
		{
			name:     "docker remote registry",
			platform: PlatformDocker,
			image:    "ghcr.io/altinn/altinn-studio/app:test",
			want:     []string{"push", "ghcr.io/altinn/altinn-studio/app:test"},
		},
		{
			name:     "docker local registry",
			platform: PlatformDocker,
			image:    "localhost:5001/app:test",
			want:     []string{"push", "localhost:5001/app:test"},
		},
		{
			name:     "podman remote registry",
			platform: PlatformPodman,
			image:    "ghcr.io/altinn/altinn-studio/app:test",
			want:     []string{"push", "ghcr.io/altinn/altinn-studio/app:test"},
		},
		{
			name:     "podman local registry",
			platform: PlatformPodman,
			image:    "localhost:5001/app:test",
			want:     []string{"push", "--tls-verify=false", "localhost:5001/app:test"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.platform.PushArgs(tt.image)
			if !reflect.DeepEqual(got, tt.want) {
				t.Fatalf("%v.PushArgs(%q) = %#v, want %#v", tt.platform, tt.image, got, tt.want)
			}
		})
	}
}

func TestPodmanBuildArgs(t *testing.T) {
	workDir := t.TempDir()
	t.Chdir(workDir)
	for _, name := range []string{"Dockerfile", "Dockerfile.dockerignore"} {
		if err := os.WriteFile(filepath.Join(workDir, name), []byte("**\n"), 0o600); err != nil {
			t.Fatal(err)
		}
	}
	contextDir := t.TempDir()
	dockerfileDir := t.TempDir()
	withIgnore := filepath.Join(dockerfileDir, "app.Dockerfile")
	if err := os.WriteFile(withIgnore+".dockerignore", []byte("**\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(contextDir, "Dockerfile.dockerignore"), []byte("**\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(
		filepath.Join(contextDir, "Dockerfile.proxy.dockerignore"),
		[]byte("**\n"),
		0o600,
	); err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		name       string
		dockerfile string
		want       []string
	}{
		{
			name:       "Dockerfile with its own ignore file",
			dockerfile: withIgnore,
			want: []string{
				"build", "-t", "app:dev", "-f", withIgnore,
				"--ignorefile", withIgnore + ".dockerignore", contextDir,
			},
		},
		{
			name:       "relative Dockerfile resolves its ignore file in the context",
			dockerfile: "Dockerfile.proxy",
			want: []string{
				"build", "-t", "app:dev", "-f", "Dockerfile.proxy",
				"--ignorefile", filepath.Join(contextDir, "Dockerfile.proxy.dockerignore"), contextDir,
			},
		},
		{
			name:       "relative Dockerfile in the working directory uses the ignore file next to it",
			dockerfile: "Dockerfile",
			want: []string{
				"build", "-t", "app:dev", "-f", "Dockerfile",
				"--ignorefile", "Dockerfile.dockerignore", contextDir,
			},
		},
		{
			name:       "Dockerfile without its own ignore file",
			dockerfile: filepath.Join(dockerfileDir, "Dockerfile"),
			want: []string{
				"build",
				"-t",
				"app:dev",
				"-f",
				filepath.Join(dockerfileDir, "Dockerfile"),
				contextDir,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := PodmanBuildArgs(contextDir, tt.dockerfile, "app:dev")
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("PodmanBuildArgs() = %#v, want %#v", got, tt.want)
			}
		})
	}
}
