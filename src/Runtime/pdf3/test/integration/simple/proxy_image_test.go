package simple

import (
	"context"
	"crypto/x509"
	"testing"
	"time"

	"altinn.studio/pdf3/test/harness"
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

	bundle, err := harness.ReadImageFile(ctx, "localhost:5001/runtime-pdf3-proxy:latest", caBundlePath)
	if err != nil {
		t.Fatalf("Failed to read the proxy image's CA certificates: %v", err)
	}

	if !x509.NewCertPool().AppendCertsFromPEM(bundle) {
		t.Fatalf("/%s in the proxy image holds no certificates", caBundlePath)
	}
}
