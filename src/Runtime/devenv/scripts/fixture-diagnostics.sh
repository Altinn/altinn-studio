#!/usr/bin/env bash

set -u

run() {
  "$@" || true
}

run kubectl get pods --all-namespaces -o wide
run kubectl get ocirepositories.source.toolkit.fluxcd.io --all-namespaces
run kubectl get kustomizations.kustomize.toolkit.fluxcd.io --all-namespaces
run kubectl describe kustomizations.kustomize.toolkit.fluxcd.io --all-namespaces
run kubectl get events --all-namespaces --sort-by=.lastTimestamp
run kubectl logs --namespace flux-system deployment/kustomize-controller --all-containers --tail=200

# The single quotes intentionally preserve the Go template's $pod variable for kubectl.
# shellcheck disable=SC2016
kubectl get pods --all-namespaces \
  -o go-template='{{range .items}}{{$pod := .}}{{range .status.containerStatuses}}{{if not .ready}}{{$pod.metadata.namespace}}{{"\t"}}{{$pod.metadata.name}}{{"\n"}}{{end}}{{end}}{{end}}' \
  2>/dev/null | sort -u | while IFS=$'\t' read -r namespace pod; do
  [ -n "$namespace" ] && [ -n "$pod" ] || continue
  printf '\n=== Logs for unready pod %s/%s ===\n' "$namespace" "$pod"
  run kubectl logs --namespace "$namespace" "$pod" --all-containers --prefix --tail=200
  run kubectl logs --namespace "$namespace" "$pod" --all-containers --prefix --previous --tail=200
done
