package envtopology

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"altinn.studio/studioctl/internal/osutil"
)

const (
	// BoundTopologyConfigVersion is the current generated topology config version.
	BoundTopologyConfigVersion = 1

	// BoundTopologyConfigDirName is the generated config directory under the studioctl data dir.
	BoundTopologyConfigDirName = "generated/topology"

	// BoundTopologyBaseConfigFileName is the app-manager input config file.
	BoundTopologyBaseConfigFileName = "env.json"

	// BoundTopologyConfigFileName is the bound config consumed by localtest.
	BoundTopologyConfigFileName = "result.json"

	// BoundTopologyContainerDir is the localtest mount point for generated topology config.
	BoundTopologyContainerDir = "/studioctl/topology"

	// BoundTopologyBaseConfigContainerPath is the in-container app-manager input config path.
	BoundTopologyBaseConfigContainerPath = BoundTopologyContainerDir + "/" + BoundTopologyBaseConfigFileName

	// BoundTopologyConfigContainerPath is the in-container bound config path.
	BoundTopologyConfigContainerPath = BoundTopologyContainerDir + "/" + BoundTopologyConfigFileName

	// BoundTopologyOptionsBaseConfigPathEnv is the env var key for the base config path.
	BoundTopologyOptionsBaseConfigPathEnv = "BoundTopologyOptions__BaseConfigPath"

	// BoundTopologyOptionsConfigPathEnv is the env var key for the bound config path.
	BoundTopologyOptionsConfigPathEnv = "BoundTopologyOptions__ConfigPath"
)

// DestinationLocation describes where a route currently resolves.
type DestinationLocation string

const (
	// DestinationLocationEnv routes to the local environment side of the topology boundary.
	DestinationLocationEnv DestinationLocation = "env"

	// DestinationLocationHost routes to the host side of the topology boundary.
	DestinationLocationHost DestinationLocation = "host"
)

// DestinationKind describes how a route destination is reached.
type DestinationKind string

const (
	// DestinationKindHTTP routes to a concrete HTTP base URL.
	DestinationKindHTTP DestinationKind = "http"
)

// Binding describes one topology component together with its resolved runtime target.
type Binding struct {
	ComponentID ComponentID
	Host        string
	PathPrefix  string
	Destination BoundTopologyDestination
	Enabled     bool
}

// RuntimeBinding describes how one topology component is bound in a concrete environment runtime.
type RuntimeBinding struct {
	ComponentID ComponentID
	Destination BoundTopologyDestination
	Enabled     bool
}

// BoundTopologyConfig is the shared bound topology configuration for localtest and app-manager.
type BoundTopologyConfig struct {
	AppRouteTemplate BoundTopologyAppRouteTemplate `json:"appRouteTemplate"`
	Routes           []BoundTopologyRoute          `json:"routes"`
	Version          int                           `json:"version"`
}

// BoundTopologyAppRouteTemplate describes how discovered apps become concrete routes.
type BoundTopologyAppRouteTemplate struct {
	Host               string `json:"host"`
	PathPrefixTemplate string `json:"pathPrefixTemplate"`
}

// BoundTopologyRoute describes one externally exposed route.
type BoundTopologyRoute struct {
	Destination BoundTopologyDestination `json:"destination"`
	Match       BoundTopologyRouteMatch  `json:"match"`
	Component   ComponentID              `json:"component"`
	Metadata    []BoundTopologyMetadata  `json:"metadata,omitempty"`
	Enabled     bool                     `json:"enabled"`
}

// BoundTopologyMetadata describes one ordered metadata entry on a route.
type BoundTopologyMetadata struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

// BoundTopologyRouteMatch identifies which incoming requests belong to a route.
type BoundTopologyRouteMatch struct {
	Host       string `json:"host"`
	PathPrefix string `json:"pathPrefix,omitempty"`
}

// BoundTopologyDestination describes where a route currently resolves.
type BoundTopologyDestination struct {
	Location DestinationLocation `json:"location"`
	Kind     DestinationKind     `json:"kind"`
	URL      string              `json:"url,omitempty"`
}

// ResolveBindings combines static topology components with runtime-specific binding data.
func (l Local) ResolveBindings(runtimeBindings []RuntimeBinding) []Binding {
	bindings := make([]Binding, 0, len(runtimeBindings))
	for _, runtimeBinding := range runtimeBindings {
		bindings = append(bindings, newBinding(l.MustComponent(runtimeBinding.ComponentID), runtimeBinding))
	}
	return bindings
}

// ResolveBinding resolves the current binding for a component.
func (l Local) ResolveBinding(id ComponentID, runtimeBindings []RuntimeBinding) (Binding, bool) {
	component, ok := l.Component(id)
	if !ok {
		var zero Binding
		return zero, false
	}

	for _, runtimeBinding := range runtimeBindings {
		if runtimeBinding.ComponentID == id {
			return newBinding(component, runtimeBinding), true
		}
	}

	var zero Binding
	return zero, false
}

// MustResolveBinding resolves a component binding or panics if the component is unsupported.
func (l Local) MustResolveBinding(id ComponentID, runtimeBindings []RuntimeBinding) Binding {
	binding, ok := l.ResolveBinding(id, runtimeBindings)
	if ok {
		return binding
	}

	panic("envtopology: unsupported binding for component " + string(id))
}

// BoundTopologyConfig resolves the initial shared bound topology for the current run.
func (l Local) BoundTopologyConfig(runtimeBindings []RuntimeBinding) BoundTopologyConfig {
	bindings := l.ResolveBindings(runtimeBindings)
	routes := make([]BoundTopologyRoute, 0, len(bindings))
	appRouteTemplate := BoundTopologyAppRouteTemplate{
		Host:               l.AppHostName(),
		PathPrefixTemplate: l.def.AppRouteTemplate.PathPrefixTemplate,
	}
	for _, binding := range bindings {
		if !binding.HasRoute() {
			continue
		}
		if binding.ComponentID == ComponentApp {
			continue
		}
		routes = append(routes, boundTopologyRoute(binding))
	}

	return BoundTopologyConfig{
		AppRouteTemplate: appRouteTemplate,
		Routes:           routes,
		Version:          BoundTopologyConfigVersion,
	}
}

// WriteBoundTopologyBaseConfig writes the shared base bound topology to disk.
func (l Local) WriteBoundTopologyBaseConfig(path string, runtimeBindings []RuntimeBinding) error {
	return WriteBoundTopologyConfig(path, l.BoundTopologyConfig(runtimeBindings))
}

// WriteBoundTopologyConfig writes the shared bound topology configuration to disk.
func (l Local) WriteBoundTopologyConfig(path string, runtimeBindings []RuntimeBinding) error {
	return WriteBoundTopologyConfig(path, l.BoundTopologyConfig(runtimeBindings))
}

// WriteBoundTopologyConfig writes a bound topology configuration to disk atomically.
func WriteBoundTopologyConfig(path string, config BoundTopologyConfig) error {
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, osutil.DirPermDefault); err != nil {
		return fmt.Errorf("create bound topology config directory: %w", err)
	}

	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal bound topology config: %w", err)
	}

	tmpPath := path + ".tmp"
	if err := os.WriteFile(tmpPath, append(data, '\n'), osutil.FilePermDefault); err != nil {
		return fmt.Errorf("write bound topology config temp file: %w", err)
	}
	if err := replaceBoundTopologyConfig(tmpPath, path); err != nil {
		if removeErr := os.Remove(tmpPath); removeErr != nil && !errors.Is(removeErr, os.ErrNotExist) {
			return errors.Join(err, fmt.Errorf("remove bound topology config temp file: %w", removeErr))
		}
		return err
	}
	return nil
}

// ReadBoundTopologyConfig reads a bound topology configuration from disk.
func ReadBoundTopologyConfig(path string) (BoundTopologyConfig, error) {
	data, err := os.ReadFile(filepath.Clean(path))
	if err != nil {
		return BoundTopologyConfig{}, fmt.Errorf("read bound topology config: %w", err)
	}

	var config BoundTopologyConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return BoundTopologyConfig{}, fmt.Errorf("unmarshal bound topology config: %w", err)
	}
	return config, nil
}

// BoundTopologyHostDir returns the host directory for generated topology config.
func BoundTopologyHostDir(dataDir string) string {
	return filepath.Join(dataDir, BoundTopologyConfigDirName)
}

// BoundTopologyHostPath returns the host path for the bound topology config.
func BoundTopologyHostPath(dataDir string) string {
	return filepath.Join(BoundTopologyHostDir(dataDir), BoundTopologyConfigFileName)
}

func newBinding(component Component, runtimeBinding RuntimeBinding) Binding {
	return Binding{
		ComponentID: runtimeBinding.ComponentID,
		Host:        component.Host(),
		PathPrefix:  component.PathPrefix(),
		Destination: runtimeBinding.Destination,
		Enabled:     runtimeBinding.Enabled,
	}
}

// HasRoute reports whether the binding participates in generated routing.
func (b Binding) HasRoute() bool {
	return b.Destination.Kind != ""
}

func boundTopologyRoute(binding Binding) BoundTopologyRoute {
	route := BoundTopologyRoute{
		Component:   binding.ComponentID,
		Destination: binding.Destination,
		Match: BoundTopologyRouteMatch{
			Host:       binding.Host,
			PathPrefix: binding.PathPrefix,
		},
		Metadata: nil,
		Enabled:  binding.Enabled,
	}
	if !binding.HasRoute() {
		panic("envtopology: binding is not a route")
	}
	return route
}

func replaceBoundTopologyConfig(tmpPath, path string) error {
	renameErr := os.Rename(tmpPath, path)
	if renameErr == nil {
		return nil
	}
	return fmt.Errorf("replace bound topology config: %w", renameErr)
}
