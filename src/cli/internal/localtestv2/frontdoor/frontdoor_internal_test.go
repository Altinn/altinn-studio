package frontdoor

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestARegistrationCountsWhenItIsAtTheAddressAndFreshlyProvisioned(t *testing.T) {
	t.Parallel()
	since := time.Date(2026, 10, 22, 12, 0, 0, 0, time.UTC)
	cases := map[string]struct {
		body string
		want bool
	}{
		"not registered":  {`[{"org":"ttd","app":"other","url":"http://host.docker.internal:5005"}]`, false},
		"another address": {`[{"org":"ttd","app":"app","url":"http://host.docker.internal:5006"}]`, false},
		"provisioning":    {`[{"org":"ttd","app":"app","url":"http://host.docker.internal:5005"}]`, false},
		"stale": {
			`[{"org":"ttd","app":"app","url":"http://host.docker.internal:5005",` +
				`"provisioning":{"state":"succeeded","at":"2026-10-22T11:59:00Z"}}]`,
			false,
		},
		"failed": {
			`[{"org":"ttd","app":"app","url":"http://host.docker.internal:5005",` +
				`"provisioning":{"state":"failed","at":"2026-10-22T12:00:01Z","error":"no"}}]`,
			false,
		},
		"provisioned before, in another zone": {
			`[{"org":"ttd","app":"app","url":"http://host.docker.internal:5005",` +
				`"provisioning":{"state":"succeeded","at":"2026-10-22T12:00:01.5+02:00"}},` +
				`{"org":"ttd","app":"app2","url":"x"}]`,
			false,
		},
		"provisioned now": {
			`[{"org":"ttd","app":"app","url":"http://host.docker.internal:5005",` +
				`"provisioning":{"state":"succeeded","at":"2026-10-22T12:00:01.5Z"}}]`,
			true,
		},
	}
	for name, c := range cases {
		var apps []App
		if err := json.Unmarshal([]byte(c.body), &apps); err != nil {
			t.Fatal(err)
		}
		got, err := registered(apps, "ttd", "app", AppURL(5005), since)
		if got != c.want || (err == nil) != c.want {
			t.Errorf("%s: registered = %v, %v; want %v", name, got, err, c.want)
		}
	}
}

func TestWaitForAppReturnsOnceTheAppIsProvisioned(t *testing.T) {
	t.Parallel()
	since := time.Now()
	calls := 0
	var mu sync.Mutex
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()
		calls++
		if r.URL.Path != appsPath {
			t.Errorf("path = %s", r.URL.Path)
		}
		if calls == 1 {
			write(t, w, `[]`)
			return
		}
		data, err := json.Marshal([]App{{
			Org: "ttd", App: "app", URL: AppURL(5005),
			Provisioning: &Provisioning{At: since, State: provisioningSucceeded, Error: ""},
		}})
		if err != nil {
			t.Error(err)
		}
		write(t, w, string(data))
	}))
	defer server.Close()

	ctx, cancel := context.WithTimeout(t.Context(), 10*time.Second)
	defer cancel()
	if err := NewClient(server.URL+"/").WaitForApp(ctx, "ttd", "app", AppURL(5005), since); err != nil {
		t.Fatalf("WaitForApp() = %v", err)
	}
}

func TestWaitForAppSaysWhatTheFrontDoorLastHad(t *testing.T) {
	t.Parallel()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		write(t, w, `[{"org":"ttd","app":"app","url":"http://host.docker.internal:5005",`+
			`"provisioning":{"state":"failed","at":"2999-01-01T00:00:00Z","error":"Storage answered 500"}}]`)
	}))
	defer server.Close()

	ctx, cancel := context.WithTimeout(t.Context(), time.Second)
	defer cancel()
	err := NewClient(server.URL).WaitForApp(ctx, "ttd", "app", AppURL(5005), time.Now())
	if !errors.Is(err, context.DeadlineExceeded) ||
		!strings.Contains(err.Error(), "provisioning failed: Storage answered 500") {
		t.Fatalf("WaitForApp() = %v, want the deadline and the failed provisioning", err)
	}
}

func TestAFrontDoorThatDoesNotAnswerIsUnreachable(t *testing.T) {
	t.Parallel()
	server := httptest.NewServer(http.NotFoundHandler())
	server.Close()

	if _, err := NewClient(server.URL).Apps(t.Context()); !errors.Is(err, ErrUnreachable) {
		t.Fatalf("Apps() = %v, want ErrUnreachable", err)
	}
}

func TestTheDevServerRouteIsSetAndRemoved(t *testing.T) {
	t.Parallel()
	type request struct{ method, path, contentType, body string }
	var (
		mu       sync.Mutex
		requests []request
	)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Error(err)
		}
		mu.Lock()
		requests = append(requests, request{r.Method, r.URL.Path, r.Header.Get("Content-Type"), string(body)})
		mu.Unlock()
		w.WriteHeader(http.StatusNoContent)
	}))
	defer server.Close()

	client := NewClient(server.URL + "/")
	if err := client.PutFrontendDevServer(t.Context(), AppURL(8080)); err != nil {
		t.Fatal(err)
	}
	if err := client.DeleteFrontendDevServer(t.Context()); err != nil {
		t.Fatal(err)
	}

	want := []request{
		{http.MethodPut, devServerPath, "application/json", `{"url":"http://host.docker.internal:8080"}`},
		{http.MethodDelete, devServerPath, "", ""},
	}
	if len(requests) != len(want) {
		t.Fatalf("requests = %+v, want %+v", requests, want)
	}
	for i := range want {
		if requests[i] != want[i] {
			t.Errorf("request %d = %+v, want %+v", i, requests[i], want[i])
		}
	}
}

func TestARefusedDevServerRouteIsAnError(t *testing.T) {
	t.Parallel()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
	}))
	defer server.Close()
	if err := NewClient(server.URL).PutFrontendDevServer(t.Context(), "http://x/path"); !errors.Is(err, ErrRefused) {
		t.Fatalf("PutFrontendDevServer() = %v, want ErrRefused", err)
	}
}

func write(t *testing.T, w io.Writer, body string) {
	t.Helper()
	if _, err := io.WriteString(w, body); err != nil {
		t.Error(err)
	}
}
