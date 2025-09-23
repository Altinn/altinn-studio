#!/usr/bin/env bash

fdSubscription=$FD_SUBSCRIPTION
fdResourceGroup=$FD_RESOURCEGROUP
fdProfileName=$FD_PROFILE
fdEndpointName=$FD_ENDPOINT
fdDomain=$FD_DOMAIN
fdPaths=()

while [[ $# -gt 0 ]]; do
  case $1 in
    --subscription)
      fdSubscription="$2"
      shift
      shift
      ;;
    --resourcegroup)
      fdResourceGroup="$2"
      shift
      shift
      ;;
    --profile)
      fdProfileName="$2"
      shift
      shift
      ;;
    --endpoint)
      fdEndpointName="$2"
      shift
      shift
      ;;
    --domain)
      fdDomain="$2"
      shift
      shift
      ;;
    --path)
      fdPaths+=("$2")
      shift
      shift
      ;;
    -*|--*)
      echo "Unknown option $1"
      exit 1
      ;;
    *)
      echo "Unknown argument $1"
      exit 1
      ;;
  esac
done

if [ ${#fdPaths[@]} == 0 ]; then
    echo "No cache pruning as no paths supplied with option --path."
fi

#purge-paths-opts=()
for path in "${fdPaths[@]}"; do
    echo "Purging ${path}"
    az afd endpoint purge \
              --no-wait \
              --resource-group $fdResourceGroup \
              --profile-name $fdProfileName \
              --endpoint-name $fdEndpointName \
              --domains $fdDomain \
              --content-paths "${path}"
    echo "Purged ${path}"
done
