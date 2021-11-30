FROM gitea/gitea:1.15.6-rootless

# copy configuration file
COPY --chown=git:git ./gitea-data/gitea/conf/app.ini /etc/gitea/app.ini
COPY --chown=git:git ./gitea-data/gitea/options /var/lib/gitea/custom/options/
COPY --chown=git:git ./gitea-data/gitea/public/img /var/lib/gitea/custom/public/img
COPY --chown=git:git ./gitea-data/gitea/templates /var/lib/gitea/custom/templates