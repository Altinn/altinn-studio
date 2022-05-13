FROM nginx:1.21.6-alpine

# Adds our script do detect the host OS and inject relevant environment variables (before env substitution runs)
# See: https://github.com/nginxinc/docker-nginx/tree/master/entrypoint
RUN mv /docker-entrypoint.sh /docker-entrypoint-original.sh
COPY entrypoint-wrapper.sh /docker-entrypoint.sh

# Copy to template in order for Environment variable substitutions to run
COPY nginx.conf /etc/nginx/templates/nginx.conf.template

COPY *.html /www/
