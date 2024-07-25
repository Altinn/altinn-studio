FROM nginx:alpine
ARG DOMAIN
ARG DESIGNER_PORT
COPY ./nginx.conf.template /etc/nginx/nginx.conf
RUN sed -i "s/\[\[DOMAIN\]\]/$DOMAIN/g" /etc/nginx/nginx.conf
RUN sed -i "s/\[\[DESIGNER_PORT\]\]/$DESIGNER_PORT/g" /etc/nginx/nginx.conf
