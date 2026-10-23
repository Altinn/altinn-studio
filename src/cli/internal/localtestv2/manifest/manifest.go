// Package manifest holds the localtest-v2 manifest: the stack's containers (image, environment, start order, volumes,
// port and health) and the groups that select them. studioctl's localtest-v2 runtime starts the stack from it; the
// manifest is embedded, and README.md beside it describes the format.
package manifest

import (
	"bytes"
	_ "embed"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"maps"
	"regexp"
	"slices"
	"strings"
	"sync"
)

const (
	// DefaultGroup is the group that is always on.
	DefaultGroup = "default"
	// DefaultPort is a container's HTTP port when the manifest names none.
	DefaultPort = 8080
	// DefaultHealth is a container's health path when the manifest names none.
	DefaultHealth = "/health"
	// HealthTCP is the health of a container that is up once its port accepts a connection (Postgres, Redis).
	HealthTCP = "tcp"

	maxPort = 65535
)

//go:embed manifest.json
var manifestJSON []byte

// volumeID is a volume id: lower-case letters and digits in hyphen-separated words (postgres-data). Each runtime
// names the volume by its own prefix and the id, so the two runtimes' data never mixes.
var volumeID = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)

var (
	errInvalid    = errors.New("invalid localtest-v2 manifest")
	errReference  = errors.New("unknown container")
	errDuplicate  = errors.New("duplicate")
	errCycle      = errors.New("dependency cycle")
	errUnreached  = errors.New("container no group reaches")
	errValue      = errors.New("bad value")
	errNoDefault  = errors.New("no " + DefaultGroup + " group")
	errUnknownKey = errors.New("unknown key")
)

// Manifest is the parsed manifest.
type Manifest struct {
	// Containers are the containers by name.
	Containers map[string]Container
	// Groups are the groups in file order.
	Groups []Group
	// names are the container names in file order.
	names []string
}

// Group names the root containers of one group; the group starts them and their transitive dependencies.
type Group struct {
	Name       string   `json:"name"`
	Containers []string `json:"containers"`
}

// Container is one container: its image, environment, start order, volumes, port and health.
type Container struct {
	// Envs are the container's environment variables, literal strings.
	Envs map[string]string `json:"envs"`
	// Volumes maps a volume id to where the volume is mounted in the container. The id names one volume for the whole
	// manifest (containers naming the same id share it); the runtime prefixes it with its own prefix.
	Volumes map[string]string `json:"volumes"`
	// Registry is the image repository, with the registry host.
	Registry string `json:"registry"`
	// Tag is the image tag (a digest may follow it: "7.2-alpine@sha256:...").
	Tag string `json:"tag"`
	// Health is an HTTP path answering 200 when the container is healthy, or HealthTCP; empty is DefaultHealth.
	Health string `json:"health"`
	// DependsOn are the containers that start before this one.
	DependsOn []string `json:"dependsOn"`
	// Port is the container port the health check and the services__ variables use; zero is DefaultPort.
	Port int `json:"port"`
}

// Image is the container's image reference.
func (c Container) Image() string {
	return c.Registry + ":" + c.Tag
}

// HTTPPort is the container's port, with the default applied.
func (c Container) HTTPPort() int {
	if c.Port == 0 {
		return DefaultPort
	}
	return c.Port
}

// HealthCheck is the container's health, with the default applied: an HTTP path, or HealthTCP.
func (c Container) HealthCheck() string {
	if c.Health == "" {
		return DefaultHealth
	}
	return c.Health
}

// IsHTTP reports whether the container is an HTTP service: one with an HTTP health path. Every running HTTP container
// is announced to the others by a services__<name>__http__0 variable.
func (c Container) IsHTTP() bool {
	return c.HealthCheck() != HealthTCP
}

// loadDefault parses the embedded manifest on first use; the runtime asks for it many times per command.
//
//nolint:gochecknoglobals // A parse-once cache of embedded, immutable data.
var loadDefault = sync.OnceValues(func() (*Manifest, error) {
	return Parse(manifestJSON)
})

// Default returns the embedded manifest, parsed and checked once.
func Default() (*Manifest, error) {
	return loadDefault()
}

// MustDefault returns the embedded manifest and panics when it is invalid, which only a change to the embedded file can
// cause and the package's tests catch.
func MustDefault() *Manifest {
	m, err := Default()
	if err != nil {
		panic(err)
	}
	return m
}

// Parse reads a manifest and checks it: known keys only, every reference resolves, no dependency cycle, every container
// reached by a group, and the values in range.
func Parse(data []byte) (*Manifest, error) {
	var file struct {
		Containers json.RawMessage `json:"containers"`
		Groups     []Group         `json:"groups"`
	}
	if err := strictDecode(data, &file); err != nil {
		return nil, fmt.Errorf("%w: %w", errInvalid, err)
	}
	m := &Manifest{Containers: map[string]Container{}, Groups: file.Groups, names: nil}
	if err := m.readContainers(file.Containers); err != nil {
		return nil, fmt.Errorf("%w: %w", errInvalid, err)
	}
	if err := m.check(); err != nil {
		return nil, fmt.Errorf("%w: %w", errInvalid, err)
	}
	return m, nil
}

func strictDecode(data []byte, v any) error {
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(v); err != nil {
		if strings.Contains(err.Error(), "unknown field") {
			return fmt.Errorf("%w: %w", errUnknownKey, err)
		}
		return fmt.Errorf("decode: %w", err)
	}
	if _, err := decoder.Token(); !errors.Is(err, io.EOF) {
		return fmt.Errorf("%w: trailing data", errValue)
	}
	return nil
}

// Names lists the containers in file order.
func (m *Manifest) Names() []string {
	return slices.Clone(m.names)
}

// GroupNames lists the groups in file order.
func (m *Manifest) GroupNames() []string {
	names := make([]string, 0, len(m.Groups))
	for _, g := range m.Groups {
		names = append(names, g.Name)
	}
	return names
}

// Group returns the named group.
func (m *Manifest) Group(name string) (Group, bool) {
	for _, g := range m.Groups {
		if g.Name == name {
			return g, true
		}
	}
	return Group{Name: "", Containers: nil}, false
}

// VolumeIDs lists every volume id, sorted; an id several containers name is listed once.
func (m *Manifest) VolumeIDs() []string {
	set := map[string]bool{}
	for _, c := range m.Containers {
		for id := range c.Volumes {
			set[id] = true
		}
	}
	return slices.Sorted(maps.Keys(set))
}

// Select returns the containers the named groups start, in start order: the groups' roots and their transitive
// dependencies, every container after the ones it depends on, ties in file order. Unknown group names are ignored; the
// caller validates them.
func (m *Manifest) Select(groups []string) []string {
	selected := map[string]bool{}
	var visit func(name string)
	visit = func(name string) {
		if selected[name] {
			return
		}
		selected[name] = true
		for _, dep := range m.Containers[name].DependsOn {
			visit(dep)
		}
	}
	for _, name := range groups {
		if g, ok := m.Group(name); ok {
			for _, root := range g.Containers {
				visit(root)
			}
		}
	}
	return m.startOrder(selected)
}

// readContainers reads the containers object, keeping the file order of its keys.
func (m *Manifest) readContainers(data json.RawMessage) error {
	if len(data) == 0 {
		return fmt.Errorf("%w: no containers", errValue)
	}
	decoder := json.NewDecoder(bytes.NewReader(data))
	if tok, err := decoder.Token(); err != nil || tok != json.Delim('{') {
		return fmt.Errorf("%w: containers is not an object", errValue)
	}
	for decoder.More() {
		tok, err := decoder.Token()
		if err != nil {
			return fmt.Errorf("containers: %w", err)
		}
		name, ok := tok.(string)
		if !ok {
			return fmt.Errorf("%w: container name %v", errValue, tok)
		}
		var raw json.RawMessage
		if err := decoder.Decode(&raw); err != nil {
			return fmt.Errorf("container %s: %w", name, err)
		}
		var c Container
		if err := strictDecode(raw, &c); err != nil {
			return fmt.Errorf("container %s: %w", name, err)
		}
		if _, dup := m.Containers[name]; dup {
			return fmt.Errorf("%w container %s", errDuplicate, name)
		}
		m.Containers[name] = c
		m.names = append(m.names, name)
	}
	return nil
}

// startOrder lists the selected containers so that each comes after its dependencies, ties in file order.
func (m *Manifest) startOrder(selected map[string]bool) []string {
	done := map[string]bool{}
	var order []string
	for len(order) < len(selected) {
		progressed := false
		for _, name := range m.names {
			if !selected[name] || done[name] {
				continue
			}
			ready := true
			for _, dep := range m.Containers[name].DependsOn {
				if !done[dep] {
					ready = false
					break
				}
			}
			if ready {
				done[name] = true
				order = append(order, name)
				progressed = true
			}
		}
		if !progressed {
			// Only a cycle stops progress, and check refuses cycles.
			break
		}
	}
	return order
}

func (m *Manifest) check() error {
	if err := m.checkContainers(); err != nil {
		return err
	}
	if err := m.checkGroups(); err != nil {
		return err
	}
	all := map[string]bool{}
	for _, name := range m.names {
		all[name] = true
	}
	if len(m.startOrder(all)) != len(m.names) {
		return fmt.Errorf("%w among %s", errCycle, strings.Join(m.cycleMembers(), ", "))
	}
	reached := map[string]bool{}
	for _, name := range m.Select(m.GroupNames()) {
		reached[name] = true
	}
	for _, name := range m.names {
		if !reached[name] {
			return fmt.Errorf("%w: %s", errUnreached, name)
		}
	}
	return nil
}

// cycleMembers are the containers startOrder cannot place, for the cycle error.
func (m *Manifest) cycleMembers() []string {
	all := map[string]bool{}
	for _, name := range m.names {
		all[name] = true
	}
	placed := map[string]bool{}
	for _, name := range m.startOrder(all) {
		placed[name] = true
	}
	var out []string
	for _, name := range m.names {
		if !placed[name] {
			out = append(out, name)
		}
	}
	return out
}

func (m *Manifest) checkContainers() error {
	if len(m.names) == 0 {
		return fmt.Errorf("%w: no containers", errValue)
	}
	for _, name := range m.names {
		c := m.Containers[name]
		if err := checkContainer(name, c); err != nil {
			return fmt.Errorf("container %s: %w", name, err)
		}
		seen := map[string]bool{}
		for _, dep := range c.DependsOn {
			if _, ok := m.Containers[dep]; !ok || dep == name {
				return fmt.Errorf("container %s: dependsOn: %w %q", name, errReference, dep)
			}
			if seen[dep] {
				return fmt.Errorf("container %s: dependsOn: %w %q", name, errDuplicate, dep)
			}
			seen[dep] = true
		}
	}
	return nil
}

func checkContainer(name string, c Container) error {
	if name == "" || strings.TrimSpace(name) != name || strings.ContainsAny(name, " /:") {
		return fmt.Errorf("%w: name %q", errValue, name)
	}
	if err := checkImage(c); err != nil {
		return err
	}
	return checkEnvsAndVolumes(c)
}

func checkImage(c Container) error {
	if strings.TrimSpace(c.Registry) == "" || strings.Contains(c.Registry, " ") {
		return fmt.Errorf("%w: registry %q", errValue, c.Registry)
	}
	if strings.TrimSpace(c.Tag) == "" || strings.Contains(c.Tag, " ") {
		return fmt.Errorf("%w: tag %q", errValue, c.Tag)
	}
	if c.Port < 0 || c.Port > maxPort {
		return fmt.Errorf("%w: port %d", errValue, c.Port)
	}
	if c.Health != "" && c.Health != HealthTCP && !strings.HasPrefix(c.Health, "/") {
		return fmt.Errorf("%w: health %q is neither a path nor %q", errValue, c.Health, HealthTCP)
	}
	return nil
}

func checkEnvsAndVolumes(c Container) error {
	for key := range c.Envs {
		if key == "" || strings.ContainsAny(key, "= ") {
			return fmt.Errorf("%w: envs key %q", errValue, key)
		}
	}
	for id, target := range c.Volumes {
		if !volumeID.MatchString(id) || !strings.HasPrefix(target, "/") {
			return fmt.Errorf("%w: volume %q at %q", errValue, id, target)
		}
	}
	return nil
}

func (m *Manifest) checkGroups() error {
	names := map[string]bool{}
	for _, g := range m.Groups {
		if g.Name == "" {
			return fmt.Errorf("%w: a group without a name", errValue)
		}
		if names[g.Name] {
			return fmt.Errorf("%w group %s", errDuplicate, g.Name)
		}
		names[g.Name] = true
		if len(g.Containers) == 0 {
			return fmt.Errorf("%w: group %s has no containers", errValue, g.Name)
		}
		for _, name := range g.Containers {
			if _, ok := m.Containers[name]; !ok {
				return fmt.Errorf("group %s: %w %q", g.Name, errReference, name)
			}
		}
	}
	if !names[DefaultGroup] {
		return errNoDefault
	}
	return nil
}
