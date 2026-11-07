package harness

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"path"
	"strings"
)

// The manifest and layer media types of the Docker v2 and OCI image formats that ReadImageFile reads.
const (
	ociManifest     = "application/vnd.oci.image.manifest.v1+json"
	ociLayer        = "application/vnd.oci.image.layer.v1.tar"
	ociLayerGzip    = "application/vnd.oci.image.layer.v1.tar+gzip"
	dockerManifest  = "application/vnd.docker.distribution.manifest.v2+json"
	dockerLayerGzip = "application/vnd.docker.image.rootfs.diff.tar.gzip"
	whiteoutPrefix  = ".wh."
	opaqueWhiteout  = ".wh..wh..opq"
)

var (
	errRegistryResponse = errors.New("unexpected registry response")
	errUnsupportedImage = errors.New("unsupported image")
	errImageFileMissing = errors.New("no such file in the image")
	errNotRegularFile   = errors.New("not a regular file in the image")
)

type descriptor struct {
	MediaType string `json:"mediaType"`
	Digest    string `json:"digest"`
}

type manifest struct {
	Layers []descriptor `json:"layers"`
}

// imageFile is a path in an image's file system as the layers applied so far leave it.
type imageFile struct {
	data    []byte
	present bool
	regular bool
}

// ReadImageFile returns the regular file at filePath, relative to the root, in the file system of the image
// ref (host/repository:tag). It reads the image from its registry over plain HTTP without credentials, as the
// local runtime fixture's registry at localhost:5001 serves it. It reads an image manifest but not an index,
// as devenv builds the fixture's images for one platform and without attestations. It does not follow links.
func ReadImageFile(ctx context.Context, ref, filePath string) ([]byte, error) {
	filePath = strings.TrimPrefix(path.Clean("/"+filePath), "/")
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

func readManifest(ctx context.Context, base, tag string) (image manifest, err error) {
	resp, err := fetch(ctx, base+"/manifests/"+tag, ociManifest+", "+dockerManifest)
	if err != nil {
		return manifest{}, err
	}
	defer func() { err = errors.Join(err, resp.Body.Close()) }()
	mediaType, _, _ := strings.Cut(resp.Header.Get("Content-Type"), ";")
	if mediaType != ociManifest && mediaType != dockerManifest {
		return manifest{}, fmt.Errorf("%w: manifest media type %q", errUnsupportedImage, mediaType)
	}
	if err = json.NewDecoder(resp.Body).Decode(&image); err != nil {
		return manifest{}, fmt.Errorf("decode manifest %s: %w", tag, err)
	}
	return image, nil
}

func readLayer(
	ctx context.Context,
	base string,
	layer descriptor,
	below imageFile,
	target string,
) (file imageFile, err error) {
	resp, err := fetch(ctx, base+"/blobs/"+layer.Digest, "")
	if err != nil {
		return imageFile{}, err
	}
	defer func() { err = errors.Join(err, resp.Body.Close()) }()
	var files io.Reader = resp.Body
	switch layer.MediaType {
	case ociLayer:
	case ociLayerGzip, dockerLayerGzip:
		var gz *gzip.Reader
		if gz, err = gzip.NewReader(files); err != nil {
			return imageFile{}, fmt.Errorf("decompress: %w", err)
		}
		defer func() { err = errors.Join(err, gz.Close()) }()
		files = gz
	default:
		return imageFile{}, fmt.Errorf("%w: layer media type %q", errUnsupportedImage, layer.MediaType)
	}
	return applyLayer(below, tar.NewReader(files), target)
}

// Whiteouts only hide lower layers, regardless of their order relative to this layer's target entry.
func applyLayer(below imageFile, layer *tar.Reader, target string) (imageFile, error) {
	var file imageFile
	deleted := false
	for {
		header, err := layer.Next()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return imageFile{}, fmt.Errorf("read tar: %w", err)
		}
		name := strings.TrimPrefix(path.Clean("/"+header.Name), "/")
		dir, base := path.Split(name)
		hidden, isWhiteout := strings.CutPrefix(base, whiteoutPrefix)
		switch {
		case name == target:
			file = imageFile{present: true, regular: header.Typeflag == tar.TypeReg}
			if file.data, err = io.ReadAll(layer); err != nil {
				return imageFile{}, fmt.Errorf("read /%s: %w", target, err)
			}
		case base == opaqueWhiteout:
			deleted = deleted || strings.HasPrefix(target, dir)
		case isWhiteout:
			deleted = deleted || target == dir+hidden || strings.HasPrefix(target, dir+hidden+"/")
		case header.Typeflag != tar.TypeDir && strings.HasPrefix(target, name+"/"):
			// Replacing an ancestor directory also removes its contents from lower layers.
			deleted = true
			file = imageFile{}
		}
	}
	if file.present || deleted {
		return file, nil
	}
	return below, nil
}

// fetch GETs url from the fixture's local registry. It does not check digests, as the registry is the fixture's own.
func fetch(ctx context.Context, url, accept string) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("create GET %s: %w", url, err)
	}
	if accept != "" {
		req.Header.Set("Accept", accept)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("GET %s: %w", url, err)
	}
	if resp.StatusCode != http.StatusOK {
		// The body says why, such as that the tag names an index, which the registry answers with 404.
		body, readErr := io.ReadAll(resp.Body)
		err = errors.Join(errRegistryResponse, readErr, resp.Body.Close())
		return nil, fmt.Errorf("%w: GET %s: %s: %s", err, url, resp.Status, bytes.TrimSpace(body))
	}
	return resp, nil
}
