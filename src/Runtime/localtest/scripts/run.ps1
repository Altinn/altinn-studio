#!/usr/bin/env pwsh

param(
    [Parameter(HelpMessage="")]
    [switch]$m = $False,
)

$Profile = ""
if ($m)
{
    $Profile = "--profile ""monitoring"""
}

if ($args[0] -eq "stop")
{
    Write-Host "Stopping localtest!"

    if (Get-Command "docker" -errorAction SilentlyContinue)
    {
        Write-host "Stopping using docker"
        docker compose --profile "*" down -v
    }
    elseif (Get-Command "docker-compose" -errorAction SilentlyContinue)
    {
        # If the user is not using docker, there should be podman installed
        # If additionally docker-compose is installed, we use that since it has had '--profile' support for a long time,
        # whereas podman-compose has only recently added support, and not many users have the latest versions
        Write-host "Stopping using docker-compose"
        docker-compose --file podman-compose.yml --profile "*" down -v
    }
    elseif (Get-Command "podman" -errorAction SilentlyContinue)
    {
        Write-host "Stopping using podman"
        podman compose --file podman-compose.yml --profile "*" down -v
    }
    else
    {
        Write-host "Preqreqs missing - please install docker or podman"
        exit 1
    }
}
elseif ($args[0] -eq "k6")
{
    Write-Host "Running k6 loadtest!"
    $Cmd = "podman"
    if (Get-Command "docker" -errorAction SilentlyContinue)
    {
        $Cmd = "docker"
    }
    iex "$Cmd pull grafana/k6:master-with-browser"
    iex "$Cmd run --rm -i --net=host grafana/k6:master-with-browser run - <k6/loadtest.js"
}
else 
{
    Write-Host "Running localtest!"

    if (Get-Command "docker" -errorAction SilentlyContinue)
    {
        Write-host "Running using docker"
        docker compose --profile "*" down -v
        iex "docker compose $Profile -d --build"
    }
    elseif (Get-Command "docker-compose" -errorAction SilentlyContinue)
    {
        # If the user is not using docker, there should be podman installed
        # If additionally docker-compose is installed, we use that since it has had '--profile' support for a long time,
        # whereas podman-compose has only recently added support, and not many users have the latest versions
        Write-host "Running using docker-compose"
        docker-compose --file podman-compose.yml --profile "*" down -v
        iex "docker-compose --file podman-compose.yml $Profile -d --build"
    }
    elseif (Get-Command "podman" -errorAction SilentlyContinue)
    {
        Write-host "Running using podman"
        podman compose --file podman-compose.yml --profile "*" down -v
        iex "podman compose --file podman-compose.yml $Profile -d --build"
    }
    else
    {
        Write-host "Preqreqs missing - please install docker or podman"
        exit 1
    }
}
