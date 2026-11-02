package oci

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"slices"
	"strings"
	"time"
)

// ManifestMediaType is the media type of the OCI image manifests the client pushes.
const ManifestMediaType = "application/vnd.oci.image.manifest.v1+json"

const (
	referencePrefix   = "oci://"
	defaultTag        = "latest"
	requestTimeout    = 2 * time.Minute
	maxErrorBodyBytes = 4096
)

var (
	errInvalidReference = errors.New("invalid OCI reference")
	errRegistryResponse = errors.New("unexpected registry response")
)

// Reference names a tagged manifest in a registry.
type Reference struct {
	Host       string
	Repository string
	Tag        string
}

// ParseReference parses oci://host/repository[:tag]. The tag defaults to latest, as in Flux.
func ParseReference(raw string) (Reference, error) {
	rest, ok := strings.CutPrefix(raw, referencePrefix)
	if !ok {
		return Reference{}, fmt.Errorf("%w %q: missing %s prefix", errInvalidReference, raw, referencePrefix)
	}
	host, name, ok := strings.Cut(rest, "/")
	if !ok || host == "" || name == "" {
		return Reference{}, fmt.Errorf("%w %q: missing repository", errInvalidReference, raw)
	}
	if strings.Contains(name, "@") {
		return Reference{}, fmt.Errorf("%w %q: digest references are not supported", errInvalidReference, raw)
	}
	repository, tag, hasTag := strings.Cut(name, ":")
	if !hasTag {
		tag = defaultTag
	}
	if repository == "" || tag == "" || strings.Contains(tag, "/") {
		return Reference{}, fmt.Errorf("%w %q", errInvalidReference, raw)
	}
	return Reference{Host: host, Repository: repository, Tag: tag}, nil
}

// String returns the reference in oci://host/repository:tag form.
func (r Reference) String() string {
	return referencePrefix + r.Host + "/" + r.Repository + ":" + r.Tag
}

// Blob is content to upload, with the media type its descriptor gets.
type Blob struct {
	MediaType string
	Data      []byte
}

// Descriptor points from a manifest to a blob.
type Descriptor struct {
	MediaType string `json:"mediaType"`
	Digest    string `json:"digest"`
	Size      int64  `json:"size"`
}

// Manifest is an OCI image manifest.
type Manifest struct {
	Annotations   map[string]string `json:"annotations,omitempty"`
	MediaType     string            `json:"mediaType"`
	Config        Descriptor        `json:"config"`
	Layers        []Descriptor      `json:"layers"`
	SchemaVersion int               `json:"schemaVersion"`
}

func describe(blob Blob) Descriptor {
	sum := sha256.Sum256(blob.Data)
	return Descriptor{
		MediaType: blob.MediaType,
		Digest:    "sha256:" + hex.EncodeToString(sum[:]),
		Size:      int64(len(blob.Data)),
	}
}

// Client pushes artifacts to an OCI registry over plain HTTP, without authentication. It only serves the
// local runtime fixture's registry at localhost:5001, which has neither TLS nor credentials.
type Client struct {
	http *http.Client
}

// NewClient creates a client for the local runtime fixture's registry.
func NewClient() *Client {
	return &Client{
		http: &http.Client{Timeout: requestTimeout},
	}
}

// Push uploads the config and layer blobs that the registry lacks, then tags a manifest that references
// them. It returns the manifest's descriptor.
func (c *Client) Push(
	ctx context.Context,
	ref Reference,
	config Blob,
	layers []Blob,
	annotations map[string]string,
) (Descriptor, error) {
	manifest := Manifest{
		SchemaVersion: 2,
		MediaType:     ManifestMediaType,
		Layers:        make([]Descriptor, 0, len(layers)),
		Annotations:   annotations,
	}
	var err error
	if manifest.Config, err = c.pushBlob(ctx, ref, config); err != nil {
		return Descriptor{}, err
	}
	for _, layer := range layers {
		descriptor, pushErr := c.pushBlob(ctx, ref, layer)
		if pushErr != nil {
			return Descriptor{}, pushErr
		}
		manifest.Layers = append(manifest.Layers, descriptor)
	}
	data, err := json.Marshal(manifest)
	if err != nil {
		return Descriptor{}, fmt.Errorf("encode manifest for %s: %w", ref, err)
	}
	target := c.endpoint(ref, "/manifests/"+ref.Tag)
	if _, _, err := c.do(ctx, http.MethodPut, target, ManifestMediaType, data, http.StatusCreated); err != nil {
		return Descriptor{}, fmt.Errorf("push manifest %s: %w", ref, err)
	}
	return describe(Blob{MediaType: ManifestMediaType, Data: data}), nil
}

// pushBlob uploads blob unless the registry has it: a POST opens an upload session, and one PUT sends the
// whole blob with its digest.
func (c *Client) pushBlob(ctx context.Context, ref Reference, blob Blob) (Descriptor, error) {
	descriptor := describe(blob)
	exists, err := c.blobExists(ctx, ref, descriptor.Digest)
	if err != nil {
		return Descriptor{}, err
	}
	if exists {
		return descriptor, nil
	}
	uploads := c.endpoint(ref, "/blobs/uploads/")
	_, header, err := c.do(ctx, http.MethodPost, uploads, "", nil, http.StatusAccepted)
	if err != nil {
		return Descriptor{}, fmt.Errorf("start upload of %s: %w", descriptor.Digest, err)
	}
	// Location may be relative or absolute, and may carry state in its query that we must keep.
	location, err := resolveLocation(uploads, header.Get("Location"))
	if err != nil {
		return Descriptor{}, fmt.Errorf("start upload of %s: read Location: %w", descriptor.Digest, err)
	}
	digestParam := "digest=" + url.QueryEscape(descriptor.Digest)
	if location.RawQuery == "" {
		location.RawQuery = digestParam
	} else {
		location.RawQuery += "&" + digestParam
	}
	_, _, err = c.do(ctx, http.MethodPut, location.String(), "application/octet-stream", blob.Data, http.StatusCreated)
	if err != nil {
		return Descriptor{}, fmt.Errorf("upload %s: %w", descriptor.Digest, err)
	}
	return descriptor, nil
}

func (c *Client) blobExists(ctx context.Context, ref Reference, digest string) (bool, error) {
	target := c.endpoint(ref, "/blobs/"+digest)
	status, _, err := c.do(ctx, http.MethodHead, target, "", nil, http.StatusOK, http.StatusNotFound)
	if err != nil {
		return false, fmt.Errorf("check blob %s: %w", digest, err)
	}
	return status == http.StatusOK, nil
}

func resolveLocation(base, location string) (*url.URL, error) {
	if location == "" {
		return nil, fmt.Errorf("%w: no Location", errRegistryResponse)
	}
	baseURL, err := url.Parse(base)
	if err != nil {
		return nil, fmt.Errorf("parse %s: %w", base, err)
	}
	resolved, err := baseURL.Parse(location)
	if err != nil {
		return nil, fmt.Errorf("parse Location %q: %w", location, err)
	}
	return resolved, nil
}

func (c *Client) endpoint(ref Reference, path string) string {
	return "http://" + ref.Host + "/v2/" + ref.Repository + path
}

// do sends one request and fails unless the registry answers with one of the expected statuses.
func (c *Client) do(
	ctx context.Context,
	method, target, contentType string,
	body []byte,
	expected ...int,
) (int, http.Header, error) {
	req, err := http.NewRequestWithContext(ctx, method, target, bytes.NewReader(body))
	if err != nil {
		return 0, nil, fmt.Errorf("create %s %s: %w", method, target, err)
	}
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return 0, nil, fmt.Errorf("%s %s: %w", method, target, err)
	}
	defer func() {
		if closeErr := resp.Body.Close(); closeErr != nil {
			return
		}
	}()
	if slices.Contains(expected, resp.StatusCode) {
		return resp.StatusCode, resp.Header, nil
	}
	message, err := io.ReadAll(io.LimitReader(resp.Body, maxErrorBodyBytes))
	if err != nil {
		message = []byte("(unreadable body: " + err.Error() + ")")
	}
	return 0, nil, fmt.Errorf(
		"%w: %s %s: %s: %s",
		errRegistryResponse,
		method,
		target,
		resp.Status,
		strings.TrimSpace(string(message)),
	)
}

func closeQuietly(closer io.Closer) {
	if err := closer.Close(); err != nil {
		return
	}
}
