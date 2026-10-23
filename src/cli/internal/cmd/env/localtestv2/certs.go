package localtestv2

import (
	"bytes"
	_ "embed"
	"fmt"
	"os"
	"path/filepath"

	"altinn.studio/studioctl/internal/localtestv2"
	"altinn.studio/studioctl/internal/osutil"
)

// The shared test certificate: every app and component signs platform access tokens with it, and the
// components validate the tokens against it, so the production token handlers run unchanged. It is a
// test key pair, public in the localtest-research repository (localtest/certs/README.md).
//
//go:embed assets/localtest-accesstoken.pfx
var accessTokenCertificate []byte

// ensureCertificate writes the shared test certificate into dir, where the containers and the apps read it, unless
// it is there already.
func ensureCertificate(dir string) error {
	if err := os.MkdirAll(dir, osutil.DirPermDefault); err != nil {
		return fmt.Errorf("create certificate directory: %w", err)
	}
	path := filepath.Join(dir, localtestv2.CertificateFileName)
	existing, err := os.ReadFile(path) //nolint:gosec // the path is under studioctl's own data directory
	if err == nil && bytes.Equal(existing, accessTokenCertificate) {
		return nil
	}
	// World-readable on purpose: the containers run as their image users, not as the developer.
	if err := os.WriteFile(path, accessTokenCertificate, osutil.FilePermDefault); err != nil {
		return fmt.Errorf("write certificate: %w", err)
	}
	return nil
}
