FROM nginx:1.29.5-alpine

COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && mkdir -p /etc/nginx/error-pages /etc/nginx/ssl /etc/nginx/logging

# K8s-specific configuration.
# For local development, clear these in compose.yaml entrypoint override (see compose.yaml).
COPY k8s/extra-upstreams.conf /etc/nginx/extra-upstreams/
COPY k8s/extra-locations.conf /etc/nginx/extra-locations/
COPY k8s/extra-servers.conf /etc/nginx/extra-servers/
COPY k8s/ssl/ /etc/nginx/ssl/
COPY k8s/logging/ /etc/nginx/logging/

ENTRYPOINT ["/entrypoint.sh"]
