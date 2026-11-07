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
	"strings"
	"time"
)

const (
	manifestMediaType = "application/vnd.oci.image.manifest.v1+json"
	requestTimeout    = 2 * time.Minute
	maxErrorBodyBytes = 4096
)

var (
	errInvalidReference = errors.New("invalid OCI reference")
	errRegistryResponse = errors.New("unexpected registry response")
)

// Blob is content to upload, with the media type its descriptor gets.
type Blob struct {
	MediaType string
	Data      []byte
}

type descriptor struct {
	MediaType string `json:"mediaType"`
	Digest    string `json:"digest"`
	Size      int64  `json:"size"`
}

type manifest struct {
	Annotations   map[string]string `json:"annotations,omitempty"`
	MediaType     string            `json:"mediaType"`
	Config        descriptor        `json:"config"`
	Layers        []descriptor      `json:"layers"`
	SchemaVersion int               `json:"schemaVersion"`
}

// Client pushes artifacts to an OCI registry over plain HTTP, without authentication. It only serves the
// local runtime fixture's registry at localhost:5001, which has neither TLS nor credentials.
type Client struct {
	http *http.Client
}

// NewClient creates a client for the local runtime fixture's registry.
func NewClient() *Client {
	return &Client{http: &http.Client{Timeout: requestTimeout}}
}

// Push uploads a config and one layer, then tags a manifest that references them as ref,
// oci://host/repository[:tag]. The tag defaults to latest, as in Flux.
func (c *Client) Push(ctx context.Context, ref string, config, layer Blob, annotations map[string]string) error {
	host, name, ok := strings.Cut(strings.TrimPrefix(ref, "oci://"), "/")
	if !strings.HasPrefix(ref, "oci://") || !ok || host == "" || name == "" {
		return fmt.Errorf("%w %q", errInvalidReference, ref)
	}
	repository, tag, hasTag := strings.Cut(name, ":")
	if !hasTag {
		tag = "latest"
	}
	base := "http://" + host + "/v2/" + repository
	descriptors := make([]descriptor, 2)
	for i, blob := range []Blob{config, layer} {
		var err error
		if descriptors[i], err = c.pushBlob(ctx, base, blob); err != nil {
			return err
		}
	}
	data, err := json.Marshal(manifest{
		SchemaVersion: 2,
		MediaType:     manifestMediaType,
		Config:        descriptors[0],
		Layers:        descriptors[1:],
		Annotations:   annotations,
	})
	if err == nil {
		_, err = c.do(ctx, http.MethodPut, base+"/manifests/"+tag, manifestMediaType, data)
	}
	if err != nil {
		return fmt.Errorf("push manifest %s: %w", ref, err)
	}
	return nil
}

// pushBlob uploads blob: a POST opens an upload session, and one PUT sends the whole blob with its digest.
func (c *Client) pushBlob(ctx context.Context, base string, blob Blob) (descriptor, error) {
	sum := sha256.Sum256(blob.Data)
	digest := "sha256:" + hex.EncodeToString(sum[:])
	uploads := base + "/blobs/uploads/"
	header, err := c.do(ctx, http.MethodPost, uploads, "", nil)
	if err != nil {
		return descriptor{}, fmt.Errorf("start upload of %s: %w", digest, err)
	}
	// Location may be relative or absolute, and may carry state in its query that we must keep.
	location, err := url.Parse(uploads)
	if err == nil {
		location, err = location.Parse(header.Get("Location"))
	}
	if err != nil {
		return descriptor{}, fmt.Errorf("read upload Location for %s: %w", digest, err)
	}
	if location.RawQuery != "" {
		location.RawQuery += "&"
	}
	location.RawQuery += "digest=" + url.QueryEscape(digest)
	_, err = c.do(ctx, http.MethodPut, location.String(), "application/octet-stream", blob.Data)
	if err != nil {
		return descriptor{}, fmt.Errorf("upload %s: %w", digest, err)
	}
	return descriptor{MediaType: blob.MediaType, Digest: digest, Size: int64(len(blob.Data))}, nil
}

// do sends one request and fails unless the registry answers with a 2xx status.
func (c *Client) do(ctx context.Context, method, target, contentType string, body []byte) (http.Header, error) {
	req, err := http.NewRequestWithContext(ctx, method, target, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create %s %s: %w", method, target, err)
	}
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("%s %s: %w", method, target, err)
	}
	defer closeQuietly(resp.Body)
	if resp.StatusCode >= http.StatusOK && resp.StatusCode < http.StatusMultipleChoices {
		return resp.Header, nil
	}
	message, err := io.ReadAll(io.LimitReader(resp.Body, maxErrorBodyBytes))
	if err != nil {
		message = []byte("(unreadable body: " + err.Error() + ")")
	}
	return nil, fmt.Errorf(
		"%w: %s %s: %s: %s",
		errRegistryResponse,
		method,
		target,
		resp.Status,
		bytes.TrimSpace(message),
	)
}

func closeQuietly(closer io.Closer) {
	if err := closer.Close(); err != nil {
		return
	}
}
