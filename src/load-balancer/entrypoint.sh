#!/bin/sh
VARS='${DESIGNER_HOST} ${DASHBOARD_HOST} ${EDITOR_HOST} ${PREVIEW_HOST} ${ADMIN_HOST} ${INFO_HOST} ${RESOURCEADM_HOST} ${ORG_SETTINGS_HOST} ${REPOS_HOST} ${SERVER_NAME} ${LISTEN_DIRECTIVE} ${OTEL_ENDPOINT} ${OTEL_SERVICE_NAME} ${OTEL_TRACE}'

for tpl in /etc/nginx/*.template /etc/nginx/extra-*/*.conf.template; do
  [ -f "$tpl" ] && envsubst "$VARS" < "$tpl" > "${tpl%.template}"
done

exec nginx -g 'daemon off;'
