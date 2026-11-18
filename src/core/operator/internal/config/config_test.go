package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	. "github.com/onsi/gomega"
)

const baseFile = `
callers:
  assistant:
    serviceAccount: system:serviceaccount:default:altinn-altinity-agents-sa
  designer:
    serviceAccount: system:serviceaccount:default:altinn-designer
`

const kindsFile = `
callers:
  assistant:
    kinds: [upgrade-v9]
kinds:
  upgrade-v9:
    namespace: sandbox-runs
    podTemplate: operator-runner
    command: upgrade-v9
    requiresArchive: true
    runTimeout: 660s
`

func writeFiles(t *testing.T, files map[string]string) string {
	t.Helper()
	dir := t.TempDir()
	for name, content := range files {
		if err := os.WriteFile(filepath.Join(dir, name), []byte(content), 0o600); err != nil {
			t.Fatal(err)
		}
	}
	return dir
}

// loadValid loads a valid configuration: a base file, and an overlay's file that adds a kind.
func loadValid(t *testing.T) *Config {
	t.Helper()
	cfg, err := LoadFrom(writeFiles(t, map[string]string{"config.yaml": baseFile, "kinds.yaml": kindsFile}))
	if err != nil {
		t.Fatal(err)
	}
	return cfg
}

// loadWith loads the valid configuration with one more file, which overrides the keys that it sets.
func loadWith(t *testing.T, override string) (*Config, error) {
	t.Helper()
	return LoadFrom(writeFiles(t, map[string]string{
		"config.yaml": baseFile, "kinds.yaml": kindsFile, "override.yaml": override,
	}))
}

// The overlays add a file with the kinds, so a later file must add to the callers of an earlier one.
func TestLoadMergesFilesInNameOrder(t *testing.T) {
	RegisterTestingT(t)

	Expect(loadValid(t).Callers).To(Equal(map[string]Caller{
		"assistant": {
			ServiceAccount: "system:serviceaccount:default:altinn-altinity-agents-sa",
			Kinds:          []string{"upgrade-v9"},
		},
		"designer": {ServiceAccount: "system:serviceaccount:default:altinn-designer"},
	}))
}

func TestLoadGivesAKindTheDefaultsThatItLeavesOut(t *testing.T) {
	RegisterTestingT(t)

	Expect(loadValid(t).Kinds).To(Equal(map[string]Kind{"upgrade-v9": {
		Namespace:          "sandbox-runs",
		PodTemplate:        "operator-runner",
		Command:            "upgrade-v9",
		RequiresArchive:    true,
		RunTimeout:         660 * time.Second,
		MaxQueuedPerCaller: defaultMaxQueuedPerCaller,
		QueueTimeout:       15 * time.Minute,
	}}))
}

func TestLoadReadsWhetherAKindRequiresAnArchive(t *testing.T) {
	RegisterTestingT(t)

	Expect(loadValid(t).Kinds["upgrade-v9"].RequiresArchive).To(BeTrue())

	without := strings.Replace(kindsFile, "    requiresArchive: true\n", "", 1)
	cfg, err := LoadFrom(writeFiles(t, map[string]string{"config.yaml": baseFile, "kinds.yaml": without}))
	Expect(err).NotTo(HaveOccurred())
	Expect(cfg.Kinds["upgrade-v9"].RequiresArchive).To(BeFalse())
}

func TestLoadReadsTheLabelsOfAKind(t *testing.T) {
	RegisterTestingT(t)

	cfg, err := loadWith(t, "kinds: {upgrade-v9: {labels: [org, repoOwner, repo, commit]}}")
	Expect(err).NotTo(HaveOccurred())
	Expect(cfg.Kinds["upgrade-v9"].Labels).To(Equal([]string{"org", "repoOwner", "repo", "commit"}))
}

// Each case loads the valid configuration with one more file, which breaks it in one way. The case expects the
// problem of that file, so it cannot pass on another one.
func TestLoadRefusesInvalidConfiguration(t *testing.T) {
	longID := strings.Repeat("a", MaxNameLength+1)
	cases := []struct{ override, problem string }{
		{"kinds: {upgrade-v9: {runTimeout: 811s}}", "needs a runTimeout above 0 and at most 13m30s"},
		{`kinds: {upgrade-v9: {command: ""}}`, "needs namespace, podTemplate and command"},
		{"kinds: {upgrade-v9: {maxActivePerCaller: -1}}", "needs a maxActivePerCaller of 0 or more"},
		{"kinds: {upgrade-v9: {maxQueuedPerCaller: -1}}", "needs a maxQueuedPerCaller of at least 1"},
		{"kinds: {upgrade-v9: {requiresArchive: maybe}}", "requiresArchive' cannot parse value as 'bool'"},
		{"kinds: {upgrade-v9: {labels: [repo-owner]}}", `label "repo-owner", which is not a camelCase name`},
		{"kinds: {upgrade-v9: {labels: [org, caller]}}", `label "caller", which is not a camelCase name`},
		{"kinds: {upgrade-v9: {labels: [org, org]}}", "the label org twice"},
		{"kinds: {upgrade-v9: {args: [target]}}", "has invalid keys: args"},
		{"callers: {designer: {serviceAccount: " + defaultEngineServiceAccount + "}}", "serviceAccount of the engine"},
		{"callers: {other: {kinds: [upgrade-v9]}}", "caller other has no serviceAccount"},
		{"callers: {Designer: {serviceAccount: system:serviceaccount:default:a}}", `caller id "Designer" must be`},
		{"callers: {" + longID + ": {serviceAccount: system:serviceaccount:default:a}}", `caller id "` + longID + `"`},
		{"engineAddress: http://typo", "has invalid keys: engineAddress"},
		{"engineURL: operator-workflow-engine:9090", `engineURL "operator-workflow-engine:9090" is not an http(s) URL`},
		{"handlerGroups: [runs, maskinporten]", `handlerGroups has the unknown group "maskinporten"`},
		{"handlerGroups: []", "handlerGroups is empty"},
		// Only the integration test sets the time scale, in code.
		{"timeScale: 0.01", "has invalid keys: timeScale"},
	}
	for _, check := range cases {
		t.Run(check.override, func(t *testing.T) {
			RegisterTestingT(t)
			_, err := loadWith(t, check.override)
			Expect(err).To(MatchError(ContainSubstring(check.problem)))
		})
	}
}

func TestKindForTellsWhetherAKindExistsAndTheCallerMayRunIt(t *testing.T) {
	RegisterTestingT(t)
	cfg := loadValid(t)

	for _, want := range []struct {
		caller, kind   string
		found, allowed bool
	}{
		{caller: "assistant", kind: "upgrade-v9", found: true, allowed: true},
		{caller: "designer", kind: "upgrade-v9", found: true, allowed: false},
		{caller: "assistant", kind: "upgrade-v10", found: false, allowed: false},
	} {
		got := want
		_, got.found, got.allowed = cfg.KindFor(want.caller, want.kind)
		Expect(got).To(Equal(want))
	}
}

func TestKindsForListsTheKindsThatACallerMayRun(t *testing.T) {
	RegisterTestingT(t)
	cfg := loadValid(t)

	Expect(cfg.KindsFor("assistant")).To(Equal([]string{"upgrade-v9"}))
	Expect(cfg.KindsFor("designer")).To(BeEmpty())
}

func TestKindNamespacesListsTheNamespacesOfTheKinds(t *testing.T) {
	RegisterTestingT(t)

	Expect(loadValid(t).KindNamespaces()).To(Equal([]string{"sandbox-runs"}))
}

func TestCallerByServiceAccountFindsTheCallerOfAToken(t *testing.T) {
	RegisterTestingT(t)
	cfg := loadValid(t)

	caller, found := cfg.CallerByServiceAccount("system:serviceaccount:default:altinn-designer")
	Expect(found).To(BeTrue())
	Expect(caller).To(Equal("designer"))
	_, found = cfg.CallerByServiceAccount("system:serviceaccount:default:someone-else")
	Expect(found).To(BeFalse())
}

func TestLoadWithoutFilesGivesDefaults(t *testing.T) {
	RegisterTestingT(t)

	cfg, err := LoadFrom(filepath.Join(t.TempDir(), "missing"))
	Expect(err).NotTo(HaveOccurred())
	Expect(cfg.Callers).To(BeEmpty())
}

// copyConfig copies the configuration files of config/ into a folder, as the ConfigMap mounts them.
func copyConfig(t *testing.T, sources ...string) string {
	t.Helper()
	dir := t.TempDir()
	for _, source := range sources {
		data, err := os.ReadFile(filepath.Join("..", "..", "config", source))
		if err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(dir, filepath.Base(source)), data, 0o600); err != nil {
			t.Fatal(err)
		}
	}
	return dir
}

// The base config in config/base is what every environment starts from.
func TestBaseManifestConfigLoads(t *testing.T) {
	RegisterTestingT(t)

	cfg, err := LoadFrom(copyConfig(t, "base/config.yaml"))
	Expect(err).NotTo(HaveOccurred())
	Expect(cfg.Kinds).To(BeEmpty(), "the overlays add the kinds")
	Expect(cfg.Callers).To(HaveKey("assistant"))
	Expect(cfg.Callers).To(HaveKey("designer"))
}

func TestOverlayConfigsLoad(t *testing.T) {
	for overlay, perCaller := range map[string]int{"dev": 1, "prod": 3} {
		t.Run(overlay, func(t *testing.T) {
			RegisterTestingT(t)
			dir := copyConfig(t, "base/config.yaml", overlay+"/kinds.yaml")
			cfg, err := LoadFrom(dir)
			Expect(err).NotTo(HaveOccurred())
			Expect(cfg.Kinds).To(HaveKey("upgrade-v9"))
			// Each caller leaves a slot of the quota for the other.
			Expect(cfg.Kinds["upgrade-v9"].MaxActivePerCaller).To(Equal(perCaller))
			Expect(cfg.Kinds["upgrade-v9"].RunTimeout).To(Equal(780 * time.Second))
			Expect(cfg.KindsFor("assistant")).To(Equal([]string{"upgrade-v9"}))
			Expect(cfg.KindsFor("designer")).To(Equal([]string{"upgrade-v9"}))
		})
	}
}
