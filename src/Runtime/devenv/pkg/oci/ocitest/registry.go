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
	"strconv"
	"strings"
	"sync"
	"testing"

	"altinn.studio/devenv/pkg/oci"
)

// uploadState is the opaque query state the registry gives an upload, which the client must send back.
const uploadState = "_state=opaque%2Fstate"

// Registry records the blobs and manifests pushed to it.
type Registry struct {
	server    *httptest.Server
	blobs     map[string][]byte
	manifests map[string][]byte
	uploads   int
	mu        sync.Mutex
	absolute  bool
}

// NewRegistry starts a registry that is closed when the test ends.
func NewRegistry(t *testing.T) *Registry {
	t.Helper()
	r := &Registry{blobs: map[string][]byte{}, manifests: map[string][]byte{}}
	r.server = httptest.NewServer(http.HandlerFunc(r.serve))
	t.Cleanup(r.server.Close)
	return r
}

// Host returns the registry's host:port.
func (r *Registry) Host() string {
	return strings.TrimPrefix(r.server.URL, "http://")
}

// UseAbsoluteLocation makes upload sessions return an absolute Location URL instead of a relative one.
func (r *Registry) UseAbsoluteLocation() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.absolute = true
}

// Uploads returns how many blobs were uploaded.
func (r *Registry) Uploads() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.uploads
}

// Manifest returns the manifest tagged repository:tag.
func (r *Registry) Manifest(t *testing.T, repository, tag string) oci.Manifest {
	t.Helper()
	r.mu.Lock()
	data, ok := r.manifests[repository+":"+tag]
	r.mu.Unlock()
	if !ok {
		t.Fatalf("no manifest %s:%s", repository, tag)
	}
	var manifest oci.Manifest
	if err := json.Unmarshal(data, &manifest); err != nil {
		t.Fatalf("decode manifest %s:%s: %v", repository, tag, err)
	}
	return manifest
}

// Blob returns the blob a descriptor references, checking its size.
func (r *Registry) Blob(t *testing.T, descriptor oci.Descriptor) []byte {
	t.Helper()
	r.mu.Lock()
	data, ok := r.blobs[descriptor.Digest]
	r.mu.Unlock()
	if !ok {
		t.Fatalf("no blob %s", descriptor.Digest)
	}
	if int64(len(data)) != descriptor.Size {
		t.Fatalf("blob %s has %d bytes, descriptor says %d", descriptor.Digest, len(data), descriptor.Size)
	}
	return data
}

func (r *Registry) serve(w http.ResponseWriter, req *http.Request) {
	r.mu.Lock()
	defer r.mu.Unlock()
	path := strings.TrimPrefix(req.URL.Path, "/v2/")
	switch {
	case req.Method == http.MethodPost && strings.HasSuffix(path, "/blobs/uploads/"):
		location := "/v2/" + path + strconv.Itoa(r.uploads) + "?" + uploadState
		if r.absolute {
			location = r.server.URL + location
		}
		w.Header().Set("Location", location)
		w.WriteHeader(http.StatusAccepted)
	case req.Method == http.MethodPut && strings.Contains(path, "/blobs/uploads/"):
		r.putBlob(w, req)
	case req.Method == http.MethodHead && strings.Contains(path, "/blobs/"):
		if _, ok := r.blobs[path[strings.LastIndex(path, "/")+1:]]; !ok {
			w.WriteHeader(http.StatusNotFound)
		}
	case req.Method == http.MethodPut && strings.Contains(path, "/manifests/"):
		r.putManifest(w, req, strings.Replace(path, "/manifests/", ":", 1))
	default:
		http.Error(w, `{"errors":[{"code":"UNSUPPORTED"}]}`, http.StatusNotFound)
	}
}

func (r *Registry) putBlob(w http.ResponseWriter, req *http.Request) {
	if !strings.HasPrefix(req.URL.RawQuery, uploadState+"&") {
		http.Error(w, "upload state lost: "+req.URL.RawQuery, http.StatusBadRequest)
		return
	}
	data, err := io.ReadAll(req.Body)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	sum := sha256.Sum256(data)
	digest := "sha256:" + hex.EncodeToString(sum[:])
	if req.URL.Query().Get("digest") != digest {
		http.Error(w, `{"errors":[{"code":"DIGEST_INVALID"}]}`, http.StatusBadRequest)
		return
	}
	r.blobs[digest] = data
	r.uploads++
	w.WriteHeader(http.StatusCreated)
}

func (r *Registry) putManifest(w http.ResponseWriter, req *http.Request, name string) {
	if req.Header.Get("Content-Type") != oci.ManifestMediaType {
		http.Error(w, "wrong content type "+req.Header.Get("Content-Type"), http.StatusBadRequest)
		return
	}
	data, err := io.ReadAll(req.Body)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	var manifest oci.Manifest
	if err := json.Unmarshal(data, &manifest); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	for _, descriptor := range append([]oci.Descriptor{manifest.Config}, manifest.Layers...) {
		if _, ok := r.blobs[descriptor.Digest]; !ok {
			http.Error(w, `{"errors":[{"code":"MANIFEST_BLOB_UNKNOWN"}]}`, http.StatusBadRequest)
			return
		}
	}
	r.manifests[name] = data
	w.WriteHeader(http.StatusCreated)
}

// Entry is one file or directory in a tarball.
type Entry struct {
	Name    string
	Content string
	Mode    int64
	Type    byte
}

// ReadTarball returns the entries of a gzipped tarball and the SHA-256 of the uncompressed tar.
func ReadTarball(t *testing.T, data []byte) ([]Entry, string) {
	t.Helper()
	gz, err := gzip.NewReader(bytes.NewReader(data))
	if err != nil {
		t.Fatalf("read gzip: %v", err)
	}
	raw, err := io.ReadAll(gz)
	if err != nil {
		t.Fatalf("read gzip: %v", err)
	}
	var entries []Entry
	tr := tar.NewReader(bytes.NewReader(raw))
	for {
		header, err := tr.Next()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			t.Fatalf("read tar: %v", err)
		}
		if !header.ModTime.IsZero() && header.ModTime.Unix() != 0 || header.Uid != 0 || header.Uname != "" {
			t.Errorf("%s keeps owner or time: %+v", header.Name, header)
		}
		content, err := io.ReadAll(tr)
		if err != nil {
			t.Fatalf("read %s: %v", header.Name, err)
		}
		entries = append(
			entries,
			Entry{Name: header.Name, Type: header.Typeflag, Mode: header.Mode, Content: string(content)},
		)
	}
	sum := sha256.Sum256(raw)
	return entries, hex.EncodeToString(sum[:])
}
