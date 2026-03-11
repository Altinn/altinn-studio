FROM nginx:1.29.5-alpine

COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && mkdir -p /etc/nginx/error-pages

# K8s-specific configuration (extra upstreams, locations, and server blocks).
# For local development, override these with empty folders via volume mounts (see compose.yaml).
COPY k8s/extra-upstreams.conf /etc/nginx/extra-upstreams/
COPY k8s/extra-locations.conf /etc/nginx/extra-locations/
COPY k8s/extra-servers.conf /etc/nginx/extra-servers/

ENTRYPOINT ["/entrypoint.sh"]
