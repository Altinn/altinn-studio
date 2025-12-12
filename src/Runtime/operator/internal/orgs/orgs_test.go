package orgs

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	. "github.com/onsi/gomega"
)

const testOrgData = `{
	"orgs": {
		"ttd": {
			"name": {
				"en": "Test Department",
				"nb": "Testdepartementet",
				"nn": "Testdepartementet"
			},
			"orgnr": "991825827"
		},
		"digdir": {
			"name": {
				"en": "Norwegian Digitalisation Agency",
				"nb": "Digitaliseringsdirektoratet",
				"nn": "Digitaliseringsdirektoratet"
			},
			"orgnr": "991825827"
		}
	}
}`

func TestNewOrgRegistry(t *testing.T) {
	RegisterTestingT(t)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(testOrgData))
	}))
	defer server.Close()

	registry, err := NewOrgRegistry(context.Background(), server.URL)
	Expect(err).NotTo(HaveOccurred())
	Expect(registry).NotTo(BeNil())
}

func TestGet(t *testing.T) {
	RegisterTestingT(t)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(testOrgData))
	}))
	defer server.Close()

	registry, err := NewOrgRegistry(context.Background(), server.URL)
	Expect(err).NotTo(HaveOccurred())

	org, ok := registry.Get("ttd")
	Expect(ok).To(BeTrue())
	Expect(org.OrgNr).To(Equal("991825827"))
	Expect(org.Name.Nb).To(Equal("Testdepartementet"))

	org, ok = registry.Get("digdir")
	Expect(ok).To(BeTrue())
	Expect(org.OrgNr).To(Equal("991825827"))

	_, ok = registry.Get("nonexistent")
	Expect(ok).To(BeFalse())
}

func TestFetchWithRetry(t *testing.T) {
	RegisterTestingT(t)

	attempts := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		if attempts < 3 {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(testOrgData))
	}))
	defer server.Close()

	registry, err := NewOrgRegistry(
		context.Background(),
		server.URL,
		WithRetryConfig(1*time.Millisecond, 10*time.Millisecond, 5),
	)
	Expect(err).NotTo(HaveOccurred())
	Expect(registry).NotTo(BeNil())
	Expect(attempts).To(Equal(3))
}

func TestFetchFailsAfterMaxRetries(t *testing.T) {
	RegisterTestingT(t)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	_, err := NewOrgRegistry(
		context.Background(),
		server.URL,
		WithRetryConfig(1*time.Millisecond, 10*time.Millisecond, 3),
	)
	Expect(err).To(HaveOccurred())
	Expect(err.Error()).To(ContainSubstring("failed to fetch org registry"))
}

func TestContextCancellation(t *testing.T) {
	RegisterTestingT(t)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(100 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(testOrgData))
	}))
	defer server.Close()

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err := NewOrgRegistry(ctx, server.URL)
	Expect(err).To(HaveOccurred())
}
