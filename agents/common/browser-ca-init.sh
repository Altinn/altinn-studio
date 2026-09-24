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

work=$(mktemp -d "${TMPDIR:-/tmp}/agent-browser-ca.XXXXXX")
trap 'find "$work" -depth -delete' EXIT HUP INT TERM

# Every certutil call commits the SQLite database with its own flushes, which add up to about 15
# seconds for the system bundle on the guest disk. The database is edited in the temporary directory,
# a tmpfs in the guest, and copied back once.
staged=$work/nssdb
mkdir "$staged"
if [ -f "$nssdb/cert9.db" ]; then
    cp -p "$nssdb"/* "$staged"/
else
    certutil -N --empty-password -d "sql:$staged"
fi

if [ -f "$state_file" ]; then
    sed -n '2,$p' "$state_file" | while IFS= read -r nickname; do
        [ -n "$nickname" ] || continue
        certutil -D -d "sql:$staged" -n "$nickname" 2>/dev/null || true
    done
fi

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
    certutil -D -d "sql:$staged" -n "$nickname" 2>/dev/null || true
    certutil -A -d "sql:$staged" -n "$nickname" -t 'C,,' -i "$certificate"
    printf '%s\n' "$nickname" >>"$next_state"
done

# Each database file is replaced atomically, and the state file is written last, so an interrupted
# update is redone on the next boot.
for file in "$staged"/*; do
    name=${file##*/}
    cp -p "$file" "$nssdb/.$name.new"
    mv "$nssdb/.$name.new" "$nssdb/$name"
done
mv "$next_state" "$state_file"
