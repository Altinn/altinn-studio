FROM nginx:1.29.5-alpine

COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && mkdir -p /etc/nginx/error-pages

# error-pages/ and www/ are not included in the image.
# They are mounted as volumes only for local development (see compose.yaml).

ENTRYPOINT ["/entrypoint.sh"]
