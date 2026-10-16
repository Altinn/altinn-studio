package simple

import (
	"archive/tar"
	"context"
	"crypto/x509"
	"errors"
	"io"
	"testing"
	"time"

	"github.com/google/go-containerregistry/pkg/name"
	"github.com/google/go-containerregistry/pkg/v1/mutate"
	"github.com/google/go-containerregistry/pkg/v1/remote"
)

// caBundlePath is where Go looks for the system's CA certificates first on Linux, in the image's
// file system.
const caBundlePath = "etc/ssl/certs/ca-certificates.crt"

// Test_ProxyImage_HasCACertificates checks that the proxy image the cluster runs, which the relay
// ships in, has the CA certificates the relay verifies DIS Edge's certificate against. The image is
// built from scratch, so it has none unless its Dockerfile copies them in, and then every request
// the relay sends fails with "certificate signed by unknown authority".
//
// The image is read from the cluster's registry rather than run: a container runtime can add CA
// certificates to a container it starts, as a sandbox with TLS interception does, which would
// hide their absence.
func Test_ProxyImage_HasCACertificates(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()

	ref, err := name.ParseReference("localhost:5001/runtime-pdf3-proxy:latest")
	if err != nil {
		t.Fatalf("ParseReference() error = %v", err)
	}
	img, err := remote.Image(ref, remote.WithContext(ctx))
	if err != nil {
		t.Fatalf("Failed to read the proxy image from the registry: %v", err)
	}

	files := mutate.Extract(img)
	defer func() {
		if closeErr := files.Close(); closeErr != nil {
			t.Errorf("Close() error = %v", closeErr)
		}
	}()
	bundle := readImageFile(t, tar.NewReader(files), caBundlePath)

	if !x509.NewCertPool().AppendCertsFromPEM(bundle) {
		t.Fatalf("/%s in the proxy image holds no certificates", caBundlePath)
	}
}

// readImageFile returns the regular file at path in the image file system files.
func readImageFile(t *testing.T, files *tar.Reader, path string) []byte {
	t.Helper()
	for {
		header, err := files.Next()
		if errors.Is(err, io.EOF) {
			t.Fatalf("The proxy image has no /%s", path)
		}
		if err != nil {
			t.Fatalf("Failed to read the proxy image's files: %v", err)
		}
		if header.Name != path {
			continue
		}
		if header.Typeflag != tar.TypeReg {
			t.Fatalf("/%s in the proxy image is not a regular file", path)
		}
		data, err := io.ReadAll(files)
		if err != nil {
			t.Fatalf("Failed to read /%s from the proxy image: %v", path, err)
		}
		return data
	}
}
