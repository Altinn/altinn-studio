#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$repo_root"

chart_version=0.8.8
chart_digest=sha256:3f917bd1006d43d6e0eb2399483c327f15255384bab795ba1da6cad8ead89172
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
  .spec.values.agentSchedule.template.resources.requests.cpu == "2" and
  .spec.values.agentSchedule.template.resources.requests.memory == "8Gi" and
  .spec.values.agentSchedule.template.resources.limits.cpu == "2" and
  .spec.values.agentSchedule.template.resources.limits.memory == "8Gi" and
  .spec.values.agentSchedule.template.agent.config.preseed.files[0].path == "$HOME/.claude/settings.json" and
  .spec.values.agentSchedule.template.agent.config.preseed.files[0].overwrite == false and
  .spec.values.agentSchedule.template.agent.config.preseed.files[0].json.theme == "dark-daltonized" and
  .spec.values.agentSchedule.template.agent.config.preseed.files[0].json.skipDangerousModePermissionPrompt == true and
  .spec.values.agentSchedule.template.agent.config.preseed.files[1].path == "$HOME/.claude.json" and
  .spec.values.agentSchedule.template.agent.config.preseed.files[1].overwrite == false and
  .spec.values.agentSchedule.template.agent.config.preseed.files[1].json.hasCompletedOnboarding == true and
  .spec.values.agentSchedule.template.agent.config.preseed.files[1].json.bypassPermissionsModeAccepted == true and
  .spec.values.agentSchedule.template.agent.config.preseed.files[1].json.projects."/workspace".hasTrustDialogAccepted == true and
  .spec.values.agentSchedule.template.agent.config.preseed.files[2].path == "$HOME/.codex/config.toml" and
  .spec.values.agentSchedule.template.agent.config.preseed.files[2].overwrite == false and
  (.spec.values.agentSchedule.template.agent.config.preseed.files[2].content | contains("check_for_update_on_startup = false")) and
  (.spec.values.agentSchedule.template.agent.config.preseed.files[2].content | contains("[projects.\"/workspace\"]")) and
  (.spec.values.agentSchedule.template.agent.config.preseed.files[2].content | contains("trust_level = \"trusted\"")) and
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
  .spec.values.agentSchedule.template.agent.config.plugins[0].name == "git-host-credentials" and
  .spec.values.agentSchedule.template.agent.config.plugins[0].config.providers[0].credential-kind == "mediated" and
  .spec.values.agentSchedule.template.agent.config.plugins[0].config.providers[1].credential-kind == "mediated" and
  .spec.values.agentSchedule.template.agent.config.plugins[1].name == "git-credentials" and
  .spec.values.agentSchedule.template.agent.config.plugins[1].config.credentials[0].identity.mode == "explicit" and
  .spec.values.agentSchedule.template.agent.config.plugins[1].config.credentials[0].identity.name == "nvt-agent[bot]" and
  .spec.values.agentSchedule.template.agent.config.plugins[1].config.credentials[0].identity.email == "289161147+nvt-agent[bot]@users.noreply.github.com" and
  .spec.values.agentSchedule.template.agent.config.plugins[1].config.credentials[1].identity.mode == "explicit" and
  .spec.values.agentSchedule.template.agent.config.plugins[1].config.credentials[1].identity.name == "nvt-agent-altinn[bot]" and
  .spec.values.agentSchedule.template.agent.config.plugins[1].config.credentials[1].identity.email == "289165276+nvt-agent-altinn[bot]@users.noreply.github.com" and
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
