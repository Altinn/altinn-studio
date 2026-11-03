// Package ocitest provides an in-memory OCI registry for tests, with the endpoints a push uses.
package ocitest

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

type (
	// Descriptor decodes a pushed descriptor, independently of the client's types.
	Descriptor struct {
		MediaType string `json:"mediaType"`
		Digest    string `json:"digest"`
		Size      int64  `json:"size"`
	}
	// Manifest decodes a pushed manifest, independently of the client's types.
	Manifest struct {
		Annotations   map[string]string `json:"annotations"`
		MediaType     string            `json:"mediaType"`
		Config        Descriptor        `json:"config"`
		Layers        []Descriptor      `json:"layers"`
		SchemaVersion int               `json:"schemaVersion"`
	}
)

// Registry records pushed blobs by digest and manifests by repository:tag.
type Registry struct {
	server    *httptest.Server
	blobs     map[string][]byte
	manifests map[string][]byte
	mu        sync.Mutex
}

// NewRegistry starts a registry that is closed when the test ends. Upload sessions get a Location with opaque
// query state, absolute or relative, that a blob PUT must send back.
func NewRegistry(t *testing.T, absoluteLocation bool) *Registry {
	t.Helper()
	r := &Registry{blobs: map[string][]byte{}, manifests: map[string][]byte{}}
	r.server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		r.mu.Lock()
		defer r.mu.Unlock()
		body, err := io.ReadAll(req.Body)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		repository, upload, isUpload := strings.Cut(strings.TrimPrefix(req.URL.Path, "/v2/"), "/blobs/uploads/")
		manifestRepository, tag, isManifest := strings.Cut(strings.TrimPrefix(req.URL.Path, "/v2/"), "/manifests/")
		sum := sha256.Sum256(body)
		switch digest := "sha256:" + hex.EncodeToString(sum[:]); {
		case req.Method == http.MethodPost && isUpload && upload == "":
			location := "/v2/" + repository + "/blobs/uploads/session?state=kept"
			if absoluteLocation {
				location = r.server.URL + location
			}
			w.Header().Set("Location", location)
			w.WriteHeader(http.StatusAccepted)
		case req.Method == http.MethodPut && isUpload && upload == "session" &&
			req.URL.Query().Get("state") == "kept" && req.URL.Query().Get("digest") == digest:
			r.blobs[digest] = body
			w.WriteHeader(http.StatusCreated)
		case req.Method == http.MethodPut && isManifest &&
			req.Header.Get("Content-Type") == "application/vnd.oci.image.manifest.v1+json":
			r.manifests[manifestRepository+":"+tag] = body
			w.WriteHeader(http.StatusCreated)
		default:
			http.Error(w, "unexpected "+req.Method+" "+req.URL.String(), http.StatusBadRequest)
		}
	}))
	t.Cleanup(r.server.Close)
	return r
}

// Host returns the registry's host:port.
func (r *Registry) Host() string {
	return strings.TrimPrefix(r.server.URL, "http://")
}

// Manifest decodes the manifest tagged name, repository:tag.
func (r *Registry) Manifest(t *testing.T, name string) Manifest {
	t.Helper()
	r.mu.Lock()
	defer r.mu.Unlock()
	var manifest Manifest
	if err := json.Unmarshal(r.manifests[name], &manifest); err != nil {
		t.Fatalf("manifest %s: %v", name, err)
	}
	return manifest
}

// Blob returns the blob a descriptor references, checking that it was pushed with the descriptor's size.
func (r *Registry) Blob(t *testing.T, descriptor Descriptor) []byte {
	t.Helper()
	r.mu.Lock()
	defer r.mu.Unlock()
	data, ok := r.blobs[descriptor.Digest]
	if !ok || int64(len(data)) != descriptor.Size {
		t.Fatalf("no blob %+v", descriptor)
	}
	return data
}

// Entry is one entry in a tarball.
type Entry struct {
	Name    string
	Content string
	Mode    int64
	Type    byte
}

// ReadTarball returns the entries of a gzipped tarball and the SHA-256 of the uncompressed tar. It fails the
// test if an entry keeps an owner or a time.
func ReadTarball(t *testing.T, data []byte) ([]Entry, string) {
	t.Helper()
	gz, err := gzip.NewReader(bytes.NewReader(data))
	if err != nil {
		t.Fatal(err)
	}
	raw, err := io.ReadAll(gz)
	if err != nil {
		t.Fatal(err)
	}
	var entries []Entry
	tr := tar.NewReader(bytes.NewReader(raw))
	for {
		header, err := tr.Next()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			t.Fatal(err)
		}
		if !header.ModTime.IsZero() && header.ModTime.Unix() != 0 || header.Uid != 0 || header.Uname != "" {
			t.Errorf("%s keeps owner or time: %+v", header.Name, header)
		}
		content, err := io.ReadAll(tr)
		if err != nil {
			t.Fatal(err)
		}
		entries = append(entries, Entry{header.Name, string(content), header.Mode, header.Typeflag})
	}
	sum := sha256.Sum256(raw)
	return entries, hex.EncodeToString(sum[:])
}
