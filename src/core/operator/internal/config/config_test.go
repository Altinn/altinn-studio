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
    maxActive: 2
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

// The overlays add a file with the kinds, so a later file must add to the callers of an earlier one.
func TestLoadMergesFilesInNameOrder(t *testing.T) {
	RegisterTestingT(t)

	dir := writeFiles(t, map[string]string{"config.yaml": baseFile, "kinds.yaml": kindsFile})
	cfg, err := LoadFrom(dir)
	Expect(err).NotTo(HaveOccurred())

	Expect(cfg.Callers["assistant"].ServiceAccount).To(Equal("system:serviceaccount:default:altinn-altinity-agents-sa"))
	Expect(cfg.Callers["assistant"].Kinds).To(Equal([]string{"upgrade-v9"}))
	Expect(cfg.Callers["designer"].Kinds).To(BeEmpty())

	kind := cfg.Kinds["upgrade-v9"]
	Expect(kind.RunTimeout).To(Equal(660 * time.Second))
	Expect(kind.MaxActivePerCaller).To(Equal(2), "defaults to maxActive")
	Expect(kind.MaxQueuedPerCaller).To(Equal(defaultMaxQueuedPerCaller))
	Expect(kind.QueueTimeout).To(Equal(15 * time.Minute))
	Expect(cfg.KindNamespaces()).To(Equal([]string{"sandbox-runs"}))

	Expect(cfg.KindsFor("assistant")).To(Equal([]string{"upgrade-v9"}))
	Expect(cfg.KindsFor("designer")).To(BeEmpty())

	_, found, allowed := cfg.KindFor("assistant", "upgrade-v9")
	Expect(found).To(BeTrue())
	Expect(allowed).To(BeTrue())
	_, found, allowed = cfg.KindFor("designer", "upgrade-v9")
	Expect(found).To(BeTrue())
	Expect(allowed).To(BeFalse())
	_, found, _ = cfg.KindFor("assistant", "upgrade-v10")
	Expect(found).To(BeFalse())

	caller, ok := cfg.CallerByServiceAccount("system:serviceaccount:default:altinn-designer")
	Expect(ok).To(BeTrue())
	Expect(caller).To(Equal("designer"))
}

func TestLoadReadsWhetherAKindRequiresAnArchive(t *testing.T) {
	RegisterTestingT(t)

	cfg, err := LoadFrom(writeFiles(t, map[string]string{"config.yaml": baseFile, "kinds.yaml": kindsFile}))
	Expect(err).NotTo(HaveOccurred())
	Expect(cfg.Kinds["upgrade-v9"].RequiresArchive).To(BeTrue())

	without := strings.Replace(kindsFile, "    requiresArchive: true\n", "", 1)
	cfg, err = LoadFrom(writeFiles(t, map[string]string{"config.yaml": baseFile, "kinds.yaml": without}))
	Expect(err).NotTo(HaveOccurred())
	Expect(cfg.Kinds["upgrade-v9"].RequiresArchive).To(BeFalse())
}

func TestLoadReadsTheLabelsOfAKind(t *testing.T) {
	RegisterTestingT(t)

	labelsFile := kindsFile + "    labels: [org, app, repoOwner, repo, commit]\n"
	cfg, err := LoadFrom(writeFiles(t, map[string]string{"config.yaml": baseFile, "kinds.yaml": labelsFile}))
	Expect(err).NotTo(HaveOccurred())
	Expect(cfg.Kinds["upgrade-v9"].Labels).To(Equal([]string{"org", "app", "repoOwner", "repo", "commit"}))
}

func TestLoadRefusesInvalidConfiguration(t *testing.T) {
	cases := map[string]string{
		"run timeout that does not fit in the Job deadline": `
kinds:
  upgrade-v9: {namespace: sandbox-runs, podTemplate: operator-runner, command: upgrade-v9, maxActive: 1, runTimeout: 811s}
`,
		"kind without command": `
kinds:
  upgrade-v9: {namespace: sandbox-runs, podTemplate: operator-runner, maxActive: 1, runTimeout: 60s}
`,
		"kind without capacity": `
kinds:
  upgrade-v9: {namespace: sandbox-runs, podTemplate: operator-runner, command: x, runTimeout: 60s}
`,
		"requiresArchive that is no boolean": `
kinds:
  upgrade-v9: {namespace: sandbox-runs, podTemplate: operator-runner, command: x, requiresArchive: maybe,
    maxActive: 1, runTimeout: 60s}
`,
		"label that is no camelCase name": kindsFile + "    labels: [repo-owner]\n",
		"label that the operator sets":    kindsFile + "    labels: [org, caller]\n",
		"label twice":                     kindsFile + "    labels: [org, org]\n",
		"args, which no kind accepts":     kindsFile + "    args: [target]\n",
		"caller with the engine's ServiceAccount": `
callers:
  assistant:
    serviceAccount: system:serviceaccount:operator-workflow-engine:operator-workflow-engine
`,
		"caller id that is no engine namespace": `
callers:
  Assistant:
    serviceAccount: system:serviceaccount:default:a
`,
		"unknown key": `
engineAddress: http://typo
`,
		"engine URL without scheme": `
engineURL: operator-workflow-engine:9090
`,
		"unknown handler group": `
handlerGroups: [runs, maskinporten]
`,
		"no handler group": `
handlerGroups: []
`,
	}
	for name, content := range cases {
		t.Run(name, func(t *testing.T) {
			RegisterTestingT(t)
			_, err := LoadFrom(writeFiles(t, map[string]string{"config.yaml": content}))
			Expect(err).To(HaveOccurred())
		})
	}
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

// The base config in config/base is what every environment starts from, and all staging has.
func TestBaseManifestConfigLoads(t *testing.T) {
	RegisterTestingT(t)

	cfg, err := LoadFrom(copyConfig(t, "base/config.yaml"))
	Expect(err).NotTo(HaveOccurred())
	Expect(cfg.Kinds).To(BeEmpty(), "staging has no sandbox nodes, so the base has no kinds")
	Expect(cfg.Callers).To(HaveKey("assistant"))
	Expect(cfg.Callers).To(HaveKey("designer"))
}

func TestOverlayConfigsLoad(t *testing.T) {
	for overlay, maxActive := range map[string]int{"dev": 2, "prod": 4} {
		t.Run(overlay, func(t *testing.T) {
			RegisterTestingT(t)
			dir := copyConfig(t, "base/config.yaml", overlay+"/kinds.yaml")
			cfg, err := LoadFrom(dir)
			Expect(err).NotTo(HaveOccurred())
			Expect(cfg.Kinds).To(HaveKey("upgrade-v9"))
			Expect(cfg.Kinds["upgrade-v9"].MaxActive).To(Equal(maxActive))
			// Each caller leaves a slot for the other.
			Expect(cfg.Kinds["upgrade-v9"].MaxActivePerCaller).To(Equal(maxActive - 1))
			Expect(cfg.Kinds["upgrade-v9"].RunTimeout).To(Equal(660 * time.Second))
			Expect(cfg.KindsFor("assistant")).To(Equal([]string{"upgrade-v9"}))
			Expect(cfg.KindsFor("designer")).To(Equal([]string{"upgrade-v9"}))
		})
	}
}
