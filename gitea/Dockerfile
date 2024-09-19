FROM node:lts-alpine AS LOCALE_BUILDER
COPY ./files/locale /build
WORKDIR /build
RUN npm install
RUN mkdir -p ./locale
RUN node ./merge.js ./base/locale_en-US.ini ./custom/locale_en-US.ini ./locale/locale_en-US.ini
RUN node ./merge.js ./base/locale_nb-NO.ini ./custom/locale_nb-NO.ini ./locale/locale_nb-NO.ini

FROM gitea/gitea:1.22.2-rootless
USER 0:0
RUN apk --no-cache upgrade expat git libxml2 libcurl curl
USER 1000:1000
RUN mkdir -p /var/lib/gitea/git -p /var/lib/gitea/db -p /var/lib/gitea/avatars -p /var/lib/gitea/attachments

# copy configuration file
COPY --chown=git:git ./files/conf/app.ini /etc/gitea/app.ini
COPY --chown=git:git ./files/custom /var/lib/gitea/custom
COPY --chown=git:git --from=LOCALE_BUILDER /build/locale/*.ini /var/lib/gitea/custom/options/locale/
