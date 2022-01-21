FROM gitea/gitea:1.15.10-rootless

RUN mkdir -p /var/lib/gitea/git && mkdir -p /var/lib/gitea/db && mkdir -p /var/lib/gitea/avatars && mkdir -p /var/lib/gitea/attachments

# copy configuration file
COPY --chown=git:git ./gitea-data/gitea/conf/app.ini /etc/gitea/app.ini
COPY --chown=git:git ./gitea-data/gitea/options /var/lib/gitea/custom/options/
COPY --chown=git:git ./gitea-data/gitea/public/img /var/lib/gitea/custom/public/img
COPY --chown=git:git ./gitea-data/gitea/templates /var/lib/gitea/custom/templates
