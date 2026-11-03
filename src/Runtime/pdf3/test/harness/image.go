package harness

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"path"
	"runtime"
	"strings"
)

// The manifest and layer media types of the Docker v2 and OCI image formats that ReadImageFile reads.
const (
	ociIndex        = "application/vnd.oci.image.index.v1+json"
	ociManifest     = "application/vnd.oci.image.manifest.v1+json"
	ociLayer        = "application/vnd.oci.image.layer.v1.tar"
	ociLayerGzip    = "application/vnd.oci.image.layer.v1.tar+gzip"
	dockerList      = "application/vnd.docker.distribution.manifest.list.v2+json"
	dockerManifest  = "application/vnd.docker.distribution.manifest.v2+json"
	dockerLayerGzip = "application/vnd.docker.image.rootfs.diff.tar.gzip"
	whiteoutPrefix  = ".wh."
	opaqueWhiteout  = ".wh..wh..opq"
)

var (
	errRegistryResponse = errors.New("unexpected registry response")
	errDigestMismatch   = errors.New("digest mismatch")
	errUnsupportedImage = errors.New("unsupported image")
	errImageFileMissing = errors.New("no such file in the image")
	errNotRegularFile   = errors.New("not a regular file in the image")
)

type descriptor struct {
	MediaType string `json:"mediaType"`
	Digest    string `json:"digest"`
	Platform  struct {
		OS           string `json:"os"`
		Architecture string `json:"architecture"`
	} `json:"platform"`
}

// manifest decodes both an image manifest, which has layers, and an index, which has manifests.
type manifest struct {
	Manifests []descriptor `json:"manifests"`
	Layers    []descriptor `json:"layers"`
}

// imageFile is a path in an image's file system as the layers applied so far leave it.
type imageFile struct {
	data    []byte
	present bool
	regular bool
}

// ReadImageFile returns the regular file at filePath, relative to the root, in the file system of the image
// ref (host/repository:tag). It reads the image from its registry over plain HTTP without credentials, as the
// local runtime fixture's registry at localhost:5001 serves it. From an index it reads the image for this
// machine's architecture, which is the one the fixture builds and runs.
func ReadImageFile(ctx context.Context, ref, filePath string) ([]byte, error) {
	host, name, _ := strings.Cut(ref, "/")
	repository, tag, _ := strings.Cut(name, ":")
	base := "http://" + host + "/v2/" + repository
	image, err := readManifest(ctx, base, tag)
	if err != nil {
		return nil, fmt.Errorf("read manifest of %s: %w", ref, err)
	}
	var file imageFile
	for _, layer := range image.Layers {
		if file, err = readLayer(ctx, base, layer, file, filePath); err != nil {
			return nil, fmt.Errorf("read layer %s of %s: %w", layer.Digest, ref, err)
		}
	}
	switch {
	case !file.present:
		return nil, fmt.Errorf("/%s: %w", filePath, errImageFileMissing)
	case !file.regular:
		return nil, fmt.Errorf("/%s: %w", filePath, errNotRegularFile)
	}
	return file.data, nil
}

// readManifest returns the image manifest that tag names, resolving an index to this machine's platform.
func readManifest(ctx context.Context, base, tag string) (manifest, error) {
	image, mediaType, err := fetchManifest(ctx, base, tag, "")
	if err == nil && (mediaType == ociIndex || mediaType == dockerList) {
		var entry descriptor
		if entry, err = pickPlatform(image.Manifests); err == nil {
			image, mediaType, err = fetchManifest(ctx, base, entry.Digest, entry.Digest)
		}
	}
	if err != nil {
		return manifest{}, err
	}
	if mediaType != ociManifest && mediaType != dockerManifest {
		return manifest{}, fmt.Errorf("%w: manifest media type %q", errUnsupportedImage, mediaType)
	}
	return image, nil
}

// fetchManifest returns the manifest or index that reference, a tag or digest, names, and its media type.
func fetchManifest(ctx context.Context, base, reference, digest string) (manifest, string, error) {
	accept := strings.Join([]string{ociIndex, dockerList, ociManifest, dockerManifest}, ", ")
	data, mediaType, err := fetch(ctx, base+"/manifests/"+reference, accept, digest)
	if err != nil {
		return manifest{}, "", err
	}
	var decoded manifest
	if err = json.Unmarshal(data, &decoded); err != nil {
		return manifest{}, "", fmt.Errorf("decode %s %s: %w", mediaType, reference, err)
	}
	return decoded, mediaType, nil
}

// pickPlatform returns the index entry for linux on this machine's architecture, or the only entry.
func pickPlatform(entries []descriptor) (descriptor, error) {
	for _, entry := range entries {
		if entry.Platform.OS == "linux" && entry.Platform.Architecture == runtime.GOARCH {
			return entry, nil
		}
	}
	if len(entries) == 1 {
		return entries[0], nil
	}
	return descriptor{}, fmt.Errorf("%w: no linux/%s image in the index", errUnsupportedImage, runtime.GOARCH)
}

// readLayer applies the layer to file, the target path as the layers below leave it.
func readLayer(ctx context.Context, base string, layer descriptor, file imageFile, target string) (imageFile, error) {
	data, _, err := fetch(ctx, base+"/blobs/"+layer.Digest, "", layer.Digest)
	if err != nil {
		return imageFile{}, err
	}
	var files io.Reader = bytes.NewReader(data)
	switch layer.MediaType {
	case ociLayer:
	case ociLayerGzip, dockerLayerGzip:
		if files, err = gzip.NewReader(files); err != nil {
			return imageFile{}, fmt.Errorf("decompress: %w", err)
		}
	default:
		return imageFile{}, fmt.Errorf("%w: layer media type %q", errUnsupportedImage, layer.MediaType)
	}
	return applyLayer(file, tar.NewReader(files), target)
}

// applyLayer returns the target path as the layer leaves it, given below, the path as the layers below leave
// it. The layer replaces the path when it has it, and otherwise deletes it from the layers below with a
// whiteout of the path or of a directory above it, or with an opaque whiteout in a directory above it.
func applyLayer(below imageFile, layer *tar.Reader, target string) (imageFile, error) {
	var file imageFile
	found, deleted := false, false
	for {
		header, err := layer.Next()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return imageFile{}, fmt.Errorf("read tar: %w", err)
		}
		name := path.Clean(strings.TrimPrefix(header.Name, "/"))
		dir, base := path.Split(name)
		hidden, isWhiteout := strings.CutPrefix(base, whiteoutPrefix)
		switch {
		case name == target:
			found = true
			file = imageFile{present: true, regular: header.Typeflag == tar.TypeReg}
			if file.data, err = io.ReadAll(layer); err != nil {
				return imageFile{}, fmt.Errorf("read /%s: %w", target, err)
			}
		case base == opaqueWhiteout:
			deleted = deleted || strings.HasPrefix(target, dir)
		case isWhiteout:
			deleted = deleted || target == dir+hidden || strings.HasPrefix(target, dir+hidden+"/")
		}
	}
	switch {
	case found:
		return file, nil
	case deleted:
		return imageFile{}, nil
	}
	return below, nil
}

// fetch GETs url and returns the body and its media type. It checks the body against digest unless that is
// empty, as for a manifest read by tag.
func fetch(ctx context.Context, url, accept, digest string) ([]byte, string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, "", fmt.Errorf("create GET %s: %w", url, err)
	}
	if accept != "" {
		req.Header.Set("Accept", accept)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("GET %s: %w", url, err)
	}
	data, err := io.ReadAll(resp.Body)
	if err = errors.Join(err, resp.Body.Close()); err != nil {
		return nil, "", fmt.Errorf("read GET %s: %w", url, err)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, "", fmt.Errorf("%w: GET %s: %s: %s", errRegistryResponse, url, resp.Status, bytes.TrimSpace(data))
	}
	sum := sha256.Sum256(data)
	if actual := "sha256:" + hex.EncodeToString(sum[:]); digest != "" && actual != digest {
		return nil, "", fmt.Errorf("%w: GET %s: got %s", errDigestMismatch, url, actual)
	}
	return data, resp.Header.Get("Content-Type"), nil
}
