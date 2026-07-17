#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$repo_root"

chart_version=0.8.2
chart_digest=sha256:0d76d3332097d7c5e32aa9ff0af4b57ea7bf159f54fadd32866d1e0e15c6bfc7
chart=oci://ghcr.io/mirkosekulic/helm/nvt
helm_release=infra/studio/nvt-agent/release/helm-release.yaml
temp_dir=$(mktemp -d)
trap 'rm -rf "$temp_dir"' EXIT

for layer in platform secrets release bootstrap; do
  kubectl kustomize "infra/studio/nvt-agent/$layer" > "$temp_dir/$layer.yaml"
done

rendered_digest=$(yq -r '
  select(.kind == "OCIRepository" and .metadata.name == "nvt-chart") |
  .spec.ref.digest
' "$temp_dir/release.yaml")
rendered_tag=$(yq -r '
  select(.kind == "OCIRepository" and .metadata.name == "nvt-chart") |
  .spec.ref.tag // ""
' "$temp_dir/release.yaml")

if [[ "$rendered_digest" != "$chart_digest" || -n "$rendered_tag" ]]; then
  echo "The nvt-chart OCIRepository must select only verified digest $chart_digest" >&2
  exit 1
fi

yq '.spec.values' "$helm_release" |
  helm template nvt "$chart" \
    --version "$chart_version" \
    --namespace nvt \
    --values - > "$temp_dir/nvt-suspended.yaml"

yq '.spec.values |
  .producer.enabled = true |
  .producer.githubApp.appID = 12345 |
  .producer.githubApp.installationID = 67890 |
  .agentSchedule.template.runtimeClassName = "kata-vm-isolation" |
  .agentSchedule.suspend = false' "$helm_release" |
  helm template nvt "$chart" \
    --version "$chart_version" \
    --namespace nvt \
    --values - > "$temp_dir/nvt-activation.yaml"

helm template altinn-loadbalancer charts/altinn-loadbalancer \
  --set environment=staging > "$temp_dir/load-balancer.yaml"

yq -o=json '.' "$temp_dir/load-balancer.yaml" | jq -s -e '
  map(select(
    .kind == "NetworkPolicy" and
    .metadata.name == "deny-egress-nginx"
  )) | .[0] as $policy |
  [
    $policy.spec.egress[] |
    select(any(
      .to[]?;
      .namespaceSelector.matchLabels["kubernetes.io/metadata.name"] == "nvt"
    ))
  ] as $nvtRules |
  ($nvtRules | length) == 1 and
  ($nvtRules[0].to | length) == 1 and
  $nvtRules[0].to[0].namespaceSelector.matchLabels["kubernetes.io/metadata.name"] == "nvt" and
  $nvtRules[0].to[0].podSelector.matchLabels["app.kubernetes.io/name"] == "nvt-agent-gateway" and
  $nvtRules[0].to[0].podSelector.matchLabels["app.kubernetes.io/component"] == "gateway" and
  $nvtRules[0].ports == [{"port": 80, "protocol": "TCP"}]
' >/dev/null

echo "NVT Kustomize/Helm renders, digest pin, and gateway-only egress policy validated."
