//nolint:revive // ResourceID and ResourceRef are core domain names used throughout the resource package.
package resource

// ResourceID is a unique identifier for a resource within a graph.
type ResourceID string

// String returns the string representation of the ID.
func (id ResourceID) String() string {
	return string(id)
}

// ResourceRef references a resource either by ID or by direct reference.
// Use Ref() or RefID() to construct.
type ResourceRef struct {
	resource Resource
	id       ResourceID
}

// Ref creates a reference from a Resource.
func Ref(r Resource) ResourceRef {
	return ResourceRef{resource: r}
}

// RefID creates a reference by ID.
func RefID(id ResourceID) ResourceRef {
	return ResourceRef{id: id}
}

// ID returns the referenced resource's ID.
func (r ResourceRef) ID() ResourceID {
	if r.resource != nil {
		return r.resource.ID()
	}
	return r.id
}

// Resource returns the referenced resource, or nil if referenced by ID only.
func (r ResourceRef) Resource() Resource {
	return r.resource
}

// Deps is a convenience function to create a slice of ResourceRef from resources.
func Deps(resources ...Resource) []ResourceRef {
	refs := make([]ResourceRef, len(resources))
	for i, r := range resources {
		refs[i] = Ref(r)
	}
	return refs
}

// DepIDs is a convenience function to create a slice of ResourceRef from IDs.
func DepIDs(ids ...ResourceID) []ResourceRef {
	refs := make([]ResourceRef, len(ids))
	for i, id := range ids {
		refs[i] = RefID(id)
	}
	return refs
}

// Resource is the core interface for all managed infrastructure resources.
// Resources form a DAG where dependencies must be applied before dependents.
//
// Resources are pure value types representing desired state only.
// They do not hold infrastructure clients or perform operations.
// Use an Executor to apply resources to actual infrastructure.
type Resource interface {
	// ID returns a unique identifier for this resource within a graph.
	// IDs must be stable across invocations.
	ID() ResourceID

	// Dependencies returns references to resources that must be applied before this one.
	// Referenced resources must exist in the same graph.
	Dependencies() []ResourceRef
}

// Enabled reports whether a resource participates in graph validation and execution.
// A nil enabled value means enabled by default.
func Enabled(enabled *bool) bool {
	return enabled == nil || *enabled
}

// EnablementProvider exposes optional resource enablement.
type EnablementProvider interface {
	IsEnabled() bool
}

// ErrorDecision describes how an executor should handle a lifecycle error.
type ErrorDecision int

const (
	// ErrorDecisionDefault preserves the executor's default error behavior.
	ErrorDecisionDefault ErrorDecision = iota
	// ErrorDecisionIgnore treats the error as handled.
	ErrorDecisionIgnore
)

// ErrorHandler handles lifecycle errors.
type ErrorHandler func(error) ErrorDecision

// LifecycleOptions customizes resource lifecycle behavior.
type LifecycleOptions struct {
	HandleDestroyError ErrorHandler
}

// ContainerLifecycleOptions customizes container-specific lifecycle behavior.
type ContainerLifecycleOptions struct {
	LifecycleOptions

	WaitForReady bool
}

// LifecycleOptionsProvider exposes resource lifecycle options.
type LifecycleOptionsProvider interface {
	LifecycleOptions() LifecycleOptions
}

// Validator checks that a resource has valid configuration.
// Returns nil for resources that don't support validation.
type Validator interface {
	Validate() error
}
