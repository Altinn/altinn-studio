// Package config loads the operator's configuration: the YAML files of its ConfigMap, merged in name order.
package config

import (
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"sort"
	"strings"
	"time"

	"github.com/go-viper/mapstructure/v2"
	"github.com/knadh/koanf/parsers/yaml"
	"github.com/knadh/koanf/providers/file"
	"github.com/knadh/koanf/v2"
)

// DirEnv names the environment variable with the folder of the YAML files. The Deployment mounts the ConfigMap there.
const DirEnv = "CORE_OPERATOR_CONFIG_DIR"

const (
	defaultDir                  = "/etc/core-operator"
	defaultEngineURL            = "http://operator-workflow-engine.operator-workflow-engine.svc.cluster.local:9090"
	defaultEngineServiceAccount = "system:serviceaccount:operator-workflow-engine:operator-workflow-engine"
	defaultAudience             = "core-operator"
	defaultAPIAddress           = ":8080"
	defaultCallbackAddress      = ":8090"
	defaultProbeAddress         = ":8081"
	defaultQueueTimeout         = 15 * time.Minute
	defaultMaxQueuedPerCaller   = 10

	// MaxJobDeadline is the longest activeDeadlineSeconds of a run Job that the admission policy in
	// src/core/operator-runner/infra accepts.
	MaxJobDeadline = 1800 * time.Second
	// PodBudget is how long a run may wait for its pod to be ready, which includes the image import on a new node.
	// It is the wait budget of run.await-pod.
	PodBudget = 5 * time.Minute
	// UploadTimeout is how long a run of a kind that takes an archive waits for it once its pod is ready. It is the
	// wait budget of run.await-archive. The operator runner's REQUEST_TIMEOUT_SECONDS in src/core/operator-runner/infra
	// is a minute longer.
	UploadTimeout = 5 * time.Minute
	// ResultTimeout is how long the caller can fetch the result after the run ended. The operator runner keeps a result
	// that no one fetched as long, with RESULT_RETENTION_SECONDS in src/core/operator-runner/infra, and then exits.
	ResultTimeout = 5 * time.Minute
	// ResultGrace is how long the operator runner keeps the result after the first fetch, for a fetch that broke off.
	ResultGrace = 30 * time.Second
	// JobDeadlineSlack covers the engine's time between the steps.
	JobDeadlineSlack = time.Minute
	// MaxRunTimeout is the longest run timeout whose Job deadline fits under MaxJobDeadline: the time to start the
	// pod, to receive the archive, to run the command and to keep the result. Kubernetes stops a Job at its deadline,
	// which must not come before the operator runner has handed over the result.
	MaxRunTimeout = MaxJobDeadline - PodBudget - UploadTimeout - ResultTimeout - ResultGrace - JobDeadlineSlack
	// MaxLabels is the most labels a kind may have, and so the most a caller may send.
	MaxLabels = 16
	// MaxNameLength keeps a kind name a Kubernetes label value.
	MaxNameLength = 63
)

// GroupRuns is the handler group for sandbox runs: the run API, the run.* callbacks and the garbage collector.
const GroupRuns = "runs"

// knownGroups are the handler groups that handlerGroups may turn on.
var knownGroups = []string{GroupRuns}

var (
	errInvalid = errors.New("invalid configuration")
	// A caller id is part of the engine namespace runs-<caller>, and a kind name is a Kubernetes label value.
	namePattern = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)
	// A label key is camelCase, as the keys the operator sets itself are.
	labelKeyPattern = regexp.MustCompile(`^[a-z][A-Za-z0-9]*$`)
)

// ReservedLabels are the labels that the operator puts on each run's workflow itself, so no kind may have them.
var ReservedLabels = []string{"runId", "kind", "caller"}

type Config struct {
	Callers              map[string]Caller `koanf:"callers"`
	Kinds                map[string]Kind   `koanf:"kinds"`
	EngineURL            string            `koanf:"engineURL"`
	EngineServiceAccount string            `koanf:"engineServiceAccount"`
	Audience             string            `koanf:"audience"`
	APIAddress           string            `koanf:"apiAddress"`
	CallbackAddress      string            `koanf:"callbackAddress"`
	ProbeAddress         string            `koanf:"probeAddress"`
	HandlerGroups        []string          `koanf:"handlerGroups"`
}

// Caller is a service that may use the run API. Its id is its key in Config.Callers.
type Caller struct {
	// ServiceAccount is the user name that a TokenReview returns for the caller's token.
	ServiceAccount string `koanf:"serviceAccount"`
	// Kinds are the kinds the caller may run. A kind that this environment does not configure is left out.
	Kinds []string `koanf:"kinds"`
}

// Kind is an entry of the run catalog. Its name is its key in Config.Kinds.
type Kind struct {
	// Namespace holds the PodTemplate and the run Jobs.
	Namespace   string `koanf:"namespace"`
	PodTemplate string `koanf:"podTemplate"`
	// Command is the operator runner's id of the command that a run of this kind runs.
	Command string `koanf:"command"`
	// Labels are the keys of the labels of each run of this kind, such as the app and the commit. The caller sends a
	// value for each and no other key. A caller finds its runs again by them, and the command never sees them.
	Labels             []string      `koanf:"labels"`
	MaxActive          int           `koanf:"maxActive"`
	MaxActivePerCaller int           `koanf:"maxActivePerCaller"`
	MaxQueuedPerCaller int           `koanf:"maxQueuedPerCaller"`
	QueueTimeout       time.Duration `koanf:"queueTimeout"`
	RunTimeout         time.Duration `koanf:"runTimeout"`
	// RequiresArchive says whether the command runs on the files of the caller's archive, so a run waits for the
	// caller's upload. When false, the default, the operator starts the command as soon as the pod is ready.
	RequiresArchive bool `koanf:"requiresArchive"`
}

// Load reads the configuration from the folder that DirEnv names. A missing folder gives the defaults, which is what a
// local run without a ConfigMap wants.
func Load() (*Config, error) {
	dir := os.Getenv(DirEnv)
	if dir == "" {
		dir = defaultDir
	}
	return LoadFrom(dir)
}

// LoadFrom reads the *.yaml files in dir in name order, each overriding the keys it sets. The overlays of each
// environment add a file, so they can add a kind without repeating the base file.
func LoadFrom(dir string) (*Config, error) {
	k := koanf.New(".")

	files, err := filepath.Glob(filepath.Join(dir, "*.yaml"))
	if err != nil {
		return nil, fmt.Errorf("list configuration files: %w", err)
	}
	sort.Strings(files)
	for _, path := range files {
		if loadErr := k.Load(file.Provider(path), yaml.Parser()); loadErr != nil {
			return nil, fmt.Errorf("load %s: %w", path, loadErr)
		}
	}

	var cfg Config
	err = k.UnmarshalWithConf("", &cfg, koanf.UnmarshalConf{
		DecoderConfig: &mapstructure.DecoderConfig{
			DecodeHook:       mapstructure.StringToTimeDurationHookFunc(),
			Result:           &cfg,
			WeaklyTypedInput: true,
			ErrorUnused:      true,
		},
	})
	if err != nil {
		return nil, fmt.Errorf("decode configuration: %w", err)
	}

	cfg.applyDefaults()
	if err := cfg.Validate(); err != nil {
		return nil, err
	}
	return &cfg, nil
}

func (c *Config) applyDefaults() {
	setDefault(&c.EngineURL, defaultEngineURL)
	setDefault(&c.EngineServiceAccount, defaultEngineServiceAccount)
	setDefault(&c.Audience, defaultAudience)
	setDefault(&c.APIAddress, defaultAPIAddress)
	setDefault(&c.CallbackAddress, defaultCallbackAddress)
	setDefault(&c.ProbeAddress, defaultProbeAddress)
	if c.HandlerGroups == nil {
		c.HandlerGroups = []string{GroupRuns}
	}
	for name, kind := range c.Kinds {
		if kind.MaxActivePerCaller == 0 {
			kind.MaxActivePerCaller = kind.MaxActive
		}
		if kind.MaxQueuedPerCaller == 0 {
			kind.MaxQueuedPerCaller = defaultMaxQueuedPerCaller
		}
		if kind.QueueTimeout == 0 {
			kind.QueueTimeout = defaultQueueTimeout
		}
		c.Kinds[name] = kind
	}
}

func setDefault(value *string, fallback string) {
	if *value == "" {
		*value = fallback
	}
}

// Validate checks what the operator relies on. It returns all problems at once, so one deploy shows them all.
func (c *Config) Validate() error {
	var problems []string
	if u, err := url.Parse(c.EngineURL); err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
		problems = append(problems, fmt.Sprintf("engineURL %q is not an http(s) URL", c.EngineURL))
	}
	if len(c.HandlerGroups) == 0 {
		problems = append(problems, "handlerGroups is empty, so the process would serve nothing")
	}
	for _, group := range c.HandlerGroups {
		if !slices.Contains(knownGroups, group) {
			problems = append(problems, fmt.Sprintf("handlerGroups has the unknown group %q", group))
		}
	}
	problems = append(problems, c.callerProblems()...)
	for name, kind := range c.Kinds {
		problems = append(problems, kindProblems(name, kind)...)
	}
	if len(problems) == 0 {
		return nil
	}
	slices.Sort(problems)
	return fmt.Errorf("%w: %s", errInvalid, strings.Join(problems, "; "))
}

func (c *Config) callerProblems() []string {
	var problems []string
	serviceAccounts := map[string]string{c.EngineServiceAccount: "the engine"}
	for id, caller := range c.Callers {
		if !namePattern.MatchString(id) {
			problems = append(problems, fmt.Sprintf("caller id %q must be lowercase letters, digits and dashes", id))
		}
		if caller.ServiceAccount == "" {
			problems = append(problems, fmt.Sprintf("caller %s has no serviceAccount", id))
			continue
		}
		if other, ok := serviceAccounts[caller.ServiceAccount]; ok {
			problems = append(problems, fmt.Sprintf("caller %s has the serviceAccount of %s", id, other))
		}
		serviceAccounts[caller.ServiceAccount] = "caller " + id
	}
	return problems
}

func kindProblems(name string, kind Kind) []string {
	var problems []string
	if !ValidName(name) {
		problems = append(problems, fmt.Sprintf("kind name %q must be a lowercase DNS label", name))
	}
	if kind.Namespace == "" || kind.PodTemplate == "" || kind.Command == "" {
		problems = append(problems, fmt.Sprintf("kind %s needs namespace, podTemplate and command", name))
	}
	if kind.MaxActive < 1 || kind.MaxActivePerCaller < 1 || kind.MaxQueuedPerCaller < 1 {
		problems = append(problems,
			fmt.Sprintf("kind %s needs maxActive, maxActivePerCaller and maxQueuedPerCaller of at least 1", name))
	}
	if kind.RunTimeout <= 0 || kind.RunTimeout > MaxRunTimeout {
		problems = append(
			problems,
			fmt.Sprintf("kind %s needs a runTimeout above 0 and at most %s", name, MaxRunTimeout),
		)
	}
	if kind.QueueTimeout <= 0 {
		problems = append(problems, fmt.Sprintf("kind %s needs a positive queueTimeout", name))
	}
	return append(problems, labelProblems(name, kind.Labels)...)
}

func labelProblems(kindName string, labels []string) []string {
	var problems []string
	if len(labels) > MaxLabels {
		problems = append(problems, fmt.Sprintf("kind %s has more than %d labels", kindName, MaxLabels))
	}
	for i, label := range labels {
		if !ValidLabelKey(label) {
			problems = append(problems, fmt.Sprintf(
				"kind %s has the label %q, which is not a camelCase name or is one that the operator sets",
				kindName,
				label,
			))
		}
		if slices.Contains(labels[:i], label) {
			problems = append(problems, fmt.Sprintf("kind %s has the label %s twice", kindName, label))
		}
	}
	return problems
}

// ValidLabelKey reports whether key can be the key of a run's label: a camelCase name of at most MaxNameLength
// characters that the operator does not set itself.
func ValidLabelKey(key string) bool {
	return labelKeyPattern.MatchString(key) && len(key) <= MaxNameLength && !slices.Contains(ReservedLabels, key)
}

// ValidName reports whether name is a lowercase DNS label, as the names of kinds are.
func ValidName(name string) bool {
	return namePattern.MatchString(name) && len(name) <= MaxNameLength
}

// CallerByServiceAccount returns the id of the caller with the user name of a reviewed token.
func (c *Config) CallerByServiceAccount(username string) (string, bool) {
	for id, caller := range c.Callers {
		if caller.ServiceAccount == username {
			return id, true
		}
	}
	return "", false
}

// KindFor returns a kind the caller may run. found is false when this environment does not configure the kind, and
// allowed is false when it does but not for this caller.
func (c *Config) KindFor(callerID, name string) (kind Kind, found bool, allowed bool) {
	kind, found = c.Kinds[name]
	if !found {
		return Kind{}, false, false
	}
	caller, ok := c.Callers[callerID]
	return kind, true, ok && slices.Contains(caller.Kinds, name)
}

// KindsFor lists the names of the configured kinds the caller may run, sorted.
func (c *Config) KindsFor(callerID string) []string {
	var names []string
	for _, name := range c.Callers[callerID].Kinds {
		if _, ok := c.Kinds[name]; ok && !slices.Contains(names, name) {
			names = append(names, name)
		}
	}
	slices.Sort(names)
	return names
}

// KindNamespaces lists the namespaces of the configured kinds, sorted. The operator reads Jobs and pods only there.
func (c *Config) KindNamespaces() []string {
	var namespaces []string
	for _, kind := range c.Kinds {
		if !slices.Contains(namespaces, kind.Namespace) {
			namespaces = append(namespaces, kind.Namespace)
		}
	}
	slices.Sort(namespaces)
	return namespaces
}

// HandlerGroupEnabled reports whether this process serves a handler group.
func (c *Config) HandlerGroupEnabled(group string) bool {
	return slices.Contains(c.HandlerGroups, group)
}
