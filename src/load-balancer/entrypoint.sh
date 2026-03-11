#!/bin/sh
envsubst '${DESIGNER_HOST} ${DASHBOARD_HOST} ${EDITOR_HOST} ${PREVIEW_HOST} ${ADMIN_HOST} ${INFO_HOST} ${RESOURCEADM_HOST} ${REPOS_HOST} ${SERVER_NAME} ${LISTEN_DIRECTIVE} ${OTEL_ENDPOINT} ${OTEL_SERVICE_NAME} ${OTEL_TRACE}' \
  < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

exec nginx -g 'daemon off;'
