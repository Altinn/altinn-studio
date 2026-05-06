package components

import (
	"context"
	"fmt"

	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/envtopology"
)

// Preparation prepares local host state required by declared resources.
type Preparation struct {
	Run  func(context.Context) error
	Name string
}

// Manifest contains the declared localtest component outputs.
type Manifest struct {
	network      resource.ResourceRef
	Resources    []resource.Resource
	Bindings     []envtopology.RuntimeBinding
	Preparations []Preparation
}

// NewManifest builds the localtest component manifest.
func NewManifest(opts *Options) *Manifest {
	manifest := &Manifest{
		network:      resource.ResourceRef{},
		Resources:    nil,
		Bindings:     nil,
		Preparations: nil,
	}
	registerNetworkComponents(manifest)
	registerTopologyComponents(manifest, opts)
	registerCoreComponents(manifest, opts)
	registerPDFComponents(manifest, opts)
	registerWorkflowEngineComponents(manifest, opts)
	registerPgAdminComponents(manifest, opts)
	registerMonitoringComponents(manifest, opts)
	return manifest
}

// Prepare runs manifest preparations in component registration order.
func (manifest *Manifest) Prepare(ctx context.Context) error {
	for _, preparation := range manifest.Preparations {
		if err := preparation.Run(ctx); err != nil {
			return fmt.Errorf("prepare %s: %w", preparation.Name, err)
		}
	}
	return nil
}

func (manifest *Manifest) addNetwork(network *resource.Network) {
	manifest.Resources = append(manifest.Resources, network)
	manifest.network = resource.Ref(network)
}

func (manifest *Manifest) addContainer(
	opts *Options,
	image resource.ImageResource,
	spec *ContainerSpec,
	enabled bool,
) {
	manifest.Resources = append(manifest.Resources, image)
	manifest.Resources = append(manifest.Resources, newContainerResource(
		spec,
		image,
		manifest.network,
		opts.RuntimeUser,
		resourceEnabledRef(enabled),
	))
}

func (manifest *Manifest) addBinding(binding envtopology.RuntimeBinding) {
	manifest.Bindings = append(manifest.Bindings, binding)
}

func (manifest *Manifest) addPreparation(name string, run func(context.Context) error) {
	manifest.Preparations = append(manifest.Preparations, Preparation{
		Name: name,
		Run:  run,
	})
}
