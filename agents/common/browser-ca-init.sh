#!/bin/sh
set -eu

bundle=${AGENT_BROWSER_CA_BUNDLE:-/etc/ssl/certs/ca-certificates.crt}
nssdb=${AGENT_BROWSER_NSSDB_DIR:-${HOME:?HOME is required}/.pki/nssdb}
state_dir=${AGENT_BROWSER_CA_STATE_DIR:-${HOME}/.config/altinn-agent}
state_file=$state_dir/chromium-ca-state

if [ ! -r "$bundle" ]; then
    echo "Chromium CA bundle is not readable: $bundle" >&2
    exit 1
fi

bundle_digest=$(sha256sum "$bundle" | awk '{ print $1 }')
if [ -f "$nssdb/cert9.db" ] \
    && [ -f "$state_file" ] \
    && [ "$(sed -n '1p' "$state_file")" = "$bundle_digest" ]; then
    exit 0
fi

umask 077
mkdir -p "$nssdb" "$state_dir"
if [ ! -f "$nssdb/cert9.db" ]; then
    certutil -N --empty-password -d "sql:$nssdb"
fi

if [ -f "$state_file" ]; then
    sed -n '2,$p' "$state_file" | while IFS= read -r nickname; do
        [ -n "$nickname" ] || continue
        certutil -D -d "sql:$nssdb" -n "$nickname" 2>/dev/null || true
    done
fi

work=$(mktemp -d "${TMPDIR:-/tmp}/agent-browser-ca.XXXXXX")
trap 'find "$work" -depth -delete' EXIT HUP INT TERM

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
' "$bundle"

next_state=$work/chromium-ca-state
printf '%s\n' "$bundle_digest" >"$next_state"
for certificate in "$work"/certificate-*.pem; do
    openssl x509 -in "$certificate" -noout >/dev/null
    fingerprint=$(openssl x509 -in "$certificate" -outform DER | sha256sum | awk '{ print $1 }')
    nickname=altinn-agent-system-ca-$fingerprint
    certutil -D -d "sql:$nssdb" -n "$nickname" 2>/dev/null || true
    certutil -A -d "sql:$nssdb" -n "$nickname" -t 'C,,' -i "$certificate"
    printf '%s\n' "$nickname" >>"$next_state"
done

mv "$next_state" "$state_file"
