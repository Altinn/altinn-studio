#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$repo_root"

chart_version=0.8.56
chart_digest=sha256:0ac4e39daad2b2e3b193b64bc24a04f0e578942af07137e2d5e7af8c9b24187d
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

yq -e '
  select(.kind == "ConfigMap" and .metadata.name == "nvt-deployment-metadata") |
  (.data | length) == 3 and
  .data.NVT_GITHUB_APP_ID == "3912708" and
  .data.NVT_GITHUB_APP_INSTALLATION_ID == "151954485" and
  .data.NVT_GATEWAY_GITHUB_CLIENT_ID == "Iv23ligyS0OMFL81xK0R"
' "$temp_dir/bootstrap.yaml" >/dev/null

yq -e '
  select(.kind == "ExternalSecret" and .metadata.name == "nvt-github-app") |
  (.spec.data | length) == 1 and
  .spec.data[0].remoteRef.key == "nvt-agent-private-key-pem" and
  .spec.data[0].secretKey == "private-key.pem"
' "$temp_dir/secrets.yaml" >/dev/null

yq -e '
  select(.kind == "ExternalSecret" and .metadata.name == "nvt-broker-env") |
  (.spec.data | length) == 1 and
  .spec.data[0].remoteRef.key == "nvt-agent-private-key-pem" and
  .spec.data[0].secretKey == "privateKeyPem" and
  (.spec.target.template.data | keys | length) == 3 and
  (.spec.target.template.data | has("NVT_GITHUB_APP_ID")) and
  (.spec.target.template.data | has("NVT_GITHUB_APP_INSTALLATION_ID")) and
  (.spec.target.template.data | has("NVT_GITHUB_APP_PRIVATE_KEY_BASE64"))
' "$temp_dir/secrets.yaml" >/dev/null

yq -e '
  select(.kind == "ExternalSecret" and .metadata.name == "nvt-credential-portal-session") |
  (.spec.data | length) == 1 and
  .spec.data[0].remoteRef.key == "nvt-credential-portal-session-secret" and
  .spec.data[0].secretKey == "session-secret" and
  .spec.target.name == "nvt-credential-portal-session"
' "$temp_dir/secrets.yaml" >/dev/null

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
  ((.spec.values.agentSchedule.allowedProducers // []) | length) == 0 and
  (.spec.values.agentSchedule.workflowProfiles | length) == 1 and
  .spec.values.agentSchedule.workflowProfiles[0].name == "implement-pr" and
  (.spec.values.agentSchedule.workflowProfiles[0].workspaceInstructions | contains("nvt-as-root <command>")) and
  (.spec.values.agentSchedule.workflowProfiles[0].workspaceInstructions | contains("passwordless sudo")) and
  (.spec.values.agentSchedule.workflowProfiles[0].workspaceInstructions | contains("push task branches to its `origin`; do not use a fork")) and
  (.spec.values.agentSchedule.workflowProfiles[0].workspaceInstructions | contains("gh-auth --provider github-main --repo Altinn/altinn-studio")) and
  (.spec.values.agentSchedule.workflowProfiles[0].workspaceInstructions | contains("github-altinn") | not) and
  (.spec.values.agentSchedule.workflowProfiles[0].workspaceInstructions | contains("Conventional Commits")) and
  (.spec.values.agentSchedule.producerPolicies | length) == 1 and
  .spec.values.agentSchedule.producerPolicies[0].identity == "system:serviceaccount:nvt:nvt-github-comments-producer" and
  (.spec.values.agentSchedule.producerPolicies[0].workflows | length) == 1 and
  .spec.values.agentSchedule.producerPolicies[0].workflows[0] == "implement-pr" and
  .spec.values.agentSchedule.producerPolicies[0].defaultWorkflow == "implement-pr" and
  .spec.values.producer.submission.workflow == "implement-pr" and
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
  (.spec.values.agentSchedule.template.agent.config.preseed.files[2].content | contains("[notice]")) and
  (.spec.values.agentSchedule.template.agent.config.preseed.files[2].content | contains("hide_rate_limit_model_nudge = true")) and
  (.spec.values.agentSchedule.template.agent.config.preseed.files[2].content | contains("[projects.\"/workspace\"]")) and
  (.spec.values.agentSchedule.template.agent.config.preseed.files[2].content | contains("trust_level = \"trusted\"")) and
  (.spec.values.agentSchedule.template.tolerations | length) == 1 and
  .spec.values.agentSchedule.template.tolerations[0].effect == "NoSchedule" and
  .spec.values.agentSchedule.template.tolerations[0].key == "purpose" and
  .spec.values.agentSchedule.template.tolerations[0].operator == "Equal" and
  .spec.values.agentSchedule.template.tolerations[0].value == "nvt-agent" and
  .spec.values.agentSchedule.profileSelection.onNoMatch == "deny" and
  (.spec.values.agentSchedule.profiles | length) == 4 and
  .spec.values.agentSchedule.profiles[0].name == "mirkoSekulic" and
  .spec.values.agentSchedule.profiles[0].egress == "mediated" and
  .spec.values.agentSchedule.profiles[0].egressEnforcement == true and
  .spec.values.agentSchedule.profiles[0].egressTransport == "transparent" and
  .spec.values.agentSchedule.profiles[0].execution.kind == "pod" and
  .spec.values.agentSchedule.profiles[0].execution.driver == "kubernetes" and
  .spec.values.agentSchedule.profiles[0].agentRuntimeConfig.resume.command == "codex" and
  (.spec.values.agentSchedule.profiles[0].agentRuntimeConfig.resume.args | join("\u0000")) == "resume\u0000--last\u0000--sandbox\u0000danger-full-access\u0000--ask-for-approval\u0000never" and
  (.spec.values.agentSchedule.profiles[0].runtime.container.capabilities.add | length) == 1 and
  .spec.values.agentSchedule.profiles[0].runtime.container.capabilities.add[0] == "SYS_PTRACE" and
  (.spec.values.agentSchedule.profiles[0].broker.grants | length) == 2 and
  .spec.values.agentSchedule.profiles[0].broker.grants[1].provider == "github-main" and
  .spec.values.agentSchedule.profiles[0].broker.grants[1].permissions.checks == "read" and
  .spec.values.agentSchedule.profiles[0].broker.grants[1].permissions.contents == "write" and
  .spec.values.agentSchedule.profiles[0].broker.grants[1].permissions.issues == "write" and
  .spec.values.agentSchedule.profiles[0].broker.grants[1].permissions.pull_requests == "write" and
  .spec.values.agentSchedule.profiles[0].broker.grants[1].permissions.workflows == "write" and
  .spec.values.agentSchedule.profiles[1].name == "jondyr" and
  .spec.values.agentSchedule.profiles[1].egress == "mediated" and
  .spec.values.agentSchedule.profiles[1].egressEnforcement == true and
  .spec.values.agentSchedule.profiles[1].egressTransport == "transparent" and
  .spec.values.agentSchedule.profiles[1].execution.kind == "pod" and
  .spec.values.agentSchedule.profiles[1].execution.driver == "kubernetes" and
  .spec.values.agentSchedule.profiles[1].agentRuntimeConfig.resume.command == "claude" and
  (.spec.values.agentSchedule.profiles[1].agentRuntimeConfig.resume.args | join("\u0000")) == "--continue\u0000--dangerously-skip-permissions" and
  (.spec.values.agentSchedule.profiles[1].broker.grants | length) == 2 and
  .spec.values.agentSchedule.profiles[1].broker.grants[1].provider == "github-main" and
  .spec.values.agentSchedule.profiles[1].broker.grants[1].permissions.checks == "read" and
  .spec.values.agentSchedule.profiles[1].broker.grants[1].permissions.contents == "write" and
  .spec.values.agentSchedule.profiles[1].broker.grants[1].permissions.issues == "write" and
  .spec.values.agentSchedule.profiles[1].broker.grants[1].permissions.pull_requests == "write" and
  .spec.values.agentSchedule.profiles[1].broker.grants[1].permissions.workflows == "write" and
  .spec.values.agentSchedule.profiles[2].name == "nkylstad" and
  .spec.values.agentSchedule.profiles[2].agentRuntimeConfig.proxy.provider == "claude-nkylstad" and
  .spec.values.agentSchedule.profiles[2].egress == "mediated" and
  .spec.values.agentSchedule.profiles[2].egressEnforcement == true and
  .spec.values.agentSchedule.profiles[2].egressTransport == "transparent" and
  .spec.values.agentSchedule.profiles[2].execution.kind == "pod" and
  .spec.values.agentSchedule.profiles[2].execution.driver == "kubernetes" and
  .spec.values.agentSchedule.profiles[2].agentRuntimeConfig.resume.command == "claude" and
  (.spec.values.agentSchedule.profiles[2].agentRuntimeConfig.resume.args | join("\u0000")) == "--continue\u0000--dangerously-skip-permissions" and
  .spec.values.agentSchedule.profiles[2].broker.grants[0].provider == "claude-nkylstad" and
  (.spec.values.agentSchedule.profiles[2].broker.grants | length) == 2 and
  .spec.values.agentSchedule.profiles[2].broker.grants[1].provider == "github-main" and
  .spec.values.agentSchedule.profiles[2].broker.grants[1].permissions.checks == "read" and
  .spec.values.agentSchedule.profiles[2].broker.grants[1].permissions.contents == "write" and
  .spec.values.agentSchedule.profiles[2].broker.grants[1].permissions.issues == "write" and
  .spec.values.agentSchedule.profiles[2].broker.grants[1].permissions.pull_requests == "write" and
  .spec.values.agentSchedule.profiles[2].broker.grants[1].permissions.workflows == "write" and
  .spec.values.agentSchedule.profiles[3].name == "ErlingHauan" and
  .spec.values.agentSchedule.profiles[3].agentRuntimeConfig.proxy.provider == "claude-erlinghauan" and
  .spec.values.agentSchedule.profiles[3].egress == "mediated" and
  .spec.values.agentSchedule.profiles[3].egressEnforcement == true and
  .spec.values.agentSchedule.profiles[3].egressTransport == "transparent" and
  .spec.values.agentSchedule.profiles[3].execution.kind == "pod" and
  .spec.values.agentSchedule.profiles[3].execution.driver == "kubernetes" and
  .spec.values.agentSchedule.profiles[3].agentRuntimeConfig.resume.command == "claude" and
  (.spec.values.agentSchedule.profiles[3].agentRuntimeConfig.resume.args | join("\u0000")) == "--continue\u0000--dangerously-skip-permissions" and
  .spec.values.agentSchedule.profiles[3].broker.grants[0].provider == "claude-erlinghauan" and
  (.spec.values.agentSchedule.profiles[3].broker.grants | length) == 2 and
  .spec.values.agentSchedule.profiles[3].broker.grants[1].provider == "github-main" and
  .spec.values.agentSchedule.profiles[3].broker.grants[1].permissions.checks == "read" and
  .spec.values.agentSchedule.profiles[3].broker.grants[1].permissions.contents == "write" and
  .spec.values.agentSchedule.profiles[3].broker.grants[1].permissions.issues == "write" and
  .spec.values.agentSchedule.profiles[3].broker.grants[1].permissions.pull_requests == "write" and
  .spec.values.agentSchedule.profiles[3].broker.grants[1].permissions.workflows == "write" and
  .spec.values.agentSchedule.template.agent.config.plugins[0].name == "git-host-credentials" and
  .spec.values.agentSchedule.template.agent.config.plugins[0].config.default-provider == "github-main" and
  (.spec.values.agentSchedule.template.agent.config.plugins[0].config.providers | length) == 1 and
  .spec.values.agentSchedule.template.agent.config.plugins[0].config.providers[0].name == "github-main" and
  .spec.values.agentSchedule.template.agent.config.plugins[0].config.providers[0].broker-provider == "github-main" and
  .spec.values.agentSchedule.template.agent.config.plugins[0].config.providers[0].credential-kind == "mediated" and
  .spec.values.broker.config.providers[2].name == "claude-nkylstad" and
  .spec.values.broker.config.providers[2].config.credentials-file == "/state/auth/claude-nkylstad.json" and
  .spec.values.broker.config.providers[3].name == "claude-erlinghauan" and
  .spec.values.broker.config.providers[3].config.credentials-file == "/state/auth/claude-erlinghauan.json" and
  (.spec.values.broker.config.providers | length) == 5 and
  .spec.values.broker.config.providers[4].name == "github-main" and
  .spec.values.broker.config.providers[4].allow.permissions.checks == "read" and
  .spec.values.broker.config.providers[4].allow.permissions.contents == "write" and
  .spec.values.broker.config.providers[4].allow.permissions.issues == "write" and
  .spec.values.broker.config.providers[4].allow.permissions.pull_requests == "write" and
  .spec.values.broker.config.providers[4].allow.permissions.workflows == "write" and
  .spec.values.broker.config.providers[4].config.app-id-env == "NVT_GITHUB_APP_ID" and
  .spec.values.broker.config.providers[4].config.installation-id-env == "NVT_GITHUB_APP_INSTALLATION_ID" and
  .spec.values.broker.config.providers[4].config.private-key-base64-env == "NVT_GITHUB_APP_PRIVATE_KEY_BASE64" and
  .spec.values.agentSchedule.template.agent.config.plugins[1].name == "git-credentials" and
  (.spec.values.agentSchedule.template.agent.config.plugins[1].config.credentials | length) == 1 and
  .spec.values.agentSchedule.template.agent.config.plugins[1].config.credentials[0].identity.mode == "explicit" and
  .spec.values.agentSchedule.template.agent.config.plugins[1].config.credentials[0].identity.name == "nvt-agent[bot]" and
  .spec.values.agentSchedule.template.agent.config.plugins[1].config.credentials[0].identity.email == "289161147+nvt-agent[bot]@users.noreply.github.com" and
  .spec.values.agentSchedule.template.agent.config.plugins[1].config.credentials[0].provider == "github-main" and
  (.spec.values.agentSchedule.template.agent.config.plugins[2].config.repos | length) == 1 and
  .spec.values.agentSchedule.template.agent.config.plugins[2].config.repos[0].url == "https://github.com/Altinn/altinn-studio.git" and
  (.spec.values.agentSchedule.template.agent.config.plugins[2].config.repos[0] | has("upstream") | not) and
  .spec.values.agentSchedule.template.agent.config.plugins[3].egress.provider == "github-main" and
  .spec.values.broker.envSecretName == "nvt-broker-env" and
  .spec.values.broker.persistence.seedSecretName == "nvt-portal-seed" and
  .spec.values.credentialPortal.enabled == true and
  .spec.values.credentialPortal.publicURL == "https://staging.altinn.studio/agents/credentials" and
  .spec.values.credentialPortal.enrollment.experimentalCodexDeviceAuth == true and
  .spec.values.credentialPortal.recoveryUpload.enabled == true and
  .spec.values.credentialPortal.auth.mode == "oauth2" and
  .spec.values.credentialPortal.auth.session.existingSecret == "nvt-credential-portal-session" and
  .spec.values.credentialPortal.auth.oauth2.credentials.existingSecret == "nvt-gateway-github" and
  .spec.values.credentialPortal.auth.oauth2.issuer == "https://github.com" and
  .spec.values.credentialPortal.auth.oauth2.identity.subjectPath == "id" and
  (.spec.values.credentialPortal.slots | length) == 4 and
  .spec.values.credentialPortal.slots[0].owner.subject == "23359247" and
  .spec.values.credentialPortal.slots[0].brokerProvider == "codex-mirkoSekulic" and
  .spec.values.credentialPortal.slots[0].secretName == "nvt-portal-seed" and
  .spec.values.credentialPortal.slots[0].dataKey == "codex-mirkosekulic.json" and
  .spec.values.credentialPortal.slots[1].owner.subject == "1525466" and
  .spec.values.credentialPortal.slots[1].brokerProvider == "claude-jondyr" and
  .spec.values.credentialPortal.slots[2].owner.subject == "1636323" and
  .spec.values.credentialPortal.slots[2].brokerProvider == "claude-nkylstad" and
  .spec.values.credentialPortal.slots[3].owner.subject == "148075168" and
  .spec.values.credentialPortal.slots[3].brokerProvider == "claude-erlinghauan" and
  .spec.values.producer.githubApp.existingSecret == "nvt-github-app" and
  .spec.values.producer.githubApp.appID == "${NVT_GITHUB_APP_ID}" and
  .spec.values.producer.githubApp.installationID == "${NVT_GITHUB_APP_INSTALLATION_ID}" and
  .spec.values.gateway.auth.oauth2.credentials.existingSecret == "nvt-gateway-github" and
  .spec.values.gateway.auth.session.existingSecret == "nvt-gateway-session" and
  .spec.values.gateway.credentialPortal.url == "/agents/credentials" and
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
  ($nvtRules | length) == 2 and
  ($nvtRules[0].to | length) == 1 and
  $nvtRules[0].to[0].namespaceSelector.matchLabels["kubernetes.io/metadata.name"] == "nvt" and
  $nvtRules[0].to[0].podSelector.matchLabels["app.kubernetes.io/name"] == "nvt-agent-gateway" and
  $nvtRules[0].to[0].podSelector.matchLabels["app.kubernetes.io/component"] == "gateway" and
  $nvtRules[0].ports == [{"port": 8080, "protocol": "TCP"}] and
  ($nvtRules[1].to | length) == 1 and
  $nvtRules[1].to[0].namespaceSelector.matchLabels["kubernetes.io/metadata.name"] == "nvt" and
  $nvtRules[1].to[0].podSelector.matchLabels["app.kubernetes.io/instance"] == "nvt" and
  $nvtRules[1].to[0].podSelector.matchLabels["app.kubernetes.io/component"] == "credential-portal" and
  $nvtRules[1].ports == [{"port": 8080, "protocol": "TCP"}]
' >/dev/null

echo "NVT Kustomize/Helm renders, digest pin, and gateway/credential-portal egress policy validated."
