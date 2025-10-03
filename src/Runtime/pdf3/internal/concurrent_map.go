package internal

import "sync"

// ConcurrentMap wraps a map with a mutex for safe concurrent access.
type ConcurrentMap[K comparable, V any] struct {
	mu sync.Mutex
	m  map[K]V
}

func NewConcurrentMap[K comparable, V any]() *ConcurrentMap[K, V] {
	return &ConcurrentMap[K, V]{m: make(map[K]V)}
}

func (cm *ConcurrentMap[K, V]) Set(k K, v V) {
	cm.mu.Lock()
	cm.m[k] = v
	cm.mu.Unlock()
}

func (cm *ConcurrentMap[K, V]) GetAndDelete(k K) (V, bool) {
	cm.mu.Lock()
	v, ok := cm.m[k]
	if ok {
		delete(cm.m, k)
	}
	cm.mu.Unlock()
	return v, ok
}

func (cm *ConcurrentMap[K, V]) Drain(consume func(V)) {
	cm.mu.Lock()
	old := cm.m
	cm.m = make(map[K]V)
	cm.mu.Unlock()
	for _, v := range old {
		consume(v)
	}
}
