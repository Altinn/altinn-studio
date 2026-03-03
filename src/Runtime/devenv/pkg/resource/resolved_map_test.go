package resource

import (
	"fmt"
	"sync"
	"testing"
)

func TestResolvedMap_SetGet(t *testing.T) {
	m := newResolvedMap()

	id := ResourceID("image:test")
	imageID := "sha256:abc123"

	m.Set(id, imageID)

	got, ok := m.Get(id)
	if !ok {
		t.Fatal("expected to find value")
	}
	if got != imageID {
		t.Errorf("Get() = %q, want %q", got, imageID)
	}
}

func TestResolvedMap_GetNonExistent(t *testing.T) {
	m := newResolvedMap()

	id := ResourceID("image:nonexistent")
	got, ok := m.Get(id)
	if ok {
		t.Error("expected not to find value")
	}
	if got != "" {
		t.Errorf("Get() = %q, want empty string", got)
	}
}

func TestResolvedMap_Overwrite(t *testing.T) {
	m := newResolvedMap()

	id := ResourceID("image:test")
	m.Set(id, "sha256:first")
	m.Set(id, "sha256:second")

	got, ok := m.Get(id)
	if !ok {
		t.Fatal("expected to find value")
	}
	if got != "sha256:second" {
		t.Errorf("Get() = %q, want %q", got, "sha256:second")
	}
}

func TestResolvedMap_Len(t *testing.T) {
	m := newResolvedMap()

	if m.Len() != 0 {
		t.Errorf("Len() = %d, want 0", m.Len())
	}

	m.Set(ResourceID("image:1"), "sha256:1")
	if m.Len() != 1 {
		t.Errorf("Len() = %d, want 1", m.Len())
	}

	m.Set(ResourceID("image:2"), "sha256:2")
	if m.Len() != 2 {
		t.Errorf("Len() = %d, want 2", m.Len())
	}

	m.Set(ResourceID("image:1"), "sha256:1-updated")
	if m.Len() != 2 {
		t.Errorf("Len() = %d, want 2 after overwrite", m.Len())
	}
}

func TestResolvedMap_Concurrent(t *testing.T) {
	m := newResolvedMap()
	const goroutines = 100
	var wg sync.WaitGroup

	for i := 0; i < goroutines; i++ {
		wg.Add(1)
		go func(n int) {
			defer wg.Done()
			id := ResourceID(fmt.Sprintf("image:%d", n))
			imageID := fmt.Sprintf("sha256:%d", n)

			m.Set(id, imageID)

			got, ok := m.Get(id)
			if !ok {
				t.Errorf("goroutine %d: expected to find value", n)
				return
			}
			if got != imageID {
				t.Errorf("goroutine %d: Get() = %q, want %q", n, got, imageID)
			}
		}(i)
	}

	wg.Wait()

	if m.Len() != goroutines {
		t.Errorf("Len() = %d, want %d", m.Len(), goroutines)
	}
}
