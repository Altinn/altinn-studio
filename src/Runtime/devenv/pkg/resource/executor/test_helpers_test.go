package executor

import (
	"testing"

	"altinn.studio/devenv/pkg/resource"
)

const testGraphID = resource.GraphID("test")

type ResourceID = resource.ResourceID
type ResourceRef = resource.ResourceRef
type Resource = resource.Resource
type Container = resource.Container
type Network = resource.Network
type PulledImage = resource.PulledImage
type BuiltImage = resource.BuiltImage
type LifecycleOptions = resource.LifecycleOptions
type ContainerLifecycleOptions = resource.ContainerLifecycleOptions
type noOutput = NoOutput

var Ref = resource.Ref
var RefID = resource.RefID
var NewGraph = resource.NewGraph
var ContainerID = resource.ContainerID

const resourceTypeContainer = ResourceTypeContainer

func mustAddResource(t *testing.T, graph *resource.Graph, r resource.Resource) {
	t.Helper()
	if err := graph.Add(r); err != nil {
		t.Fatalf("graph.Add(%s) error = %v", r.ID(), err)
	}
}
