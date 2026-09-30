#!/bin/sh
VARS='${DESIGNER_HOST} ${DASHBOARD_HOST} ${EDITOR_HOST} ${PREVIEW_HOST} ${ADMIN_HOST} ${INFO_HOST} ${RESOURCEADM_HOST} ${SETTINGS_HOST} ${REPOS_HOST} ${SERVER_NAME} ${LISTEN_DIRECTIVE} ${OTEL_ENDPOINT} ${OTEL_SERVICE_NAME} ${OTEL_TRACE}'

certificate_checksum() {
  cert_checksum="$(cksum "$SSL_CERTIFICATE_PATH")" || return 1
  key_checksum="$(cksum "$SSL_CERTIFICATE_KEY_PATH")" || return 1

  printf '%s\n%s\n' "$cert_checksum" "$key_checksum"
}

reload_nginx_on_certificate_change() {
  previous_checksum="$(certificate_checksum)" || {
    echo "Certificate reload watcher could not read the certificate files" >&2
    return 1
  }

  while sleep "$SSL_CERT_RELOAD_INTERVAL_SECONDS"; do
    current_checksum="$(certificate_checksum)" || {
      echo "Certificate reload watcher could not read the certificate files" >&2
      continue
    }

    [ "$current_checksum" = "$previous_checksum" ] && continue

    if nginx -t && nginx -s reload; then
      previous_checksum="$current_checksum"
      echo "Reloaded nginx after the TLS certificate changed"
    else
      echo "Nginx rejected the updated TLS certificate; keeping the current configuration" >&2
    fi
  done
}

for tpl in /etc/nginx/*.template /etc/nginx/extra-*/*.conf.template; do
  [ -f "$tpl" ] && envsubst "$VARS" < "$tpl" > "${tpl%.template}"
done

if [ "${SSL_CERT_RELOAD_ENABLED:-false}" = "true" ]; then
  SSL_CERTIFICATE_PATH="${SSL_CERTIFICATE_PATH:-/etc/nginx/ssl/altinn_studio/star.altinn.studio.cert}"
  SSL_CERTIFICATE_KEY_PATH="${SSL_CERTIFICATE_KEY_PATH:-/etc/nginx/ssl/altinn_studio/star.altinn.studio.key}"
  SSL_CERT_RELOAD_INTERVAL_SECONDS="${SSL_CERT_RELOAD_INTERVAL_SECONDS:-60}"

  export SSL_CERTIFICATE_PATH SSL_CERTIFICATE_KEY_PATH SSL_CERT_RELOAD_INTERVAL_SECONDS
  reload_nginx_on_certificate_change &
fi

exec nginx -g 'daemon off;'
