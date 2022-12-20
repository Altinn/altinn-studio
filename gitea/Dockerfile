FROM gitea/gitea:1.17.3-rootless
USER 0:0
RUN apk --no-cache upgrade expat git libxml2 libcurl curl
USER 1000:1000
RUN mkdir -p /var/lib/gitea/git -p /var/lib/gitea/db -p /var/lib/gitea/avatars -p /var/lib/gitea/attachments

# copy configuration file
COPY --chown=git:git ./gitea-data/gitea/conf/app.ini /etc/gitea/app.ini
COPY --chown=git:git ./gitea-data/gitea/options /var/lib/gitea/custom/options/
COPY --chown=git:git ./gitea-data/gitea/public/img /var/lib/gitea/custom/public/img
COPY --chown=git:git ./gitea-data/gitea/templates /var/lib/gitea/custom/templates
