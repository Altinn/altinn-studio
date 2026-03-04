FROM nginx:1.29.5-alpine

RUN apk add --no-cache nginx-module-njs

COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY auth.js /etc/nginx/auth.js
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
