package cabundle

import (
	"fmt"
	"path/filepath"
)

// RegistrationScript returns shell that registers ContainerPath with common Linux trust stores.
func RegistrationScript() string {
	return fmt.Sprintf(`set -eu
ca_path=%q
if command -v update-ca-certificates >/dev/null 2>&1; then
  mkdir -p %q
  cp "$ca_path" %q
  update-ca-certificates
elif command -v update-ca-trust >/dev/null 2>&1; then
  mkdir -p %q
  cp "$ca_path" %q
  update-ca-trust extract
elif [ -w /etc/ssl/certs/ca-certificates.crt ]; then
  cat "$ca_path" >> /etc/ssl/certs/ca-certificates.crt
elif [ -w /etc/ssl/cert.pem ]; then
  cat "$ca_path" >> /etc/ssl/cert.pem
else
  echo 'devenv CA bundle: no writable CA trust store found' >&2
  exit 1
fi
`, ContainerPath, filepath.Dir(trustStorePath), trustStorePath, filepath.Dir(redHatTrustPath), redHatTrustPath)
}
