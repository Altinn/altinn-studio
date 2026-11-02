// Package oci pushes artifacts to the local runtime fixture's OCI registry.
package oci

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"
)

// Media types and annotations of the artifacts that `flux push artifact` and github.com/fluxcd/pkg/oci
// produce, which Flux's OCIRepository consumes.
const (
	FluxConfigMediaType  = "application/vnd.cncf.flux.config.v1+json"
	FluxContentMediaType = "application/vnd.cncf.flux.content.v1.tar+gzip"

	AnnotationCreated  = "org.opencontainers.image.created"
	AnnotationSource   = "org.opencontainers.image.source"
	AnnotationRevision = "org.opencontainers.image.revision"
)

// fluxConfig is the config blob. source-controller reads only the manifest and the first layer.
var fluxConfig = []byte("{}")

// PushArtifact pushes the directory or file at path to url (oci://host/repository[:tag]) as a Flux artifact.
//
// The created annotation uses second precision, as in Flux. An unchanged push in a later second gets a
// new manifest digest, so Flux reconciles it again.
func (c *Client) PushArtifact(url, path, source, revision string) error {
	layer, err := FluxTarball(path)
	if err != nil {
		return fmt.Errorf("archive %s: %w", path, err)
	}
	annotations := map[string]string{
		AnnotationCreated:  time.Now().UTC().Format(time.RFC3339),
		AnnotationSource:   source,
		AnnotationRevision: revision,
	}
	err = c.Push(
		context.Background(),
		url,
		Blob{MediaType: FluxConfigMediaType, Data: fluxConfig},
		Blob{MediaType: FluxContentMediaType, Data: layer},
		annotations,
	)
	if err != nil {
		return fmt.Errorf("push artifact to %s: %w", url, err)
	}
	return nil
}

// FluxTarball archives path the way github.com/fluxcd/pkg/oci builds a tarball layer: a gzipped tar of the
// directories and regular files under path, named relative to it with "." as the root, keeping permission
// bits and dropping owners and times. Symlinks and other irregular files are left out. A file path becomes a
// single entry named after the file.
func FluxTarball(path string) ([]byte, error) {
	root, err := filepath.Abs(path)
	if err != nil {
		return nil, fmt.Errorf("resolve %s: %w", path, err)
	}
	rootInfo, err := os.Stat(root)
	if err != nil {
		return nil, fmt.Errorf("stat %s: %w", path, err)
	}
	var buf bytes.Buffer
	gz := gzip.NewWriter(&buf)
	tw := tar.NewWriter(gz)
	err = filepath.Walk(root, func(file string, info os.FileInfo, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if !info.Mode().IsRegular() && !info.IsDir() {
			return nil
		}
		header, headerErr := tar.FileInfoHeader(info, "")
		if headerErr != nil {
			return fmt.Errorf("tar header for %s: %w", file, headerErr)
		}
		if rootInfo.IsDir() {
			rel, relErr := filepath.Rel(root, file)
			if relErr != nil {
				return fmt.Errorf("relative path of %s: %w", file, relErr)
			}
			header.Name = filepath.ToSlash(rel)
		}
		return writeEntry(tw, normalizeHeader(header), file)
	})
	if err != nil {
		return nil, fmt.Errorf("walk %s: %w", path, err)
	}
	if err := tw.Close(); err != nil {
		return nil, fmt.Errorf("close tar: %w", err)
	}
	if err := gz.Close(); err != nil {
		return nil, fmt.Errorf("close gzip: %w", err)
	}
	return buf.Bytes(), nil
}

// normalizeHeader removes the owner and times, so the same content always gives the same layer.
func normalizeHeader(header *tar.Header) *tar.Header {
	header.Uid = 0
	header.Gid = 0
	header.Uname = ""
	header.Gname = ""
	header.ModTime = time.Time{}
	header.AccessTime = time.Time{}
	header.ChangeTime = time.Time{}
	return header
}

func writeEntry(tw *tar.Writer, header *tar.Header, file string) error {
	if err := tw.WriteHeader(header); err != nil {
		return fmt.Errorf("write tar header for %s: %w", file, err)
	}
	if header.Typeflag != tar.TypeReg {
		return nil
	}
	//nolint:gosec // G304: file comes from walking the artifact directory the fixture configured.
	f, err := os.Open(file)
	if err != nil {
		return fmt.Errorf("open %s: %w", file, err)
	}
	defer closeQuietly(f)
	if _, err := io.Copy(tw, f); err != nil {
		return fmt.Errorf("archive %s: %w", file, err)
	}
	return nil
}
