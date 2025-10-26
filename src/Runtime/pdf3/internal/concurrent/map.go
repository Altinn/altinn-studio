package concurrent

import (
	"sync"

	"altinn.studio/pdf3/internal/assert"
)

type KeyType interface {
	comparable
}

// Map wraps a map with a mutex for safe concurrent access.
type Map[K KeyType, V any] struct {
	mu sync.Mutex
	m  map[K]V
}

func NewMap[K KeyType, V any]() *Map[K, V] {
	return &Map[K, V]{m: make(map[K]V)}
}

func (cm *Map[K, V]) Set(k K, v V) {
	cm.mu.Lock()
	cm.m[k] = v
	cm.mu.Unlock()
}

func (cm *Map[K, V]) Get(k K) (V, bool) {
	cm.mu.Lock()
	v, ok := cm.m[k]
	cm.mu.Unlock()
	return v, ok
}

func (cm *Map[K, V]) GetAndDelete(k K) (V, bool) {
	cm.mu.Lock()
	v, ok := cm.m[k]
	if ok {
		delete(cm.m, k)
	}
	cm.mu.Unlock()
	return v, ok
}

func (cm *Map[K, V]) Drain(consume func(V)) {
	cm.mu.Lock()
	old := cm.m
	cm.m = make(map[K]V)
	cm.mu.Unlock()
	for _, v := range old {
		consume(v)
	}
}

func (cm *Map[K, V]) Len() int {
	cm.mu.Lock()
	defer cm.mu.Unlock()
	return len(cm.m)
}

// Update atomically updates the value for a key using the provided function.
// The caller should know that the key is there.
// If the key isn't in the map, we crash.
func (cm *Map[K, V]) Update(k K, fn func(*V)) bool {
	cm.mu.Lock()
	defer cm.mu.Unlock()
	v, ok := cm.m[k]
	assert.AssertWithMessage(ok, "Item with key not found")
	fn(&v)
	cm.m[k] = v
	return true
}
