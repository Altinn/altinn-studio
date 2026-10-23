package manifest

import (
	"encoding/json"
	"errors"
	"slices"
	"strings"
	"testing"
)

func TestTheEmbeddedManifestParses(t *testing.T) {
	t.Parallel()
	m, err := Default()
	if err != nil {
		t.Fatal(err)
	}
	if len(m.Names()) != 22 {
		t.Fatalf("%d containers, want 22", len(m.Names()))
	}
	want := []string{DefaultGroup, "dialogporten", "receipt", "correspondence", "arbeidsflate"}
	if got := m.GroupNames(); !slices.Equal(got, want) {
		t.Fatalf("groups %v, want %v", got, want)
	}
}

// mutated parses the embedded manifest after mutate has changed its JSON form.
func mutated(t *testing.T, mutate func(m map[string]any)) error {
	t.Helper()
	var m map[string]any
	if err := json.Unmarshal(manifestJSON, &m); err != nil {
		t.Fatal(err)
	}
	mutate(m)
	data, err := json.Marshal(m)
	if err != nil {
		t.Fatal(err)
	}
	_, err = Parse(data)
	return err
}

func containerNamed(m map[string]any, name string) map[string]any {
	c, ok := m["containers"].(map[string]any)[name].(map[string]any)
	if !ok {
		panic("no container " + name)
	}
	return c
}

func groupNamed(m map[string]any, name string) map[string]any {
	groups, ok := m["groups"].([]any)
	if !ok {
		panic("no groups")
	}
	for _, g := range groups {
		if obj, ok := g.(map[string]any); ok && obj["name"] == name {
			return obj
		}
	}
	panic("no group " + name)
}

func TestParseRefusesAnInvalidManifest(t *testing.T) {
	t.Parallel()
	cases := map[string]struct {
		mutate func(m map[string]any)
		want   error
	}{
		"unknown top-level key": {func(m map[string]any) { m["version"] = 2 }, errUnknownKey},
		"unknown container key": {
			func(m map[string]any) { containerNamed(m, "storage")["command"] = []any{"sh"} },
			errUnknownKey,
		},
		"unknown group key": {func(m map[string]any) { groupNamed(m, "receipt")["implies"] = []any{} }, errUnknownKey},
		"unknown dependency": {
			func(m map[string]any) { containerNamed(m, "storage")["dependsOn"] = []any{"blob-store"} },
			errReference,
		},
		"dependency on itself": {
			func(m map[string]any) { containerNamed(m, "storage")["dependsOn"] = []any{"storage"} },
			errReference,
		},
		"duplicate dependency": {
			func(m map[string]any) { containerNamed(m, "storage")["dependsOn"] = []any{"postgres", "postgres"} },
			errDuplicate,
		},
		"dependency cycle": {
			func(m map[string]any) { containerNamed(m, "postgres")["dependsOn"] = []any{"storage"} },
			errCycle,
		},
		"group naming an unknown container": {
			func(m map[string]any) { groupNamed(m, "receipt")["containers"] = []any{"kvittering"} },
			errReference,
		},
		"container no group reaches": {
			func(m map[string]any) {
				groupNamed(m, "receipt")["containers"] = []any{"storage"}
			},
			errUnreached,
		},
		"no default group": {
			func(m map[string]any) { groupNamed(m, DefaultGroup)["name"] = "standard" },
			errNoDefault,
		},
		"duplicate group": {
			func(m map[string]any) { groupNamed(m, "receipt")["name"] = "dialogporten" },
			errDuplicate,
		},
		"empty group":       {func(m map[string]any) { groupNamed(m, "receipt")["containers"] = []any{} }, errValue},
		"empty registry":    {func(m map[string]any) { containerNamed(m, "storage")["registry"] = "" }, errValue},
		"empty tag":         {func(m map[string]any) { containerNamed(m, "storage")["tag"] = " " }, errValue},
		"port out of range": {func(m map[string]any) { containerNamed(m, "storage")["port"] = 70000 }, errValue},
		"negative port":     {func(m map[string]any) { containerNamed(m, "storage")["port"] = -1 }, errValue},
		"health neither a path nor tcp": {
			func(m map[string]any) { containerNamed(m, "storage")["health"] = "health" },
			errValue,
		},
		"relative volume target": {
			func(m map[string]any) {
				containerNamed(m, "storage")["volumes"] = map[string]any{"storage-blobs": "data"}
			},
			errValue,
		},
	}
	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			err := mutated(t, c.mutate)
			if !errors.Is(err, c.want) {
				t.Fatalf("got %v, want %v", err, c.want)
			}
			if !errors.Is(err, errInvalid) {
				t.Fatalf("%v does not wrap %v", err, errInvalid)
			}
		})
	}
}

func TestTheVolumeIDsCarryNoRuntimePrefixAndAreSharedByID(t *testing.T) {
	t.Parallel()
	m := MustDefault()
	want := []string{"correspondence-blobs", "localtest-data", "policy-store", "postgres-data", "storage-blobs"}
	if got := m.VolumeIDs(); !slices.Equal(got, want) {
		t.Fatalf("volume ids %v, want %v", got, want)
	}
	// One id is one volume: the PDP, Access Management and the Resource Registry share the policy store.
	for _, name := range []string{"authorization", "access-management", "resource-registry"} {
		if target, ok := m.Containers[name].Volumes["policy-store"]; !ok || target != "/policy-store" {
			t.Errorf("%s: policy-store at %q", name, target)
		}
	}
}

func TestParseRefusesAnInvalidVolumeID(t *testing.T) {
	t.Parallel()
	for _, id := range []string{
		"", "Storage-blobs", "storage_blobs", "storage blobs", "-storage", "storage-", "storage--blobs", "data/blobs",
		"storage.blobs",
	} {
		t.Run(id, func(t *testing.T) {
			t.Parallel()
			err := mutated(t, func(m map[string]any) {
				containerNamed(m, "storage")["volumes"] = map[string]any{id: "/data/blobs"}
			})
			if !errors.Is(err, errValue) || !errors.Is(err, errInvalid) {
				t.Fatalf("volume id %q: got %v, want %v", id, err, errValue)
			}
		})
	}
	for _, id := range []string{"blobs", "storage-blobs", "storage2-blobs-v2", "0"} {
		err := mutated(t, func(m map[string]any) {
			containerNamed(m, "storage")["volumes"] = map[string]any{id: "/data/blobs"}
		})
		if err != nil {
			t.Fatalf("volume id %q: %v", id, err)
		}
	}
}

func TestParseRefusesADuplicateContainerAndTrailingData(t *testing.T) {
	t.Parallel()
	dup := `{"groups":[{"name":"default","containers":["a"]}],"containers":{` +
		`"a":{"registry":"r","tag":"t"},"a":{"registry":"r","tag":"t"}}}`
	if _, err := Parse([]byte(dup)); !errors.Is(err, errDuplicate) {
		t.Fatalf("duplicate container: %v", err)
	}
	trailing := `{"groups":[{"name":"default","containers":["a"]}],"containers":{"a":{"registry":"r","tag":"t"}}} {}`
	if _, err := Parse([]byte(trailing)); !errors.Is(err, errValue) {
		t.Fatalf("trailing data: %v", err)
	}
}

func TestTheDefaultsApply(t *testing.T) {
	t.Parallel()
	m := MustDefault()
	localtest := m.Containers["localtest"]
	if localtest.HTTPPort() != DefaultPort || localtest.HealthCheck() != DefaultHealth || !localtest.IsHTTP() {
		t.Fatalf("localtest: port %d, health %q", localtest.HTTPPort(), localtest.HealthCheck())
	}
	postgres := m.Containers["postgres"]
	if postgres.HTTPPort() != 5432 || postgres.IsHTTP() {
		t.Fatalf("postgres: port %d, health %q", postgres.HTTPPort(), postgres.HealthCheck())
	}
	// Redis is our own image since the sha-6d928ad pin (localtest/redis/Dockerfile bakes the command in).
	const redisImage = "ghcr.io/ivarne-agent/localtest-research/localtest-redis:sha-"
	if got := m.Containers["redis"].Image(); !strings.HasPrefix(got, redisImage) {
		t.Fatalf("redis image %s", got)
	}
}

func TestSelectStartsTheRootsAndTheirDependenciesInOrder(t *testing.T) {
	t.Parallel()
	m := MustDefault()
	def := m.Select([]string{DefaultGroup})
	if len(def) != 13 {
		t.Fatalf("default: %d containers %v, want 13", len(def), def)
	}
	assertStartOrder(t, m, def)

	correspondence := m.Select([]string{DefaultGroup, "correspondence"})
	for _, want := range []string{"correspondence", "redis", "dialogporten-webapi"} {
		if !slices.Contains(correspondence, want) {
			t.Errorf("--with correspondence leaves out %s: %v", want, correspondence)
		}
	}
	assertStartOrder(t, m, correspondence)

	all := m.Select(m.GroupNames())
	if len(all) != len(m.Names()) {
		t.Fatalf("every group: %d containers, want %d", len(all), len(m.Names()))
	}
	assertStartOrder(t, m, all)
	if len(m.Select(nil)) != 0 {
		t.Fatalf("no group selects %v", m.Select(nil))
	}
}

func assertStartOrder(t *testing.T, m *Manifest, order []string) {
	t.Helper()
	for i, name := range order {
		for _, dep := range m.Containers[name].DependsOn {
			j := slices.Index(order, dep)
			if j < 0 || j > i {
				t.Fatalf("%s starts before its dependency %s: %v", name, dep, order)
			}
		}
	}
}

// The manifest's values are the strings the containers get: nothing in them is resolved later.
func TestTheEnvironmentIsLiteral(t *testing.T) {
	t.Parallel()
	m := MustDefault()
	for _, name := range m.Names() {
		for key, value := range m.Containers[name].Envs {
			if strings.Contains(value, "{{") || strings.HasPrefix(key, "services__") {
				t.Errorf("%s: %s=%s is not a literal value of the container's own", name, key, value)
			}
		}
	}
}

// The research images change only together, by localtest/tools/bump-tag.sh, which rewrites every sha- tag.
func TestTheResearchImagesShareOnePin(t *testing.T) {
	t.Parallel()
	m := MustDefault()
	tags := map[string]bool{}
	for _, name := range m.Names() {
		c := m.Containers[name]
		if strings.HasPrefix(c.Registry, "ghcr.io/ivarne-agent/localtest-research/") {
			if !strings.HasPrefix(c.Tag, "sha-") {
				t.Errorf("%s: tag %s is not a sha- pin", name, c.Tag)
			}
			tags[c.Tag] = true
		}
	}
	if len(tags) != 1 {
		t.Fatalf("research image tags %v, want one", tags)
	}
}
