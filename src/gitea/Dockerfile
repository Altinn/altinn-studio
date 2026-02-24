ARG GITEA_VERSION=1.25.1

# Grab the locale files from the gitea binary in the image
FROM gitea/gitea:${GITEA_VERSION}-rootless AS locale_source
RUN gitea embedded extract --destination /var/lib/gitea/ options/locale/**.*

# Merge the custom locale files with the base locale files
FROM node:lts-alpine@sha256:4f696fbf39f383c1e486030ba6b289a5d9af541642fc78ab197e584a113b9c03 AS locale_builder
COPY ./files/locale /build
WORKDIR /build
RUN npm install
RUN mkdir -p ./locale
# Copy the en-US locale file from the gitea binary
COPY --from=locale_source /var/lib/gitea/options/locale/locale_en-US.ini ./base/locale_en-US.ini
# Merge the custom locale files with the base locale files
RUN node ./merge.js ./base/locale_en-US.ini ./custom/locale_en-US.ini ./locale/locale_en-US.ini
RUN node ./merge.js ./base/locale_nb-NO.ini ./custom/locale_nb-NO.ini ./locale/locale_nb-NO.ini

# Ensure to update the locales, templates, and configuration when upgrading Gitea
FROM gitea/gitea:${GITEA_VERSION}-rootless
USER 0:0
RUN apk --no-cache upgrade expat git libxml2 libcurl curl
USER 1000:1000
RUN mkdir -p /var/lib/gitea/git -p /var/lib/gitea/db -p /var/lib/gitea/avatars -p /var/lib/gitea/attachments

# Copy configuration file
COPY --chown=git:git ./files/conf/app.ini /etc/gitea/app.ini
COPY --chown=git:git ./files/custom /var/lib/gitea/custom
COPY --chown=git:git --from=locale_builder /build/locale/*.ini /var/lib/gitea/custom/options/locale/
