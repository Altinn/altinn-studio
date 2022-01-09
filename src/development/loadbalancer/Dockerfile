FROM nginx:1.21.5-alpine

# Copy to template in order for Environment variable substitutions to run
COPY nginx.conf /etc/nginx/templates/nginx.conf.template

COPY *.html /www/
