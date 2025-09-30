#!/usr/bin/env sh

set -e

include_monitoring=false
while getopts "m" flag; do
    case "${flag}" in
        m) include_monitoring=true ;;
        \?) exit 1 ;;
    esac
done
shift $((${OPTIND} - 1))

profile=""
if [ "$include_monitoring" = true ]; then
    profile="--profile \"monitoring\""
fi

if [ "$1" = "stop" ]; then
    echo "Stopping localtest!"
    if [ -x "$(command -v docker)" ]; then
        echo "Stopping using docker"
        docker compose --profile "*" down -v
    elif [ -x "$(command -v docker-compose)" ]; then
        # If the user is not using docker, there should be podman installed
        # If additionally docker-compose is installed, we use that since it has had '--profile' support for a long time,
        # whereas podman-compose has only recently added support, and not many users have the latest versions
        echo "Stopping using docker-compose"
        docker-compose --file podman-compose.yml --profile "*" down -v
    elif [ -x "$(command -v podman)" ]; then
        echo "Stopping using podman"
        podman compose --file podman-compose.yml --profile "*" down -v
    else
        echo "Preqreqs missing - please install docker or podman"
        exit 1
    fi
elif [ "$1" = "k6" ]; then
    echo "Running k6 loadtest!"
    cmd="podman"
    if [ -x "$(command -v docker)" ]; then
        cmd="docker"
    fi
    eval "$cmd pull grafana/k6:master-with-browser"
    eval "$cmd run --rm -i --net=host grafana/k6:master-with-browser run - <k6/loadtest.js"
else
    echo "Running localtest!"
    if [ -x "$(command -v docker)" ]; then
        echo "Running using docker"
        docker compose --profile "*" down -v
        eval "docker compose $profile up -d --build"
    elif [ -x "$(command -v docker-compose)" ]; then
        # If the user is not using docker, there should be podman installed
        # If additionally docker-compose is installed, we use that since it has had '--profile' support for a long time,
        # whereas podman-compose has only recently added support, and not many users have the latest versions
        echo "Running using docker-compose"
        docker-compose --file podman-compose.yml --profile "*" down -v
        eval "docker-compose --file podman-compose.yml $profile up -d --build"
    elif [ -x "$(command -v podman)" ]; then
        echo "Running using podman"
        podman compose --file podman-compose.yml --profile "*" down -v
        eval "podman compose --file podman-compose.yml $profile up -d --build"
    else
        echo "Preqreqs missing - please install docker or podman"
        exit 1
    fi
fi
