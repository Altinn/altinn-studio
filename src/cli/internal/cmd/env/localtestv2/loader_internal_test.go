package localtestv2

import (
	"errors"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	envtypes "altinn.studio/studioctl/internal/cmd/env"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/localtestv2"
)

const testCertDir = "/home/dev/.altinn-studio/certs"

func containersOf(t *testing.T, opts *Options) map[string]*resource.Container {
	t.Helper()
	out := map[string]*resource.Container{}
	for _, r := range resources(opts, nil) {
		if c, ok := r.(*resource.Container); ok {
			out[strings.TrimPrefix(c.Name, containerPrefix)] = c
		}
	}
	return out
}

func envOf(c *resource.Container) map[string]string {
	env := map[string]string{}
	for _, entry := range c.Env {
		key, value, _ := strings.Cut(entry, "=")
		env[key] = value
	}
	return env
}

func TestOnlyTheFrontDoorPublishesAPort(t *testing.T) {
	t.Parallel()
	opts := defaultOptions(testCertDir)
	opts.Groups = OptionalGroups()
	for name, c := range containersOf(t, opts) {
		if name != frontDoor {
			if len(c.Ports) != 0 {
				t.Errorf("%s publishes %v", name, c.Ports)
			}
			continue
		}
		want := []types.PortMapping{{HostPort: "8000", ContainerPort: "8080", HostIP: "", Protocol: ""}}
		if !slices.Equal(c.Ports, want) {
			t.Errorf("the front door publishes %v, want %v", c.Ports, want)
		}
	}
}

func TestEveryContainerGetsItsNameTheHostsAndTheCertificate(t *testing.T) {
	t.Parallel()
	opts := defaultOptions(testCertDir)
	opts.Groups = OptionalGroups()
	for name, c := range containersOf(t, opts) {
		if !slices.Equal(c.NetworkAliases, []string{name}) {
			t.Errorf("%s: aliases %v", name, c.NetworkAliases)
		}
		for _, host := range []string{
			"local.altinn.cloud", "pdf.local.altinn.cloud", "workflow-engine.local.altinn.cloud",
			"app-frontend.local.altinn.cloud", "af.local.altinn.cloud", "host.docker.internal",
		} {
			if !slices.Contains(c.ExtraHosts, host+":host-gateway") {
				t.Errorf("%s: %s does not resolve to the host gateway: %v", name, host, c.ExtraHosts)
			}
		}
		certDir := types.VolumeMount{
			HostPath: testCertDir, ContainerPath: "/certs", Type: types.VolumeMountTypeBind,
			SELinuxRelabel: types.SELinuxRelabelNone, ReadOnly: true,
		}
		certFile := types.VolumeMount{
			HostPath:       testCertDir + "/" + localtestv2.CertificateFileName,
			ContainerPath:  "/accesstoken/accesstokencredentials.pfx",
			Type:           types.VolumeMountTypeBind,
			SELinuxRelabel: types.SELinuxRelabelNone,
			ReadOnly:       true,
		}
		if !slices.Contains(c.Volumes, certDir) || !slices.Contains(c.Volumes, certFile) {
			t.Errorf("%s: certificate mounts missing: %v", name, c.Volumes)
		}
		if !c.Lifecycle.WaitForReady {
			t.Errorf("%s: dependents do not wait for it", name)
		}
	}
}

// Every running HTTP container is announced to every container, and only those: the front door answers 503 "not
// running" for a service without an address.
func TestTheServiceVariablesNameTheRunningHTTPContainers(t *testing.T) {
	t.Parallel()
	containers := containersOf(t, defaultOptions(testCertDir))
	if len(containers) != 13 {
		t.Fatalf("%d containers by default, want 13", len(containers))
	}
	for name, c := range containers {
		env := envOf(c)
		if got := env["services__storage__http__0"]; got != "http://storage:5010" {
			t.Errorf("%s: storage is %q", name, got)
		}
		if got := env["services__localtest__http__0"]; got != "http://localtest:8080" {
			t.Errorf("%s: localtest is %q", name, got)
		}
		for _, absent := range []string{"postgres", "redis", "dialogporten-webapi", "receipt"} {
			if value, ok := env["services__"+absent+"__http__0"]; ok {
				t.Errorf("%s: %s announced as %s", name, absent, value)
			}
		}
	}
	withDialogporten := defaultOptions(testCertDir)
	withDialogporten.Groups = []string{"dialogporten"}
	env := envOf(containersOf(t, withDialogporten)[frontDoor])
	if got := env["services__dialogporten-graphql__http__0"]; got != "http://dialogporten-graphql:8080" {
		t.Errorf("graphql is %q", got)
	}
}

func TestTheManifestEnvironmentComesFirstAndUnchanged(t *testing.T) {
	t.Parallel()
	opts := defaultOptions(testCertDir)
	for name, c := range containersOf(t, opts) {
		own := stack().Containers[name].Envs
		env := envOf(c)
		for key, value := range own {
			if env[key] != value {
				t.Errorf("%s: %s=%q, want %q", name, key, env[key], value)
			}
		}
		for i, entry := range c.Env {
			key, _, _ := strings.Cut(entry, "=")
			if _, isOwn := own[key]; isOwn != (i < len(own)) {
				t.Errorf("%s: %s out of place at %d", name, key, i)
			}
		}
	}
}

func TestTheGroupsSelectTheirRootsAndTheirDependencies(t *testing.T) {
	t.Parallel()
	opts := defaultOptions(testCertDir)
	opts.Groups = []string{"arbeidsflate"}
	got := selected(opts)
	for _, want := range []string{"arbeidsflate", "arbeidsflate-bff", "dialogporten-graphql", "dialogporten-webapi", "redis"} {
		if !slices.Contains(got, want) {
			t.Errorf("--with arbeidsflate leaves out %s", want)
		}
	}
	if slices.Contains(got, "receipt") {
		t.Error("--with arbeidsflate starts the receipt")
	}
}

func TestResolveGroups(t *testing.T) {
	t.Parallel()
	type groupCase struct {
		err     error
		with    []string
		without []string
		want    []string
	}
	gc := func(with, without, want []string, err error) groupCase {
		return groupCase{err: err, with: with, without: without, want: want}
	}
	cases := map[string]groupCase{
		"none": gc(nil, nil, nil, nil),
		"one":  gc([]string{"receipt"}, nil, []string{"receipt"}, nil),
		"everything": gc(
			[]string{"everything"},
			nil,
			[]string{"arbeidsflate", "correspondence", "dialogporten", "receipt"},
			nil,
		),
		"everything but one": gc(
			[]string{"everything"},
			[]string{"dialogporten"},
			[]string{"arbeidsflate", "correspondence", "receipt"},
			nil,
		),
		"without what is off": gc(nil, []string{"receipt"}, nil, nil),
		"unknown":             gc([]string{"kvittering"}, nil, nil, errUnknownGroup),
		"default":             gc(nil, []string{"default"}, nil, errDefaultGroup),
	}
	for name, c := range cases {
		got, err := ResolveGroups(c.with, c.without)
		if !errors.Is(err, c.err) || !slices.Equal(got, c.want) {
			t.Errorf("%s: got %v, %v; want %v, %v", name, got, err, c.want, c.err)
		}
	}
}

// The --with values are what the Aspire package's typed methods name too.
func TestTheGroupNames(t *testing.T) {
	t.Parallel()
	want := []string{"dialogporten", "receipt", "correspondence", "arbeidsflate", GroupEverything}
	if got := GroupNames(); !slices.Equal(got, want) {
		t.Fatalf("GroupNames() = %v, want %v", got, want)
	}
}

func TestThePullPolicyFollowsTheTag(t *testing.T) {
	t.Parallel()
	cases := map[string]resource.PullPolicy{
		"sha-f76b62b":           resource.PullIfNotPresent,
		"7.2-alpine@sha256:abc": resource.PullIfNotPresent,
		"tt02":                  resource.PullAlwaysAllowStale,
		"latest":                resource.PullAlwaysAllowStale,
	}
	for tag, want := range cases {
		if got := pullPolicy(tag); got != want {
			t.Errorf("%s: %v, want %v", tag, got, want)
		}
	}
}

func TestLatestMovesOnlyThePinnedImages(t *testing.T) {
	t.Parallel()
	opts := defaultOptions(testCertDir)
	opts.LatestImages = true
	refs := map[string]string{}
	for _, r := range resources(opts, nil) {
		if image, ok := r.(*resource.PulledImage); ok {
			refs[image.Ref] = ""
		}
	}
	for ref := range refs {
		if strings.Contains(ref, "localtest-research") && !strings.HasSuffix(ref, ":latest") {
			t.Errorf("%s is not at latest", ref)
		}
		if strings.Contains(ref, "altinn-studio/runtime-") && !strings.HasSuffix(ref, ":tt02") {
			t.Errorf("%s moved", ref)
		}
	}
}

func TestADevBuildReplacesThePulledImage(t *testing.T) {
	t.Parallel()
	opts := defaultOptions(testCertDir)
	opts.Dev = map[string]DevBuild{"storage": {Context: "/src/storage", Dockerfile: "/src/storage/Dockerfile"}}
	for _, r := range resources(opts, nil) {
		if c, ok := r.(*resource.Container); ok && c.Name == containerOf("storage") {
			if c.Image.ID() != "image:built:localtest-v2-dev-storage" {
				t.Fatalf("storage runs %s", c.Image.ID())
			}
			return
		}
	}
	t.Fatal("no storage container")
}

func TestResolveDevBuilds(t *testing.T) {
	t.Parallel()
	root := t.TempDir()
	write := func(rel string) {
		path := filepath.Join(root, rel)
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte("FROM scratch\n"), 0o600); err != nil {
			t.Fatal(err)
		}
	}
	write("components/storage/Dockerfile")
	write("components/dialogporten/Dockerfile.webapi")
	write("postgres/Dockerfile")
	storage := filepath.Join(root, "components", "storage")
	dialogporten := filepath.Join(root, "components", "dialogporten")

	type devCase struct {
		err  error
		dev  map[string]string
		want map[string]DevBuild
		cwd  string
	}
	dc := func(dev map[string]string, cwd string, want map[string]DevBuild, err error) devCase {
		return devCase{err: err, dev: dev, want: want, cwd: cwd}
	}
	cases := map[string]devCase{
		"the current directory": dc(
			map[string]string{"storage": ""}, storage,
			map[string]DevBuild{"storage": {Context: storage, Dockerfile: filepath.Join(storage, "Dockerfile")}}, nil,
		),
		"a directory": dc(
			map[string]string{"storage": "components/storage"}, root,
			map[string]DevBuild{"storage": {Context: storage, Dockerfile: filepath.Join(storage, "Dockerfile")}}, nil,
		),
		"a Dockerfile in the current directory": dc(
			map[string]string{"dialogporten-webapi": "Dockerfile.webapi"}, dialogporten,
			map[string]DevBuild{"dialogporten-webapi": {
				Context: dialogporten, Dockerfile: filepath.Join(dialogporten, "Dockerfile.webapi"),
			}},
			nil,
		),
		"a Dockerfile below the current directory builds with the current directory as context": dc(
			map[string]string{"postgres": "postgres/Dockerfile"}, root,
			map[string]DevBuild{"postgres": {Context: root, Dockerfile: filepath.Join(root, "postgres", "Dockerfile")}},
			nil,
		),
		"a Dockerfile elsewhere builds with its own directory as context": dc(
			map[string]string{"dialogporten-webapi": filepath.Join(dialogporten, "Dockerfile.webapi")}, storage,
			map[string]DevBuild{"dialogporten-webapi": {
				Context: dialogporten, Dockerfile: filepath.Join(dialogporten, "Dockerfile.webapi"),
			}},
			nil,
		),
		"a directory without a Dockerfile": dc(map[string]string{"storage": ""}, root, nil, errDevPath),
		"a missing path":                   dc(map[string]string{"storage": "nowhere"}, root, nil, errDevPath),
		"an unknown container": dc(
			map[string]string{"blob-store": ""}, storage, nil, errUnknownDevContainer,
		),
	}
	for name, c := range cases {
		got, err := resolveDevBuilds(c.dev, c.cwd)
		if !errors.Is(err, c.err) {
			t.Errorf("%s: error %v, want %v", name, err, c.err)
			continue
		}
		if len(got) != len(c.want) {
			t.Errorf("%s: %v, want %v", name, got, c.want)
		}
		for k, v := range c.want {
			if got[k] != v {
				t.Errorf("%s: %s = %+v, want %+v", name, k, got[k], v)
			}
		}
	}
}

func TestTheProbeScripts(t *testing.T) {
	t.Parallel()
	tcp := probeScript(healthTargetOf("postgres"), 3)
	if want := "for i in $(seq 1 3); do if { exec 3<>/dev/tcp/postgres/5432; } 2>/dev/null; then exec 3<&-; " +
		"exit 0; fi; sleep 1; done; exit 1"; tcp != want {
		t.Errorf("tcp probe:\n%s\nwant\n%s", tcp, want)
	}
	http := probeScript(healthTargetOf("dialogporten-webapi"), 3)
	for _, part := range []string{
		"/dev/tcp/dialogporten-webapi/8080",
		`printf 'GET /health/readiness HTTP/1.0\r\nHost: dialogporten-webapi\r\n\r\n' >&3`,
		`*' 200 '*) exit 0`,
	} {
		if !strings.Contains(http, part) {
			t.Errorf("http probe lacks %q:\n%s", part, http)
		}
	}
	if got := healthTargetOf("storage").String(); got != "http://storage:5010/health" {
		t.Errorf("storage: %s", got)
	}
}

func TestAnUpWithOtherGroupsOrImagesChangesTheRunningEnvironment(t *testing.T) {
	t.Parallel()
	cfg := &config.Config{Home: t.TempDir(), DataDir: t.TempDir()}
	if err := localtestv2.WriteState(cfg, localtestv2.State{
		CertificateDir: localtestv2.CertificateDir(cfg),
		Groups:         []string{"receipt"},
		LatestImages:   false,
	}); err != nil {
		t.Fatal(err)
	}
	env := NewEnv(cfg, nil, nil)
	for _, tc := range []struct {
		name string
		opts envtypes.UpOptions
		want bool
	}{
		{name: "the same", opts: envtypes.UpOptions{With: []string{"receipt"}}, want: false},
		{name: "another group", opts: envtypes.UpOptions{With: []string{"receipt", "dialogporten"}}, want: true},
		{name: "no group", opts: envtypes.UpOptions{}, want: true},
		{name: "latest", opts: envtypes.UpOptions{With: []string{"receipt"}, LatestImages: true}, want: true},
		{
			name: "a dev build",
			opts: envtypes.UpOptions{With: []string{"receipt"}, DevComponents: map[string]string{"storage": ""}},
			want: true,
		},
	} {
		got, err := env.Changed(tc.opts)
		if err != nil || got != tc.want {
			t.Errorf("%s: Changed() = %v, %v; want %v", tc.name, got, err, tc.want)
		}
	}
}
