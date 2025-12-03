package caching

import (
	"context"
	"sync"
	"time"

	"github.com/jonboulle/clockwork"
)

type CachedAtom[T any] struct {
	mutex            sync.RWMutex
	clock            clockwork.Clock
	retriever        func(ctx context.Context) (*T, error)
	current          *T
	currentFetchedAt time.Time
	expireAfter      time.Duration
}

func NewCachedAtom[T any](
	expireAfter time.Duration,
	clock clockwork.Clock,
	retriever func(ctx context.Context) (*T, error),
) CachedAtom[T] {
	return CachedAtom[T]{
		mutex:       sync.RWMutex{},
		clock:       clock,
		expireAfter: expireAfter,
		retriever:   retriever,
	}
}

func (c *CachedAtom[T]) Get(ctx context.Context) (*T, error) {
	c.mutex.RLock()
	now := c.clock.Now()
	if c.currentFetchedAt.IsZero() || now.Sub(c.currentFetchedAt) > c.expireAfter {
		c.mutex.RUnlock()
		c.mutex.Lock()
		defer c.mutex.Unlock()

		now = c.clock.Now()
		if now.Sub(c.currentFetchedAt) <= c.expireAfter {
			return c.current, nil
		}

		value, err := c.retriever(ctx)
		if err != nil {
			return nil, err
		}

		c.current = value
		c.currentFetchedAt = now
		return c.current, nil
	}
	defer c.mutex.RUnlock()

	return c.current, nil
}
