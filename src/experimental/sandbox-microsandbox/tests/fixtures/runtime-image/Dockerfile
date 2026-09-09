# syntax=docker/dockerfile:1
FROM alpine:3.22

RUN apk add --no-cache iptables nftables

RUN --mount=type=cache,target=/var/cache true

CMD ["/bin/echo", "default-entrypoint"]
