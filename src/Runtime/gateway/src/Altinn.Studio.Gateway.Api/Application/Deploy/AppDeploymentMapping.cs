using Altinn.Studio.Gateway.Api.Clients.K8s;
using Altinn.Studio.Gateway.Contracts.Deploy;

namespace Altinn.Studio.Gateway.Api.Application;

internal static class AppDeploymentMapping
{
    public static AppDeployment FromRuntimeDeployment(
        string org,
        string targetEnvironment,
        DeploymentClient.RuntimeDeployment runtimeDeployment
    ) =>
        new(
            org,
            targetEnvironment,
            runtimeDeployment.App,
            SourceEnvironment: null,
            BuildId: null,
            runtimeDeployment.ImageTag,
            runtimeDeployment.CurrentVersion,
            runtimeDeployment.UpdateInProgress,
            IsGitOpsManaged: false
        );

    public static AppDeployment WithGitOpsMetadata(
        AppDeployment deployment,
        HelmReleaseMapping.DeploymentMetadata? metadata
    )
    {
        if (metadata is null || metadata.Org != deployment.Org || metadata.App != deployment.App)
        {
            return deployment;
        }

        return deployment with
        {
            SourceEnvironment = metadata.SourceEnvironment,
            BuildId = metadata.BuildId,
            IsGitOpsManaged = true,
        };
    }
}
