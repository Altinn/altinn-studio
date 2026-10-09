// Package frontendcache caches only public, explicitly versioned frontend bundles.
package frontendcache

import (
	"container/list"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"maps"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"altinn.studio/pdf3/internal/assert"
)

const (
	maxAssetBytes = 16 << 20
	maxCacheBytes = 64 << 20
	fetchTimeout  = 10 * time.Second
)

var (
	ErrNotEligible = errors.New("frontend URL is not eligible for shared caching")
	ErrUncacheable = errors.New("frontend response is not publicly cacheable")
	versionedURL   = regexp.MustCompile(
		`^https://altinncdn\.no/toolkits/altinn-app-frontend/(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)/altinn-app-frontend\.js$`,
	)
)

// Asset and its slices/maps are immutable after publication. SHA256 identifies
// the exact decoded script bytes, including when a URL's contents change.
type Asset struct {
	Headers http.Header
	URL     string
	SHA256  string
	Body    []byte
}

type entry struct {
	freshUntil  time.Time
	asset       *Asset
	compilation []byte
}

type download struct {
	asset *Asset
	err   error
	done  chan struct{}
}

// Cache is scoped to one worker/browser build and launch configuration. It
// shares only public script bytes and compiled code, never page state.
type Cache struct {
	client  *http.Client
	entries map[string]*list.Element
	pending map[string]*download
	lru     list.List
	mu      sync.Mutex
	bytes   int
	limit   int
}

// New reuses the client's transport (and its connection pool), while disabling
// redirects and its cookie jar. Every fetch creates a credential-free request.
func New(client *http.Client) *Cache {
	publicClient := *client
	publicClient.Jar = nil
	publicClient.CheckRedirect = func(_ *http.Request, _ []*http.Request) error { return http.ErrUseLastResponse }
	return &Cache{
		client: &publicClient, entries: make(map[string]*list.Element), pending: make(map[string]*download),
		limit: maxCacheBytes,
	}
}

// Close releases retained upstream connections after the worker's downloads
// have drained. The transport belongs to this worker's browser session.
func (c *Cache) Close() {
	c.client.CloseIdleConnections()
}

// Eligible excludes app-hosted assets and mutable CDN aliases. Versioned URLs
// still obey the origin's freshness policy; their naming is not an immutability guarantee.
func Eligible(rawURL string) bool { return versionedURL.MatchString(rawURL) }

// Get coalesces concurrent downloads and revalidates stale entries. Any error
// lets the caller fall back to the browser's ordinary network request.
func (c *Cache) Get(ctx context.Context, rawURL string) (*Asset, error) {
	if !Eligible(rawURL) {
		return nil, ErrNotEligible
	}
	c.mu.Lock()
	var previous *entry
	if element := c.entries[rawURL]; element != nil {
		previous = listEntry(element)
		c.lru.MoveToFront(element)
		if time.Now().Before(previous.freshUntil) {
			c.mu.Unlock()
			return previous.asset, nil
		}
	}
	if pending := c.pending[rawURL]; pending != nil {
		c.mu.Unlock()
		select {
		case <-ctx.Done():
			return nil, fmt.Errorf("wait for frontend: %w", ctx.Err())
		case <-pending.done:
			return pending.asset, pending.err
		}
	}
	pending := &download{done: make(chan struct{})}
	c.pending[rawURL] = pending
	c.mu.Unlock()

	next, err := c.fetch(ctx, rawURL, previous)
	c.mu.Lock()
	defer c.mu.Unlock()
	if element := c.entries[rawURL]; element != nil {
		current := listEntry(element)
		if next != nil && current.asset.SHA256 == next.asset.SHA256 {
			next.compilation = current.compilation
		}
		c.remove(element)
	}
	if next != nil {
		c.entries[rawURL] = c.lru.PushFront(next)
		c.bytes += size(next)
		c.evict()
		pending.asset = next.asset
	}
	pending.err = err
	delete(c.pending, rawURL)
	close(pending.done)
	return pending.asset, pending.err
}

// Compilation returns immutable compiled data only for these exact bytes.
func (c *Cache) Compilation(asset *Asset) []byte {
	c.mu.Lock()
	defer c.mu.Unlock()
	if element := c.entries[asset.URL]; element != nil {
		cached := listEntry(element)
		if cached.asset.SHA256 == asset.SHA256 {
			c.lru.MoveToFront(element)
			return cached.compilation
		}
	}
	return nil
}

// SetCompilation ignores stale or evicted assets and oversized compiled data.
func (c *Cache) SetCompilation(asset *Asset, data []byte) {
	if len(data) == 0 || len(data) > maxAssetBytes {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if element := c.entries[asset.URL]; element != nil {
		cached := listEntry(element)
		if cached.asset.SHA256 == asset.SHA256 {
			c.bytes += len(data) - len(cached.compilation)
			cached.compilation = append([]byte(nil), data...)
			c.lru.MoveToFront(element)
			c.evict()
		}
	}
}

func (c *Cache) evict() {
	for c.bytes > c.limit && c.lru.Len() != 0 {
		c.remove(c.lru.Back())
	}
}

func (c *Cache) remove(element *list.Element) {
	cached := listEntry(element)
	c.bytes -= size(cached)
	delete(c.entries, cached.asset.URL)
	c.lru.Remove(element)
}

func listEntry(element *list.Element) *entry {
	cached, ok := element.Value.(*entry)
	assert.That(ok, "Frontend cache list contains a non-entry value")
	return cached
}

func size(cached *entry) int {
	bytes := len(cached.asset.Body) + len(cached.compilation) + len(cached.asset.URL) + 128
	for name, values := range cached.asset.Headers {
		bytes += len(name)
		for _, value := range values {
			bytes += len(value)
		}
	}
	return bytes
}

func (c *Cache) fetch(ctx context.Context, rawURL string, previous *entry) (*entry, error) {
	ctx, cancel := context.WithTimeout(ctx, fetchTimeout)
	defer cancel()
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, fmt.Errorf("create frontend fetch: %w", err)
	}
	request.Header.Set("Accept-Encoding", "identity")
	if previous != nil && previous.asset.Headers.Get("ETag") != "" {
		request.Header.Set("If-None-Match", previous.asset.Headers.Get("ETag"))
	}
	response, err := c.client.Do(request)
	if err != nil {
		return nil, fmt.Errorf("fetch frontend: %w", err)
	}
	defer response.Body.Close() //nolint:errcheck // A close failure does not invalidate a fully read response.
	return readResponse(rawURL, response, previous)
}

func readResponse(rawURL string, response *http.Response, previous *entry) (*entry, error) {
	if response.StatusCode != http.StatusOK && response.StatusCode != http.StatusNotModified {
		return nil, fmt.Errorf("%w: status %d", ErrUncacheable, response.StatusCode)
	}
	headers := response.Header.Clone()
	var body []byte
	if response.StatusCode == http.StatusNotModified {
		if previous == nil {
			return nil, fmt.Errorf("%w: unexpected 304", ErrUncacheable)
		}
		headers = previous.asset.Headers.Clone()
		maps.Copy(headers, response.Header)
		body = previous.asset.Body
	} else {
		var err error
		body, err = readBody(response)
		if err != nil {
			return nil, err
		}
	}
	freshUntil, err := freshness(headers, time.Now())
	if err != nil {
		return nil, err
	}
	// Body contains the identity representation; hop-by-hop and framing headers
	// do not describe a response fulfilled through CDP.
	for _, name := range []string{"Connection", "Transfer-Encoding", "Content-Length", "Keep-Alive"} {
		headers.Del(name)
	}
	digest := sha256.Sum256(body)
	return &entry{
		asset:      &Asset{URL: rawURL, Body: body, Headers: headers, SHA256: hex.EncodeToString(digest[:])},
		freshUntil: freshUntil,
	}, nil
}

func readBody(response *http.Response) ([]byte, error) {
	if _, err := freshness(response.Header, time.Now()); err != nil {
		return nil, err
	}
	body, err := io.ReadAll(io.LimitReader(response.Body, maxAssetBytes+1))
	if err != nil {
		return nil, fmt.Errorf("read frontend: %w", err)
	}
	if len(body) == 0 || len(body) > maxAssetBytes {
		return nil, fmt.Errorf("%w: empty bundle or exceeded size limit", ErrUncacheable)
	}
	return body, nil
}

func publicRepresentation(headers http.Header) bool {
	if headers.Get("Set-Cookie") != "" ||
		(headers.Get("Content-Encoding") != "" && headers.Get("Content-Encoding") != "identity") {
		return false
	}
	for vary := range strings.SplitSeq(strings.Join(headers.Values("Vary"), ","), ",") {
		if vary = strings.TrimSpace(vary); vary != "" && !strings.EqualFold(vary, "Accept-Encoding") {
			return false
		}
	}
	return true
}

func freshness(headers http.Header, now time.Time) (time.Time, error) {
	if !publicRepresentation(headers) {
		return time.Time{}, ErrUncacheable
	}
	directives := cacheDirectives(headers)
	if _, private := directives["private"]; private {
		return time.Time{}, ErrUncacheable
	}
	if _, noStore := directives["no-store"]; noStore {
		return time.Time{}, ErrUncacheable
	}
	maxAge := directives["max-age"]
	if sharedAge, exists := directives["s-maxage"]; exists {
		maxAge = sharedAge
	}
	seconds, err := strconv.ParseInt(maxAge, 10, 32)
	if err != nil || seconds < 0 {
		seconds = 0
	}
	if _, noCache := directives["no-cache"]; noCache || strings.EqualFold(headers.Get("Pragma"), "no-cache") {
		seconds = 0
	}
	if seconds == 0 && headers.Get("ETag") == "" {
		return time.Time{}, ErrUncacheable
	}
	age, ageErr := strconv.ParseInt(headers.Get("Age"), 10, 32)
	if ageErr != nil {
		age = 0
	}
	if date, dateErr := http.ParseTime(
		headers.Get("Date"),
	); dateErr == nil &&
		now.Sub(date) > time.Duration(age)*time.Second {
		age = int64(now.Sub(date) / time.Second)
	}
	return now.Add(time.Duration(seconds-max(age, 0)) * time.Second), nil
}

func cacheDirectives(headers http.Header) map[string]string {
	directives := make(map[string]string)
	for directive := range strings.SplitSeq(strings.Join(headers.Values("Cache-Control"), ","), ",") {
		name, value, _ := strings.Cut(strings.TrimSpace(directive), "=")
		directives[strings.ToLower(strings.TrimSpace(name))] = strings.Trim(value, ` "`)
	}
	return directives
}
