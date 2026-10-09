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

  nss_db="$HOME/.local/share/pki/nssdb"
  rm -rf "$nss_db"
  mkdir -p "$nss_db"
  certutil -d "sql:$nss_db" -N --empty-password

  # certutil -A imports only the first certificate in a file, so the bundle is split first.
  certs=$(mktemp -d)
  awk -v dir="$certs" '/-----BEGIN CERTIFICATE-----/ { close(f); f = dir "/" ++n ".pem" } f { print > f }' \
    "$STUDIO_CA_BUNDLE"
  for cert in "$certs"/*.pem; do
    certutil -d "sql:$nss_db" -A -t "C,," -n "studio-ca-bundle-${cert##*/}" -i "$cert"
  done
  rm -rf "$certs"
}

install_ca_bundle

exec "$@"
