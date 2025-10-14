package concurrent

import "sync"

// Map wraps a map with a mutex for safe concurrent access.
type Map[K comparable, V any] struct {
	mu sync.Mutex
	m  map[K]V
}

func NewMap[K comparable, V any]() *Map[K, V] {
	return &Map[K, V]{m: make(map[K]V)}
}

func (cm *Map[K, V]) Set(k K, v V) {
	cm.mu.Lock()
	cm.m[k] = v
	cm.mu.Unlock()
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
