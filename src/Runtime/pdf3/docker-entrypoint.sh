#!/bin/sh
set -eu

install_ca_bundle() {
  if [ -z "${STUDIO_CA_BUNDLE:-}" ] || [ ! -f "$STUDIO_CA_BUNDLE" ]; then
    return
  fi

  if ! command -v certutil >/dev/null 2>&1; then
    echo "pdf3 worker: certutil is required to install STUDIO_CA_BUNDLE" >&2
    return 1
  fi

  # The database only holds this bundle, so it is rebuilt on every start.
  nss_db="$HOME/.local/share/pki/nssdb"
  rm -rf "$nss_db"
  mkdir -p "$nss_db"
  certutil -d "sql:$nss_db" -N --empty-password

  # certutil -A imports only the first certificate of a PEM file, so each certificate is imported on its own.
  work=$(mktemp -d)
  awk -v directory="$work" '
    /-----BEGIN CERTIFICATE-----/ {
      count++
      output = sprintf("%s/certificate-%04d.pem", directory, count)
    }
    output != "" { print > output }
    /-----END CERTIFICATE-----/ {
      close(output)
      output = ""
    }
    END {
      if (output != "" || count == 0) exit 1
    }
  ' "$STUDIO_CA_BUNDLE" || {
    echo "pdf3 worker: STUDIO_CA_BUNDLE must contain complete PEM certificates" >&2
    rm -rf "$work"
    return 1
  }

  for certificate in "$work"/certificate-*.pem; do
    name=${certificate##*/}
    certutil -d "sql:$nss_db" -A -t "C,," -n "studio-ca-bundle-${name%.pem}" -i "$certificate"
  done
  rm -rf "$work"
}

install_ca_bundle

exec "$@"
