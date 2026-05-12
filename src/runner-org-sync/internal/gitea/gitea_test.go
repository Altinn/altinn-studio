package gitea

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func newStubServer(t *testing.T, handler http.HandlerFunc) *httptest.Server {
	t.Helper()
	s := httptest.NewServer(handler)
	t.Cleanup(s.Close)
	return s
}

func TestMintRegistrationToken_Happy(t *testing.T) {
	var gotMethod, gotPath, gotAuth, gotUA string
	s := newStubServer(t, func(w http.ResponseWriter, r *http.Request) {
		gotMethod = r.Method
		gotPath = r.URL.Path
		gotAuth = r.Header.Get("Authorization")
		gotUA = r.Header.Get("User-Agent")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"token":"reg-token-abc"}`))
	})

	c := NewClient(s.URL+"/", "pat-xyz", WithUserAgent("ua-test"))
	token, err := c.MintRegistrationToken(context.Background(), "ttd")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if token != "reg-token-abc" {
		t.Errorf("token = %q, want reg-token-abc", token)
	}
	// Gitea 1.26+ requires POST; the legacy GET form was removed.
	if gotMethod != http.MethodPost {
		t.Errorf("method = %q, want POST", gotMethod)
	}
	if want := "/api/v1/orgs/ttd/actions/runners/registration-token"; gotPath != want {
		t.Errorf("path = %q, want %q", gotPath, want)
	}
	if gotAuth != "token pat-xyz" {
		t.Errorf("Authorization = %q, want %q", gotAuth, "token pat-xyz")
	}
	if gotUA != "ua-test" {
		t.Errorf("User-Agent = %q, want ua-test", gotUA)
	}
}

func TestMintRegistrationToken_PathEscaped(t *testing.T) {
	// Gitea org names are validated, but defence in depth: ensure path escaping
	// is applied so a hostile or malformed org code cannot construct a URL.
	var gotPath string
	s := newStubServer(t, func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.EscapedPath()
		_, _ = w.Write([]byte(`{"token":"x"}`))
	})
	c := NewClient(s.URL, "pat")
	if _, err := c.MintRegistrationToken(context.Background(), "weird/org"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(gotPath, "weird%2Forg") {
		t.Errorf("path did not escape slash: %q", gotPath)
	}
}

func TestMintRegistrationToken_Unauthorized(t *testing.T) {
	s := newStubServer(t, func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte("nope"))
	})
	c := NewClient(s.URL, "bad-pat")
	_, err := c.MintRegistrationToken(context.Background(), "ttd")
	if !errors.Is(err, ErrUnauthorized) {
		t.Errorf("want ErrUnauthorized, got %v", err)
	}
}

func TestMintRegistrationToken_Forbidden(t *testing.T) {
	s := newStubServer(t, func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusForbidden)
	})
	c := NewClient(s.URL, "pat")
	_, err := c.MintRegistrationToken(context.Background(), "ttd")
	if !errors.Is(err, ErrUnauthorized) {
		t.Errorf("want ErrUnauthorized, got %v", err)
	}
}

func TestMintRegistrationToken_NotFound(t *testing.T) {
	s := newStubServer(t, func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	})
	c := NewClient(s.URL, "pat")
	_, err := c.MintRegistrationToken(context.Background(), "missing-org")
	if !errors.Is(err, ErrOrgNotFound) {
		t.Errorf("want ErrOrgNotFound, got %v", err)
	}
}

func TestMintRegistrationToken_ServerError(t *testing.T) {
	s := newStubServer(t, func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte("kaboom"))
	})
	c := NewClient(s.URL, "pat")
	_, err := c.MintRegistrationToken(context.Background(), "ttd")
	if !errors.Is(err, ErrServer) {
		t.Errorf("want ErrServer, got %v", err)
	}
}

func TestMintRegistrationToken_EmptyToken(t *testing.T) {
	s := newStubServer(t, func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"token":""}`))
	})
	c := NewClient(s.URL, "pat")
	_, err := c.MintRegistrationToken(context.Background(), "ttd")
	if err == nil || !strings.Contains(err.Error(), "empty token") {
		t.Errorf("want empty-token error, got %v", err)
	}
}

func TestMintRegistrationToken_MalformedJSON(t *testing.T) {
	s := newStubServer(t, func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{not json`))
	})
	c := NewClient(s.URL, "pat")
	_, err := c.MintRegistrationToken(context.Background(), "ttd")
	if err == nil || !strings.Contains(err.Error(), "decode") {
		t.Errorf("want decode error, got %v", err)
	}
}

func TestMintRegistrationToken_EmptyOrg(t *testing.T) {
	c := NewClient("http://example", "pat")
	_, err := c.MintRegistrationToken(context.Background(), "")
	if err == nil {
		t.Fatal("expected error for empty org, got nil")
	}
}

func TestMintRegistrationToken_ContextCancelled(t *testing.T) {
	s := newStubServer(t, func(w http.ResponseWriter, _ *http.Request) {
		time.Sleep(200 * time.Millisecond)
		_, _ = w.Write([]byte(`{"token":"x"}`))
	})
	c := NewClient(s.URL, "pat")
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()
	_, err := c.MintRegistrationToken(ctx, "ttd")
	if err == nil {
		t.Fatal("expected error from cancelled context, got nil")
	}
}
