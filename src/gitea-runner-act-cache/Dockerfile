# The seed image is used as an init container, so it needs a shell and `cp`
# to copy /prewarmed-act-cache into the pod's private emptyDir.
FROM busybox:1.37.0@sha256:9532d8c39891ca2ecde4d30d7710e01fb739c87a8b9299685c63704296b16028

ARG ACT_CACHE_DIGEST
LABEL no.altinn.act-cache.digest="${ACT_CACHE_DIGEST}"

COPY act-cache/ /prewarmed-act-cache/
