package resource

import "sync"

// resolvedMap is a concurrent map for storing resolved resource state.
// It maps ResourceID to image ID strings.
type resolvedMap struct {
	mu sync.Mutex
	m  map[ResourceID]string
}

// newResolvedMap creates a new empty resolved map.
func newResolvedMap() *resolvedMap {
	return &resolvedMap{m: make(map[ResourceID]string)}
}

// Set stores an image ID for the given resource ID.
func (rm *resolvedMap) Set(id ResourceID, imageID string) {
	rm.mu.Lock()
	rm.m[id] = imageID
	rm.mu.Unlock()
}

// Get retrieves the image ID for the given resource ID.
// Returns the image ID and true if found, empty string and false otherwise.
func (rm *resolvedMap) Get(id ResourceID) (string, bool) {
	rm.mu.Lock()
	v, ok := rm.m[id]
	rm.mu.Unlock()
	return v, ok
}

// Len returns the number of entries in the map.
func (rm *resolvedMap) Len() int {
	rm.mu.Lock()
	defer rm.mu.Unlock()
	return len(rm.m)
}
