#!/bin/sh

set -e

HOST_TARGET_APP=host.docker.internal

if nslookup host.docker.internal | grep -q answer; then
  echo " -- You seem to be running on Windows or MacOS"
else
  # On Windows and MacOS with Docker Desktop, we have the magic 'host.docker.internal' that points to the docker host
  # IP, so that we can mix dockerized and locally running services. On a Linux host we don't have that magic, so we'll
  # need to find our local router to know where to point requests going to the host OS.
  DOCKER_ROUTE=$(ip route | grep 'default via' | awk '{print $3}')

  echo " -- You seem to be running on Linux, routing via $DOCKER_ROUTE"

  HOST_TARGET_APP=$DOCKER_ROUTE
fi

export HOST_TARGET_APP
envsubst < appsettings.Docker.json > appsettings.Docker.json.tmp
mv appsettings.Docker.json.tmp appsettings.Docker.json
