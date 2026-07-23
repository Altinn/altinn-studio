#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$repo_root"

chart_version=0.8.4
chart_digest=sha256:407194e4ec03ebbabcae325dc342d8c7250c0f552c730aed9d44eb26b18957be
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

yq '.spec.values |
  .producer.githubApp.appID = 12345 |
  .producer.githubApp.installationID = 67890' "$helm_release" |
  helm template nvt "$chart" \
    --version "$chart_version" \
    --namespace nvt \
    --values - > "$temp_dir/nvt-active.yaml"

yq -e '
  .spec.install.crds == "CreateReplace" and
  .spec.upgrade.crds == "CreateReplace" and
  .spec.values.producer.enabled == true and
  .spec.values.agentSchedule.suspend == false and
  .spec.values.agentSchedule.maxParallelism == 2 and
  .spec.values.agentSchedule.template.runtimeClassName == "kata-vm-isolation" and
  (.spec.values.agentSchedule.template.tolerations | length) == 1 and
  .spec.values.agentSchedule.template.tolerations[0].effect == "NoSchedule" and
  .spec.values.agentSchedule.template.tolerations[0].key == "purpose" and
  .spec.values.agentSchedule.template.tolerations[0].operator == "Equal" and
  .spec.values.agentSchedule.template.tolerations[0].value == "nvt-agent" and
  .spec.values.agentSchedule.profileSelection.onNoMatch == "deny" and
  (.spec.values.agentSchedule.profiles | length) == 2 and
  .spec.values.agentSchedule.profiles[0].egress == "mediated" and
  .spec.values.agentSchedule.profiles[0].egressEnforcement == true and
  .spec.values.agentSchedule.profiles[0].egressTransport == "transparent" and
  .spec.values.agentSchedule.profiles[1].egress == "mediated" and
  .spec.values.agentSchedule.profiles[1].egressEnforcement == true and
  .spec.values.agentSchedule.profiles[1].egressTransport == "transparent" and
  .spec.values.broker.envSecretName == "nvt-broker-env" and
  .spec.values.broker.persistence.seedSecretName == "nvt-broker-seed" and
  .spec.values.producer.githubApp.existingSecret == "nvt-github-app" and
  .spec.values.gateway.auth.oauth2.credentials.existingSecret == "nvt-gateway-github" and
  .spec.values.gateway.auth.session.existingSecret == "nvt-gateway-session" and
  .spec.values.egress.defaultMode == "mediated" and
  .spec.values.egress.allowInsecureUpstreams == false and
  .spec.values.egress.networkPolicyCapable == true
' "$helm_release" >/dev/null

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
  $nvtRules[0].ports == [{"port": 8080, "protocol": "TCP"}]
' >/dev/null

echo "NVT Kustomize/Helm renders, digest pin, and gateway-only egress policy validated."
