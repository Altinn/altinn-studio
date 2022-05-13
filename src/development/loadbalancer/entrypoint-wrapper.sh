#!/bin/sh

set -e

HOST_TARGET_APP=host.docker.internal
HOST_TARGET_LOCALTEST=host.docker.internal
HOST_TARGET_RECEIPT=host.docker.internal

if nslookup host.docker.internal | grep -q answer; then
  echo " -- You seem to be running on Windows or MacOS"
else
  # On Windows and MacOS with Docker Desktop, we have the magic 'host.docker.internal' that points to the docker host
  # IP, so that we can mix dockerized and locally running services. On a Linux host we don't have that magic, so we'll
  # need to find our local router to know where to point requests going to the host OS.
  DOCKER_ROUTE=$(ip route | grep 'default via' | awk '{print $3}')

  echo " -- You seem to be running on Linux, routing via $DOCKER_ROUTE"

  HOST_TARGET_APP=$DOCKER_ROUTE
  HOST_TARGET_LOCALTEST=$DOCKER_ROUTE
  HOST_TARGET_RECEIPT=$DOCKER_ROUTE
fi

if nslookup localtest.development_altinntestlocal_network | grep -q answer; then
  HOST_TARGET_LOCALTEST=localtest.development_altinntestlocal_network

  echo " -- You seem to be running with '--profile localtest', routing requests to container"
fi

# Export these so nginx envsubst can use them in our config file
export HOST_TARGET_APP
export HOST_TARGET_LOCALTEST
export HOST_TARGET_RECEIPT

exec /docker-entrypoint-original.sh "$@"
