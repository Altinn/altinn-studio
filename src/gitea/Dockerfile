ARG GITEA_VERSION=1.26.1

# Grab the locale files from the gitea binary in the image
FROM gitea/gitea:${GITEA_VERSION}-rootless AS locale_source
RUN gitea embedded extract --destination /var/lib/gitea/ options/locale/**.*

# Merge the custom locale files with the base locale files
FROM node:lts-alpine@sha256:01743339035a5c3c11a373cd7c83aeab6ed1457b55da6a69e014a95ac4e4700b AS locale_builder
COPY ./files/locale /build
WORKDIR /build
RUN mkdir -p ./locale
# Copy the en-US locale file from the gitea binary
COPY --from=locale_source /var/lib/gitea/options/locale/locale_en-US.json ./base/locale_en-US.json
# Merge the custom locale files with the base locale files
RUN node ./merge.js ./base/locale_en-US.json ./custom/locale_en-US.json ./locale/locale_en-US.json
RUN node ./merge.js ./base/locale_nb-NO.json ./custom/locale_nb-NO.json ./locale/locale_nb-NO.json

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
