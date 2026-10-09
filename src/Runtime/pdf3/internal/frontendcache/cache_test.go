package frontendcache

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

const bundleURL = "https://altinncdn.no/toolkits/altinn-app-frontend/4.21.4/altinn-app-frontend.js"

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(request *http.Request) (*http.Response, error) { return f(request) }

func response(status int, body string, headers http.Header) *http.Response {
	if headers == nil {
		headers = make(http.Header)
	}
	return &http.Response{StatusCode: status, Header: headers, Body: io.NopCloser(strings.NewReader(body))}
}

func publicHeaders() http.Header {
	return http.Header{
		"Cache-Control":               {"public, max-age=600"},
		"Content-Type":                {"application/javascript"},
		"Access-Control-Allow-Origin": {"*"},
		"Vary":                        {"Accept-Encoding"},
	}
}

func TestEligible(t *testing.T) {
	for _, candidate := range []string{bundleURL, strings.Replace(bundleURL, "4.21.4", "4.21.5", 1)} {
		if !Eligible(candidate) {
			t.Errorf("eligible version URL rejected: %s", candidate)
		}
	}
	for _, candidate := range []string{
		strings.Replace(bundleURL, "4.21.4", "4", 1),
		strings.Replace(bundleURL, "4.21.4", "latest", 1),
		strings.Replace(bundleURL, "4.21.4", "4.21.4-beta", 1),
		strings.Replace(bundleURL, "https://", "http://", 1),
		strings.Replace(bundleURL, "altinncdn.no", "user:password@altinncdn.no", 1),
		strings.Replace(bundleURL, "altinncdn.no", "altinncdn.no:443", 1),
		strings.Replace(bundleURL, "altinncdn.no", "altinncdn.no.attacker.example", 1),
		bundleURL + "?token=secret", bundleURL + "#fragment",
		"https://example.com/org/app/altinn-app-frontend/altinn-app-frontend.js",
	} {
		if Eligible(candidate) {
			t.Errorf("ineligible URL accepted: %s", candidate)
		}
	}
}

func TestAnonymousFetchAndFreshReuse(t *testing.T) {
	var downloads int
	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatal(err)
	}
	parsed, err := url.Parse(bundleURL)
	if err != nil {
		t.Fatal(err)
	}
	jar.SetCookies(parsed, []*http.Cookie{{Name: "user", Value: "secret"}})
	cache := New(&http.Client{Jar: jar, Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		downloads++
		if request.Header.Get("Cookie") != "" || request.Header.Get("Authorization") != "" {
			t.Error("shared fetch contains user credentials")
		}
		if request.Header.Get("Accept-Encoding") != "identity" {
			t.Error("fetch must use one fixed representation")
		}
		return response(http.StatusOK, "console.log('public')", publicHeaders()), nil
	})})
	asset, err := cache.Get(t.Context(), bundleURL)
	if err != nil {
		t.Fatal(err)
	}
	if asset.Headers.Get("Access-Control-Allow-Origin") != "*" || len(asset.SHA256) != 64 {
		t.Fatalf("unexpected asset: %+v", asset)
	}
	second, err := cache.Get(t.Context(), bundleURL)
	if err != nil || second != asset || downloads != 1 {
		t.Fatalf("fresh reuse: downloads=%d, error=%v", downloads, err)
	}
	_, err = cache.Get(t.Context(), bundleURL+"?token=secret")
	if !errors.Is(err, ErrNotEligible) || downloads != 1 {
		t.Fatalf("ineligible request fetched: downloads=%d, error=%v", downloads, err)
	}
}

func TestRevalidationAndCompilationIdentity(t *testing.T) {
	var downloads int
	cache := New(&http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		downloads++
		headers := publicHeaders()
		headers.Set("Cache-Control", "public, no-cache")
		headers.Set("ETag", `"one"`)
		if downloads == 2 {
			if request.Header.Get("If-None-Match") != `"one"` {
				t.Error("missing ETag revalidation")
			}
			return response(http.StatusNotModified, "", headers), nil
		}
		if downloads == 3 {
			headers.Set("ETag", `"two"`)
			return response(http.StatusOK, "script two", headers), nil
		}
		return response(http.StatusOK, "script one", headers), nil
	})})
	first, err := cache.Get(t.Context(), bundleURL)
	if err != nil {
		t.Fatal(err)
	}
	code := []byte("compiled script one")
	cache.SetCompilation(first, code)
	code[0] = 'X'
	second, err := cache.Get(t.Context(), bundleURL)
	if err != nil || second.SHA256 != first.SHA256 || string(cache.Compilation(second)) != "compiled script one" {
		t.Fatalf("304 lost compilation: error=%v", err)
	}
	third, err := cache.Get(t.Context(), bundleURL)
	if err != nil || third.SHA256 == first.SHA256 || cache.Compilation(third) != nil {
		t.Fatalf("replacement retained old compilation: error=%v", err)
	}
	cache.SetCompilation(first, []byte("stale"))
	if cache.Compilation(third) != nil || cache.Compilation(first) != nil {
		t.Fatal("stale compilation accepted")
	}
}

func TestRejectUncacheableResponses(t *testing.T) {
	for _, test := range []struct {
		name   string
		header string
		value  string
		status int
	}{
		{name: "private", header: "Cache-Control", value: "private, max-age=600", status: http.StatusOK},
		{name: "no store", header: "Cache-Control", value: "public, no-store, max-age=600", status: http.StatusOK},
		{name: "no validator", header: "Cache-Control", value: "no-cache", status: http.StatusOK},
		{name: "cookie", header: "Set-Cookie", value: "session=secret", status: http.StatusOK},
		{name: "origin variant", header: "Vary", value: "Origin", status: http.StatusOK},
		{name: "all variants", header: "Vary", value: "*", status: http.StatusOK},
		{name: "encoded", header: "Content-Encoding", value: "gzip", status: http.StatusOK},
		{name: "unauthorized", status: http.StatusUnauthorized},
		{name: "redirect", header: "Location", value: "https://example.com/secret", status: http.StatusFound},
	} {
		t.Run(test.name, func(t *testing.T) {
			var downloads int
			cache := New(&http.Client{Transport: roundTripFunc(func(_ *http.Request) (*http.Response, error) {
				downloads++
				headers := publicHeaders()
				if test.header != "" {
					headers.Set(test.header, test.value)
				}
				return response(test.status, "script", headers), nil
			})})
			asset, err := cache.Get(t.Context(), bundleURL)
			if !errors.Is(err, ErrUncacheable) || asset != nil || cache.bytes != 0 || downloads != 1 {
				t.Fatalf("uncacheable response accepted: asset=%v error=%v downloads=%d", asset, err, downloads)
			}
		})
	}
}

func TestSizeLimitsAndLRU(t *testing.T) {
	cache := New(&http.Client{Transport: roundTripFunc(func(_ *http.Request) (*http.Response, error) {
		return response(http.StatusOK, strings.Repeat("x", 100), publicHeaders()), nil
	})})
	first, err := cache.Get(t.Context(), bundleURL)
	if err != nil {
		t.Fatal(err)
	}
	cache.limit = cache.bytes*2 + 1
	secondURL := strings.Replace(bundleURL, "4.21.4", "4.21.5", 1)
	second, err := cache.Get(t.Context(), secondURL)
	if err != nil {
		t.Fatal(err)
	}
	cache.SetCompilation(first, []byte("compiled"))
	if cache.entries[secondURL] != nil || cache.Compilation(first) == nil || cache.bytes > cache.limit {
		t.Fatal("compiled data not included in LRU budget")
	}
	cache.SetCompilation(second, []byte("evicted"))
	if cache.entries[secondURL] != nil {
		t.Fatal("compilation resurrected evicted asset")
	}
	cache.SetCompilation(first, make([]byte, maxAssetBytes+1))
	if string(cache.Compilation(first)) != "compiled" {
		t.Fatal("oversized compilation accepted")
	}
	oversized := New(&http.Client{Transport: roundTripFunc(func(_ *http.Request) (*http.Response, error) {
		return response(http.StatusOK, strings.Repeat("x", maxAssetBytes+1), publicHeaders()), nil
	})})
	if _, err = oversized.Get(t.Context(), bundleURL); !errors.Is(err, ErrUncacheable) || oversized.bytes != 0 {
		t.Fatalf("oversized bundle accepted: %v", err)
	}
}

func TestCoalesceDownloadsAndCancelWaiter(t *testing.T) {
	started, release := make(chan struct{}), make(chan struct{})
	var downloads atomic.Int32
	cache := New(&http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		if downloads.Add(1) == 1 {
			close(started)
		}
		select {
		case <-request.Context().Done():
			return nil, request.Context().Err()
		case <-release:
			return response(http.StatusOK, "script", publicHeaders()), nil
		}
	})})
	var waiters sync.WaitGroup
	waiters.Go(func() {
		if _, err := cache.Get(t.Context(), bundleURL); err != nil {
			t.Error(err)
		}
	})
	<-started
	ctx, cancel := context.WithCancel(t.Context())
	cancel()
	if _, err := cache.Get(ctx, bundleURL); !errors.Is(err, context.Canceled) {
		t.Fatalf("waiter cancellation ignored: %v", err)
	}
	for range 32 {
		waiters.Go(func() {
			if _, err := cache.Get(t.Context(), bundleURL); err != nil {
				t.Error(err)
			}
		})
	}
	close(release)
	waiters.Wait()
	if downloads.Load() != 1 {
		t.Fatalf("cold downloads not coalesced: %d", downloads.Load())
	}
}

func TestFreshness(t *testing.T) {
	now := time.Date(2026, time.October, 9, 12, 0, 0, 0, time.UTC)
	headers := publicHeaders()
	headers.Set("Date", now.Add(-100*time.Second).Format(http.TimeFormat))
	headers.Set("Age", "200")
	until, err := freshness(headers, now)
	if err != nil || until.Sub(now) != 400*time.Second {
		t.Fatalf("Age ignored: until=%s error=%v", until, err)
	}
	headers.Set("Cache-Control", "public, max-age=600, s-maxage=300")
	until, err = freshness(headers, now)
	if err != nil || until.Sub(now) != 100*time.Second {
		t.Fatalf("shared freshness ignored: until=%s error=%v", until, err)
	}
}
