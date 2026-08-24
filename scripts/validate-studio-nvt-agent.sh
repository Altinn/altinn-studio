#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$repo_root"

chart_version=0.8.74
chart_digest=sha256:7b62f14808dca7f613d73588137b42c3fa49bb3987907b238a7973bde78511e2
chart=oci://ghcr.io/mirkosekulic/helm/nvt
helm_release=infra/studio/nvt-agent/release/helm-release.yaml
temp_dir=$(mktemp -d)
trap 'rm -rf "$temp_dir"' EXIT

for layer in platform secrets release bootstrap; do
  kubectl kustomize "infra/studio/nvt-agent/$layer" > "$temp_dir/$layer.yaml"
done

if yq -e '
  select(.kind == "ExternalSecret" and .metadata.name == "nvt-broker-seed")
' "$temp_dir/secrets.yaml" >/dev/null 2>&1; then
  echo "The obsolete Key Vault-backed nvt-broker-seed must not be rendered" >&2
  exit 1
fi

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
  (.spec.data | length) == 3 and
  .spec.data[0].remoteRef.key == "nvt-agent-private-key-pem" and
  .spec.data[0].secretKey == "privateKeyPem" and
  .spec.data[1].remoteRef.key == "nvt-dynamic-account-assertion-key" and
  .spec.data[1].secretKey == "dynamicAccountAssertionKey" and
  .spec.data[2].remoteRef.key == "nvt-dynamic-account-coordination-key" and
  .spec.data[2].secretKey == "dynamicAccountCoordinationKey" and
  (.spec.target.template.data | keys | length) == 5 and
  (.spec.target.template.data | has("NVT_DYNAMIC_ACCOUNT_ASSERTION_KEY")) and
  (.spec.target.template.data | has("NVT_DYNAMIC_ACCOUNT_COORDINATION_KEY")) and
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
  (.spec.values.agentSchedule.workflowProfiles | length) == 3 and
  .spec.values.agentSchedule.workflowProfiles[0].name == "implement-pr" and
  (.spec.values.agentSchedule.workflowProfiles[0].workspaceInstructions | contains("nvt-as-root <command>")) and
  (.spec.values.agentSchedule.workflowProfiles[0].workspaceInstructions | contains("passwordless sudo")) and
  (.spec.values.agentSchedule.workflowProfiles[0].workspaceInstructions | contains("push task branches to its `origin`; do not use a fork")) and
  (.spec.values.agentSchedule.workflowProfiles[0].workspaceInstructions | contains("gh-auth --provider github-main --repo Altinn/altinn-studio")) and
  (.spec.values.agentSchedule.workflowProfiles[0].workspaceInstructions | contains("github-altinn") | not) and
  (.spec.values.agentSchedule.workflowProfiles[0].workspaceInstructions | contains("Conventional Commits")) and
  (.spec.values.agentSchedule.workflowProfiles[0].lifecycle.completeOn | join("\u0000")) == "plugin.github.pr.merged\u0000plugin.github.pr.closed" and
  .spec.values.agentSchedule.workflowProfiles[1].name == "review-pr" and
  .spec.values.agentSchedule.workflowProfiles[1].lifecycle.completeOn[0] == "plugin.work.completed" and
  .spec.values.agentSchedule.workflowProfiles[1].lifecycle.failOn[0] == "plugin.work.failed" and
  (.spec.values.agentSchedule.workflowProfiles[1].workspaceInstructions | contains("nvt-work complete")) and
  .spec.values.agentSchedule.workflowProfiles[2].name == "generic-run" and
  .spec.values.agentSchedule.workflowProfiles[2].lifecycle.completeOn[0] == "plugin.work.completed" and
  .spec.values.agentSchedule.workflowProfiles[2].lifecycle.failOn[0] == "plugin.work.failed" and
  (.spec.values.agentSchedule.workflowProfiles[2].workspaceInstructions | contains("nvt-work complete")) and
  (.spec.values.agentSchedule.producerPolicies | length) == 1 and
  .spec.values.agentSchedule.producerPolicies[0].identity == "system:serviceaccount:nvt:nvt-github-comments-producer" and
  (.spec.values.agentSchedule.producerPolicies[0].workflows | length) == 3 and
  .spec.values.agentSchedule.producerPolicies[0].workflows[0] == "implement-pr" and
  .spec.values.agentSchedule.producerPolicies[0].workflows[1] == "review-pr" and
  .spec.values.agentSchedule.producerPolicies[0].workflows[2] == "generic-run" and
  .spec.values.agentSchedule.producerPolicies[0].defaultWorkflow == "implement-pr" and
  .spec.values.producer.submission.workflow == "implement-pr" and
  .spec.values.producer.submission.commandWorkflows."pr-create" == "implement-pr" and
  .spec.values.producer.submission.commandWorkflows."pr-continue" == "implement-pr" and
  .spec.values.producer.submission.commandWorkflows.review == "review-pr" and
  .spec.values.producer.submission.commandWorkflows.run == "generic-run" and
  .spec.values.producer.schedulingReactions.enabled == true and
  .spec.values.producer.schedulingReactions.accepted == "+1" and
  .spec.values.producer.schedulingReactions.rejected == "-1" and
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
  .spec.values.agentSchedule.principalCredentialSelection.enabled == true and
  .spec.values.agentSchedule.principalCredentialSelection.onNoMatch == "deny" and
  (.spec.values.agentSchedule.principalCredentialSelection.templateProfiles | length) == 2 and
  .spec.values.agentSchedule.principalCredentialSelection.templateProfiles[0].template == "codex-member" and
  .spec.values.agentSchedule.principalCredentialSelection.templateProfiles[0].profile == "member-codex" and
  .spec.values.agentSchedule.principalCredentialSelection.templateProfiles[1].template == "claude-member" and
  .spec.values.agentSchedule.principalCredentialSelection.templateProfiles[1].profile == "member-claude" and
  ((.spec.values.agentSchedule.profileSelection // {}) | length) == 0 and
  (.spec.values.agentSchedule.producerPolicies[0].allowedPrincipalIssuers | length) == 1 and
  .spec.values.agentSchedule.producerPolicies[0].allowedPrincipalIssuers[0] == "https://github.com" and
  (.spec.values.agentSchedule.profiles | length) == 2 and
  .spec.values.agentSchedule.profiles[0].name == "member-codex" and
  .spec.values.agentSchedule.profiles[0].egress == "mediated" and
  .spec.values.agentSchedule.profiles[0].egressEnforcement == true and
  .spec.values.agentSchedule.profiles[0].egressTransport == "transparent" and
  .spec.values.agentSchedule.profiles[0].execution.kind == "pod" and
  .spec.values.agentSchedule.profiles[0].execution.driver == "kubernetes" and
  .spec.values.agentSchedule.profiles[0].runtime.model == "gpt-5.6-sol" and
  .spec.values.agentSchedule.profiles[0].runtime.effort == "high" and
  .spec.values.agentSchedule.profiles[0].agentRuntimeConfig.resume.command == "codex" and
  .spec.values.agentSchedule.profiles[0].agentRuntimeConfig.proxy.provider == "$principal-account" and
  .spec.values.agentSchedule.profiles[0].broker.grants[0].provider == "$principal-account" and
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
  .spec.values.agentSchedule.profiles[1].name == "member-claude" and
  .spec.values.agentSchedule.profiles[1].egress == "mediated" and
  .spec.values.agentSchedule.profiles[1].egressEnforcement == true and
  .spec.values.agentSchedule.profiles[1].egressTransport == "transparent" and
  .spec.values.agentSchedule.profiles[1].execution.kind == "pod" and
  .spec.values.agentSchedule.profiles[1].execution.driver == "kubernetes" and
  (.spec.values.agentSchedule.profiles[1].runtime | has("model") | not) and
  (.spec.values.agentSchedule.profiles[1].runtime | has("effort") | not) and
  .spec.values.agentSchedule.profiles[1].agentRuntimeConfig.resume.command == "claude" and
  .spec.values.agentSchedule.profiles[1].agentRuntimeConfig.proxy.provider == "$principal-account" and
  .spec.values.agentSchedule.profiles[1].broker.grants[0].provider == "$principal-account" and
  (.spec.values.agentSchedule.profiles[1].agentRuntimeConfig.resume.args | join("\u0000")) == "--continue\u0000--dangerously-skip-permissions" and
  (.spec.values.agentSchedule.profiles[1].broker.grants | length) == 2 and
  .spec.values.agentSchedule.profiles[1].broker.grants[1].provider == "github-main" and
  .spec.values.agentSchedule.profiles[1].broker.grants[1].permissions.checks == "read" and
  .spec.values.agentSchedule.profiles[1].broker.grants[1].permissions.contents == "write" and
  .spec.values.agentSchedule.profiles[1].broker.grants[1].permissions.issues == "write" and
  .spec.values.agentSchedule.profiles[1].broker.grants[1].permissions.pull_requests == "write" and
  .spec.values.agentSchedule.profiles[1].broker.grants[1].permissions.workflows == "write" and
  .spec.values.agentSchedule.template.agent.config.plugins[0].name == "git-host-credentials" and
  .spec.values.agentSchedule.template.agent.config.plugins[0].config.default-provider == "github-main" and
  (.spec.values.agentSchedule.template.agent.config.plugins[0].config.providers | length) == 1 and
  .spec.values.agentSchedule.template.agent.config.plugins[0].config.providers[0].name == "github-main" and
  .spec.values.agentSchedule.template.agent.config.plugins[0].config.providers[0].broker-provider == "github-main" and
  .spec.values.agentSchedule.template.agent.config.plugins[0].config.providers[0].credential-kind == "mediated" and
  (.spec.values.broker.config.providers | length) == 1 and
  .spec.values.broker.config.providers[0].name == "github-main" and
  .spec.values.broker.config.providers[0].allow.permissions.checks == "read" and
  .spec.values.broker.config.providers[0].allow.permissions.contents == "write" and
  .spec.values.broker.config.providers[0].allow.permissions.issues == "write" and
  .spec.values.broker.config.providers[0].allow.permissions.pull_requests == "write" and
  .spec.values.broker.config.providers[0].allow.permissions.workflows == "write" and
  .spec.values.broker.config.providers[0].config.app-id-env == "NVT_GITHUB_APP_ID" and
  .spec.values.broker.config.providers[0].config.installation-id-env == "NVT_GITHUB_APP_INSTALLATION_ID" and
  .spec.values.broker.config.providers[0].config.private-key-base64-env == "NVT_GITHUB_APP_PRIVATE_KEY_BASE64" and
  .spec.values.agentSchedule.template.agent.config.plugins[1].name == "git-credentials" and
  (.spec.values.agentSchedule.template.agent.config.plugins[1].config.credentials | length) == 1 and
  .spec.values.agentSchedule.template.agent.config.plugins[1].config.credentials[0].identity.mode == "explicit" and
  .spec.values.agentSchedule.template.agent.config.plugins[1].config.credentials[0].identity.name == "nvt-agent[bot]" and
  .spec.values.agentSchedule.template.agent.config.plugins[1].config.credentials[0].identity.email == "289161147+nvt-agent[bot]@users.noreply.github.com" and
  .spec.values.agentSchedule.template.agent.config.plugins[1].config.credentials[0].provider == "github-main" and
  (.spec.values.agentSchedule.template.agent.config.plugins[2].config.repos | length) == 1 and
  .spec.values.agentSchedule.template.agent.config.plugins[2].config.repos[0].url == "https://github.com/Altinn/altinn-studio.git" and
  (.spec.values.agentSchedule.template.agent.config.plugins[2].config.repos[0] | has("upstream") | not) and
  .spec.values.agentSchedule.template.agent.config.plugins[3].name == "work-control" and
  .spec.values.agentSchedule.template.agent.config.plugins[4].name == "github-watcher" and
  (.spec.values.agentSchedule.template.agent.config.plugins[4].config."ignored-comment-prefixes" | length) == 2 and
  .spec.values.agentSchedule.template.agent.config.plugins[4].config."ignored-comment-prefixes"[0] == "/nvtagent" and
  .spec.values.agentSchedule.template.agent.config.plugins[4].config."ignored-comment-prefixes"[1] == "/nvtlocal" and
  .spec.values.agentSchedule.template.agent.config.plugins[4].egress.provider == "github-main" and
  .spec.values.broker.envSecretName == "nvt-broker-env" and
  .spec.values.broker.dynamicAccountAssertionRotationEpoch == "2026-08-12-1" and
  .spec.values.broker.config."dynamic-accounts".enabled == true and
  .spec.values.broker.config."dynamic-accounts".authentication."hmac-key-env" == "NVT_DYNAMIC_ACCOUNT_ASSERTION_KEY" and
  .spec.values.broker.config."dynamic-accounts"."template-switching".enabled == true and
  .spec.values.broker.config."dynamic-accounts"."template-switching"."operator-hmac-key-env" == "NVT_DYNAMIC_ACCOUNT_COORDINATION_KEY" and
  (.spec.values.broker.config."dynamic-accounts"."provider-templates" | length) == 2 and
  .spec.values.broker.config."dynamic-accounts"."provider-templates"[0].name == "principal-codex" and
  .spec.values.broker.config."dynamic-accounts"."provider-templates"[0]."credential-config-key" == "auth-file" and
  .spec.values.broker.config."dynamic-accounts"."provider-templates"[1].name == "principal-claude" and
  .spec.values.broker.config."dynamic-accounts"."provider-templates"[1]."credential-config-key" == "credentials-file" and
  (.spec.values.broker.config."dynamic-accounts"."credential-templates" | length) == 2 and
  .spec.values.broker.config."dynamic-accounts"."credential-templates"[0].name == "codex-member" and
  .spec.values.broker.config."dynamic-accounts"."credential-templates"[1].name == "claude-member" and
  .spec.values.broker.persistence.seedSecretName == "nvt-portal-seed" and
  .spec.values.operator.principalAccounts.enabled == true and
  .spec.values.operator.principalAccounts.authentication.existingSecret == "nvt-broker-env" and
  .spec.values.operator.principalAccounts.templateSwitching.enabled == true and
  .spec.values.operator.principalAccounts.templateSwitching.authentication.existingSecret == "nvt-broker-env" and
  .spec.values.credentialPortal.enabled == true and
  .spec.values.credentialPortal.publicURL == "https://staging.altinn.studio/agents/credentials" and
  .spec.values.credentialPortal.enrollment.experimentalCodexDeviceAuth == true and
  .spec.values.credentialPortal.recoveryUpload.enabled == true and
  .spec.values.credentialPortal.auth.mode == "oauth2" and
  .spec.values.credentialPortal.auth.session.existingSecret == "nvt-credential-portal-session" and
  .spec.values.credentialPortal.auth.oauth2.credentials.existingSecret == "nvt-gateway-github" and
  .spec.values.credentialPortal.auth.oauth2.issuer == "https://github.com" and
  .spec.values.credentialPortal.auth.oauth2.identity.subjectPath == "id" and
  .spec.values.credentialPortal.dynamic.enabled == true and
  .spec.values.credentialPortal.dynamic.broker.authentication.existingSecret == "nvt-broker-env" and
  .spec.values.credentialPortal.dynamic.templateSwitch.enabled == true and
  (.spec.values.credentialPortal.dynamic.templates | length) == 2 and
  .spec.values.credentialPortal.dynamic.templates[0].name == "codex-member" and
  .spec.values.credentialPortal.dynamic.templates[1].name == "claude-member" and
  (.spec.values.credentialPortal.slots | length) == 0 and
  .spec.values.credentialPortal.auth.claimEnrichment.sources[0].endpoint == "https://api.github.com/user/teams" and
  .spec.values.credentialPortal.auth.claimEnrichment.sources[0].pagination.maxPages == 2 and
  .spec.values.credentialPortal.auth.eligibility.rules[0].where.array == "teams[]" and
  .spec.values.credentialPortal.auth.eligibility.rules[0].where.all[0].values[0] == "Altinn" and
  .spec.values.credentialPortal.auth.eligibility.rules[0].where.all[1].values[0] == "team-altinn-studio" and
  .spec.values.producer.githubApp.existingSecret == "nvt-github-app" and
  .spec.values.producer.githubApp.appID == "${NVT_GITHUB_APP_ID}" and
  .spec.values.producer.githubApp.installationID == "${NVT_GITHUB_APP_INSTALLATION_ID}" and
  (.spec.values.producer.allowedAuthors | length) == 1 and
  .spec.values.producer.allowedAuthors[0] == "*" and
  .spec.values.gateway.auth.oauth2.credentials.existingSecret == "nvt-gateway-github" and
  .spec.values.gateway.auth.session.existingSecret == "nvt-gateway-session" and
  .spec.values.gateway.auth.claimEnrichment.sources[0].endpoint == "https://api.github.com/user/teams" and
  .spec.values.gateway.auth.claimEnrichment.sources[0].pagination.maxPages == 2 and
  .spec.values.gateway.auth.admission.rules[0].where.array == "teams[]" and
  .spec.values.gateway.auth.admission.rules[0].where.all[0].values[0] == "Altinn" and
  .spec.values.gateway.auth.admission.rules[0].where.all[1].values[0] == "team-altinn-studio" and
  .spec.values.gateway.auth.authorization.rules[0].owner == true and
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
