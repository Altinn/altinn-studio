ARG GITEA_VERSION=1.26.1

# Extract the upstream locale files from the gitea binary, then merge them with the custom locale files
FROM gitea/gitea:${GITEA_VERSION}-rootless AS locale_builder
USER 0:0
RUN apk --no-cache add jq
USER 1000:1000
WORKDIR /build
COPY --chown=1000:1000 ./files/locale /build/
RUN gitea embedded extract --destination /var/lib/gitea/ options/locale/**.* && \
    mkdir -p ./locale && \
    cp /var/lib/gitea/options/locale/locale_en-US.json ./base/locale_en-US.json && \
    jq -s '.[0] * .[1]' ./base/locale_en-US.json ./custom/locale_en-US.json > ./locale/locale_en-US.json && \
    jq -s '.[0] * .[1]' ./base/locale_nb-NO.json ./custom/locale_nb-NO.json > ./locale/locale_nb-NO.json

# Ensure to update the locales, templates, and configuration when upgrading Gitea
FROM gitea/gitea:${GITEA_VERSION}-rootless
USER 0:0
RUN apk --no-cache upgrade expat git libxml2 libcurl curl
USER 1000:1000
RUN mkdir -p /var/lib/gitea/git -p /var/lib/gitea/db -p /var/lib/gitea/avatars -p /var/lib/gitea/attachments

# Copy configuration file
COPY --chown=git:git ./files/conf/app.ini /etc/gitea/app.ini
COPY --chown=git:git ./files/custom /var/lib/gitea/custom
COPY --chown=git:git --from=locale_builder /build/locale/*.json /var/lib/gitea/custom/options/locale/
