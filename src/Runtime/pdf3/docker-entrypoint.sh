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
  imported=0
  skipped=0
  for cert in "$certs"/*.pem; do
    # A bundle without a certificate leaves the pattern unexpanded; start without one rather than fail.
    [ -e "$cert" ] || continue
    # A certificate certutil cannot import is skipped, so one bad block does not keep the worker from starting.
    if certutil -d "sql:$nss_db" -A -t "C,," -n "studio-ca-bundle-${cert##*/}" -i "$cert"; then
      imported=$((imported + 1))
    else
      skipped=$((skipped + 1))
      number=${cert##*/}
      echo "pdf3 worker: skipped certificate ${number%.pem} of STUDIO_CA_BUNDLE ($STUDIO_CA_BUNDLE), which certutil cannot import" >&2
    fi
  done
  rm -rf "$certs"
  if [ "$imported" -eq 0 ] && [ "$skipped" -eq 0 ]; then
    echo "pdf3 worker: STUDIO_CA_BUNDLE ($STUDIO_CA_BUNDLE) holds no certificate; none installed" >&2
  elif [ "$skipped" -gt 0 ]; then
    echo "pdf3 worker: installed $imported of $((imported + skipped)) certificates from STUDIO_CA_BUNDLE" >&2
  fi
}

install_ca_bundle

exec "$@"
