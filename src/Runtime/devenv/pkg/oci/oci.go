// Package oci pushes artifacts to the local runtime fixture's OCI registry.
package oci

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"context"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"time"
)

// PushArtifact pushes the directory dir to url (oci://host/repository[:tag]) as a Flux artifact, in the
// format that `flux push artifact` and github.com/fluxcd/pkg/oci produce and Flux's OCIRepository consumes.
//
// The created annotation uses second precision, as in Flux. An unchanged push in a later second gets a
// new manifest digest, so Flux reconciles it again.
func (c *Client) PushArtifact(url, dir, source, revision string) error {
	// Like fluxcd/pkg/oci, keep directories and regular files with their permission bits, named relative to
	// dir with "." as the root, and leave out symlinks and other irregular files.
	layer, err := TarGz(dir, func(rel string, info fs.FileInfo) (*tar.Header, error) {
		header := &tar.Header{Name: rel, Typeflag: tar.TypeDir, Mode: int64(info.Mode().Perm())}
		switch {
		case info.Mode().IsRegular():
			header.Typeflag, header.Size = tar.TypeReg, info.Size()
		case !info.IsDir():
			return nil, nil //nolint:nilnil // nil leaves the entry out.
		}
		return header, nil
	})
	if err != nil {
		return err
	}
	err = c.Push(
		context.Background(),
		url,
		// source-controller reads only the manifest and the first layer.
		Blob{MediaType: "application/vnd.cncf.flux.config.v1+json", Data: []byte("{}")},
		Blob{MediaType: "application/vnd.cncf.flux.content.v1.tar+gzip", Data: layer},
		map[string]string{
			"org.opencontainers.image.created":  time.Now().UTC().Format(time.RFC3339),
			"org.opencontainers.image.source":   source,
			"org.opencontainers.image.revision": revision,
		},
	)
	if err != nil {
		return fmt.Errorf("push artifact to %s: %w", url, err)
	}
	return nil
}

// TarGz walks the directory root in lexical order and returns a gzipped tar of the entries header gives for
// each path relative to root, "." being root itself. header returns nil to leave a path out, or fs.SkipDir to
// leave out a directory. Regular entries get the file's content.
func TarGz(root string, header func(rel string, info fs.FileInfo) (*tar.Header, error)) ([]byte, error) {
	files := os.DirFS(root)
	var buf bytes.Buffer
	gz := gzip.NewWriter(&buf)
	tw := tar.NewWriter(gz)
	err := fs.WalkDir(files, ".", func(rel string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		info, err := entry.Info()
		if err != nil {
			return fmt.Errorf("stat %s: %w", rel, err)
		}
		h, err := header(rel, info)
		if h == nil || err != nil {
			return err
		}
		if err = tw.WriteHeader(h); err != nil {
			return fmt.Errorf("write tar header for %s: %w", rel, err)
		}
		if h.Typeflag != tar.TypeReg {
			return nil
		}
		data, err := fs.ReadFile(files, rel)
		if err == nil {
			_, err = tw.Write(data)
		}
		if err != nil {
			return fmt.Errorf("archive %s: %w", rel, err)
		}
		return nil
	})
	if err = errors.Join(err, tw.Close(), gz.Close()); err != nil {
		return nil, fmt.Errorf("archive %s: %w", root, err)
	}
	return buf.Bytes(), nil
}
