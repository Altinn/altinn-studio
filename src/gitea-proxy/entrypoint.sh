#!/bin/sh
envsubst '${DESIGNER_HOST} ${GITEA_HOST} ${STUDIO_OIDC_ENABLED}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
exec nginx -g 'daemon off;'
