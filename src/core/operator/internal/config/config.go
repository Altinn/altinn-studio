// Package config loads the configuration of the operator from the YAML files of its ConfigMap, in name order.
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
	defaultEngineURL            = "http://operator-workflow-engine.operator-workflow-engine.svc:9090"
	defaultEngineServiceAccount = "system:serviceaccount:operator-workflow-engine:operator-workflow-engine"
	defaultAudience             = "operator"
	defaultAPIAddress           = ":8080"
	defaultCallbackAddress      = ":8090"
	defaultProbeAddress         = ":8081"
	defaultQueueTimeout         = 15 * time.Minute
	defaultMaxQueuedPerCaller   = 10

	// MaxJobDeadline is the longest activeDeadlineSeconds of a run Job that the admission policy in
	// src/core/operator-runner/infra accepts.
	MaxJobDeadline = 1800 * time.Second
	// PodBudget is how long a run can wait for its pod to be ready. This includes the image import on a new node. It is
	// the wait budget of run.await-pod.
	PodBudget = 5 * time.Minute
	// UploadTimeout is how long a run waits for its archive after its pod is ready, if the kind takes an archive. It is
	// the wait budget of run.await-archive.
	UploadTimeout = 5 * time.Minute
	// ResultTimeout is how long the caller can fetch the result after the run ends. The operator runner keeps the
	// result for this time.
	ResultTimeout = 5 * time.Minute
	// ResultGrace is how long the operator runner keeps the result after the first fetch, for an interrupted fetch. The
	// kube tests compare these three times with the PodTemplate of the operator runner.
	ResultGrace = 30 * time.Second
	// MaxLabels is the maximum number of labels for a kind, and so for a caller to send.
	MaxLabels = 16
	// MaxNameLength makes sure that a kind name is a valid Kubernetes label value.
	MaxNameLength = 63
)

// JobDeadline is the deadline of the Job of a run. It adds the times to start the pod, to receive the archive, to run
// the command and to keep the result. It also adds one minute for the engine between the steps. Kubernetes stops a Job
// at its deadline. The deadline must not come before the operator runner gives the result.
func JobDeadline(runTimeout time.Duration) time.Duration {
	return PodBudget + UploadTimeout + runTimeout + ResultTimeout + ResultGrace + time.Minute
}

// GroupRuns is the handler group for sandbox runs. It has the run API, the run.* callbacks and the garbage collector.
const GroupRuns = "runs"

// knownGroups are the handler groups that handlerGroups can enable.
var knownGroups = []string{GroupRuns}

var (
	errInvalid = errors.New("invalid configuration")
	// A caller id is part of the engine namespace runs-<caller>, and a kind name is a Kubernetes label value.
	namePattern = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)
	// A label key is camelCase, as are the keys that the operator sets.
	labelKeyPattern = regexp.MustCompile(`^[a-z][A-Za-z0-9]*$`)
)

// ReservedLabels are the labels that the operator itself puts on the workflow of each run. A kind must not have them.
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
	// TimeScale shortens the waits and budgets of the operator by this factor, so that a run takes seconds. Only the
	// integration test in cmd/ sets it. A configuration file cannot set it. Zero does not change them.
	TimeScale float64 `koanf:"-"`
}

// Caller is a service that may use the run API. Its id is its key in Config.Callers.
type Caller struct {
	// ServiceAccount is the user name that a TokenReview returns for the caller's token.
	ServiceAccount string `koanf:"serviceAccount"`
	// Kinds are the kinds the caller may run. The operator ignores a kind that this environment does not configure.
	Kinds []string `koanf:"kinds"`
}

// Kind is an entry of the run catalog. Its name is its key in Config.Kinds.
type Kind struct {
	// Namespace holds the PodTemplate and the run Jobs.
	Namespace   string `koanf:"namespace"`
	PodTemplate string `koanf:"podTemplate"`
	// Command is the operator runner's id of the command that a run of this kind runs.
	Command string `koanf:"command"`
	// Labels are the label keys of each run of this kind. The caller sends a value for each and no other key.
	Labels []string `koanf:"labels"`
	// MaxActivePerCaller limits the sandbox slots that the runs of one caller can use. Zero sets no limit.
	MaxActivePerCaller int           `koanf:"maxActivePerCaller"`
	MaxQueuedPerCaller int           `koanf:"maxQueuedPerCaller"`
	QueueTimeout       time.Duration `koanf:"queueTimeout"`
	// RunTimeout is how long the operator runner lets the command run.
	RunTimeout time.Duration `koanf:"runTimeout"`
	// RequiresArchive tells if the command runs on the archive of the caller. If false, the operator starts the command
	// when the pod is ready.
	RequiresArchive bool `koanf:"requiresArchive"`
}

// Load reads the configuration from the folder that DirEnv names. A missing folder gives the defaults. A local run
// without a ConfigMap needs this.
func Load() (*Config, error) {
	dir := os.Getenv(DirEnv)
	if dir == "" {
		dir = defaultDir
	}
	return LoadFrom(dir)
}

// LoadFrom reads the *.yaml files in dir in name order. Each file overrides the keys that it sets. The overlay of each
// environment adds a file, so that it can add a kind and not repeat the base file.
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

// Validate checks the values that the operator needs. It returns all problems together, so that one deploy shows all of
// them.
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
		if !ValidName(id) {
			problems = append(problems, fmt.Sprintf("caller id %q must be a lowercase DNS label", id))
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
	if kind.MaxActivePerCaller < 0 {
		problems = append(problems, fmt.Sprintf("kind %s needs a maxActivePerCaller of 0 or more", name))
	}
	if kind.MaxQueuedPerCaller < 1 {
		problems = append(problems, fmt.Sprintf("kind %s needs a maxQueuedPerCaller of at least 1", name))
	}
	if kind.RunTimeout <= 0 || JobDeadline(kind.RunTimeout) > MaxJobDeadline {
		longest := MaxJobDeadline - JobDeadline(0)
		problems = append(problems, fmt.Sprintf("kind %s needs a runTimeout above 0 and at most %s", name, longest))
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

// ValidLabelKey reports whether key can be the key of a run label. The key must be a camelCase name of at most
// MaxNameLength characters, and the operator must not set it.
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

func (c *Config) HandlerGroupEnabled(group string) bool {
	return slices.Contains(c.HandlerGroups, group)
}
