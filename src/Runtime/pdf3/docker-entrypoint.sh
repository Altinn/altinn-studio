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
  mkdir -p "$nss_db"
  if [ -f "$nss_db/cert9.db" ] && ! certutil -d "sql:$nss_db" -L >/dev/null 2>&1; then
    rm -f "$nss_db/cert9.db" "$nss_db/key4.db" "$nss_db/pkcs11.txt"
  fi
  if [ ! -f "$nss_db/cert9.db" ]; then
    certutil -d "sql:$nss_db" -N --empty-password >/dev/null 2>&1 < /dev/null
  fi
  certutil -d "sql:$nss_db" -D -n studio-ca-bundle >/dev/null 2>&1 || true
  certutil -d "sql:$nss_db" -A -t "C,," -n studio-ca-bundle -i "$STUDIO_CA_BUNDLE"
}

install_ca_bundle

exec "$@"
