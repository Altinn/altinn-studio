package resource

import (
	"sync"

	"altinn.studio/devenv/pkg/container/types"
)

// Output contains runtime facts produced while applying a resource.
type Output interface {
	clone() Output
}

// ImageOutput contains runtime facts for an applied image resource.
type ImageOutput struct {
	ImageID string
}

// ContainerOutput contains runtime facts for an applied container resource.
type ContainerOutput struct {
	ContainerID string
	HostPorts   []types.PublishedPort
}

type noOutput struct{}

// Outputs provides typed access to runtime outputs keyed by resource ID.
type Outputs struct {
	values map[ResourceID]Output
}

type outputStore struct {
	m  map[ResourceID]Output
	mu sync.RWMutex
}

func newOutputStore() *outputStore {
	return &outputStore{m: make(map[ResourceID]Output)}
}

func (o ImageOutput) clone() Output {
	return o
}

func (o ImageOutput) withClone() ImageOutput {
	return o
}

func (o ContainerOutput) clone() Output {
	return o.withClone()
}

func (o ContainerOutput) withClone() ContainerOutput {
	cloned := o
	cloned.HostPorts = clonePublishedPorts(o.HostPorts)
	return cloned
}

func (noOutput) clone() Output {
	return noOutput{}
}

// Get returns the raw output for a resource ID.
func (o Outputs) Get(id ResourceID) (Output, bool) {
	output, ok := o.values[id]
	if !ok {
		return nil, false
	}
	return output.clone(), true
}

// Image returns the typed image output for a resource ID.
func (o Outputs) Image(id ResourceID) (ImageOutput, bool) {
	output, ok := o.values[id]
	if !ok {
		return ImageOutput{}, false
	}
	image, ok := output.(ImageOutput)
	if !ok {
		return ImageOutput{}, false
	}
	return image.withClone(), true
}

// Container returns the typed container output for a resource ID.
func (o Outputs) Container(id ResourceID) (ContainerOutput, bool) {
	output, ok := o.values[id]
	if !ok {
		return ContainerOutput{}, false
	}
	container, ok := output.(ContainerOutput)
	if !ok {
		return ContainerOutput{}, false
	}
	return container.withClone(), true
}

// Len returns the number of outputs.
func (o Outputs) Len() int {
	return len(o.values)
}

func (s *outputStore) Reset() {
	s.mu.Lock()
	s.m = make(map[ResourceID]Output)
	s.mu.Unlock()
}

func (s *outputStore) Set(id ResourceID, output Output) {
	s.mu.Lock()
	s.m[id] = output.clone()
	s.mu.Unlock()
}

func (s *outputStore) Get(id ResourceID) (Output, bool) {
	s.mu.RLock()
	output, ok := s.m[id]
	s.mu.RUnlock()
	if !ok {
		return nil, false
	}
	return output.clone(), true
}

func (s *outputStore) Image(id ResourceID) (ImageOutput, bool) {
	output, ok := s.Get(id)
	if !ok {
		return ImageOutput{}, false
	}
	image, ok := output.(ImageOutput)
	if !ok {
		return ImageOutput{}, false
	}
	return image.withClone(), true
}

func (s *outputStore) Container(id ResourceID) (ContainerOutput, bool) {
	output, ok := s.Get(id)
	if !ok {
		return ContainerOutput{}, false
	}
	container, ok := output.(ContainerOutput)
	if !ok {
		return ContainerOutput{}, false
	}
	return container.withClone(), true
}

func (s *outputStore) Snapshot() Outputs {
	s.mu.RLock()
	defer s.mu.RUnlock()

	values := make(map[ResourceID]Output, len(s.m))
	for id, output := range s.m {
		values[id] = output.clone()
	}
	return Outputs{values: values}
}

func isNoOutput(output Output) bool {
	_, ok := output.(noOutput)
	return ok
}
