package cdn

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"sort"
	"strings"
	"testing"
	"time"
)

const sampleOrgsJSON = `{
  "orgs": {
    "ttd": {
      "name": {"en": "Test org TTD", "nb": "Test org TTD", "nn": "Test org TTD"},
      "orgnr": "991825827",
      "environments": ["tt02", "production"]
    },
    "brg": {
      "name": {"en": "Brønnøysundregistrene", "nb": "Brønnøysundregistrene"},
      "orgnr": "974760673",
      "environments": ["tt02", "production"]
    },
    "acn": {
      "name": {"en": "ACN Test org"},
      "orgnr": "999999990",
      "environments": []
    }
  }
}`

func newStubServer(t *testing.T, handler http.HandlerFunc) *httptest.Server {
	t.Helper()
	s := httptest.NewServer(handler)
	t.Cleanup(s.Close)
	return s
}

func TestFetch_Happy(t *testing.T) {
	var gotUA, gotAccept, gotMethod string
	s := newStubServer(t, func(w http.ResponseWriter, r *http.Request) {
		gotMethod = r.Method
		gotUA = r.Header.Get("User-Agent")
		gotAccept = r.Header.Get("Accept")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(sampleOrgsJSON))
	})

	c := NewClient(s.URL, WithUserAgent("test-agent"))
	orgs, err := c.Fetch(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got, want := len(orgs), 3; got != want {
		t.Fatalf("len(orgs) = %d, want %d", got, want)
	}

	// Index for deterministic assertions (map iteration is random).
	byCode := indexByCode(orgs)

	ttd, ok := byCode["ttd"]
	if !ok {
		t.Fatal("ttd missing from result")
	}
	if got, want := ttd.Code, "ttd"; got != want {
		t.Errorf("ttd.Code = %q, want %q", got, want)
	}
	if got, want := ttd.Orgnr, "991825827"; got != want {
		t.Errorf("ttd.Orgnr = %q, want %q", got, want)
	}
	if got, want := ttd.Environments, []string{"tt02", "production"}; !equalSlice(got, want) {
		t.Errorf("ttd.Environments = %v, want %v", got, want)
	}
	acn := byCode["acn"]
	if len(acn.Environments) != 0 {
		t.Errorf("acn.Environments = %v, want empty", acn.Environments)
	}

	if gotMethod != http.MethodGet {
		t.Errorf("HTTP method = %q, want GET", gotMethod)
	}
	if gotUA != "test-agent" {
		t.Errorf("User-Agent = %q, want test-agent", gotUA)
	}
	if !strings.Contains(gotAccept, "application/json") {
		t.Errorf("Accept = %q does not contain application/json", gotAccept)
	}
}

func TestFetch_EmptyOrgs(t *testing.T) {
	s := newStubServer(t, func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"orgs": {}}`))
	})
	c := NewClient(s.URL)
	orgs, err := c.Fetch(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(orgs) != 0 {
		t.Errorf("len(orgs) = %d, want 0", len(orgs))
	}
}

func TestFetch_MalformedJSON(t *testing.T) {
	s := newStubServer(t, func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"orgs": this is not json}`))
	})
	c := NewClient(s.URL)
	_, err := c.Fetch(context.Background())
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "decode") {
		t.Errorf("error should mention decode failure; got: %v", err)
	}
}

func TestFetch_Non200(t *testing.T) {
	s := newStubServer(t, func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
		_, _ = w.Write([]byte("upstream is down"))
	})
	c := NewClient(s.URL)
	_, err := c.Fetch(context.Background())
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !errors.Is(err, ErrUnexpectedStatus) {
		t.Errorf("expected ErrUnexpectedStatus, got %v", err)
	}
}

func TestFetch_ContextCancelled(t *testing.T) {
	s := newStubServer(t, func(w http.ResponseWriter, _ *http.Request) {
		time.Sleep(200 * time.Millisecond)
		_, _ = w.Write([]byte(sampleOrgsJSON))
	})
	c := NewClient(s.URL)
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()
	_, err := c.Fetch(ctx)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func indexByCode(orgs []Org) map[string]Org {
	m := make(map[string]Org, len(orgs))
	for _, o := range orgs {
		m[o.Code] = o
	}
	return m
}

func equalSlice(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	ac, bc := append([]string(nil), a...), append([]string(nil), b...)
	sort.Strings(ac)
	sort.Strings(bc)
	for i := range ac {
		if ac[i] != bc[i] {
			return false
		}
	}
	return true
}
