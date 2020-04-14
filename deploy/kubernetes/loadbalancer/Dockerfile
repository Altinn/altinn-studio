FROM nginx:1.17.9-alpine

RUN rm /etc/nginx/conf.d/default.conf

COPY conf /etc/nginx
COPY certs /path/to/where/ssl/should/be/stored