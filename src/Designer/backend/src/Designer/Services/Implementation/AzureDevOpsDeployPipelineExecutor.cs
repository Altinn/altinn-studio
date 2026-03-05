#nullable disable
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Models;

namespace Altinn.Studio.Designer.Services.Implementation;

public class AzureDevOpsDeployPipelineExecutor(
    IAzureDevOpsBuildClient azureDevOpsBuildClient,
    AzureDevOpsSettings azureDevOpsSettings
) : IDeployPipelineExecutor
{
    public Task<Build> QueueAsync(DeployPipelineQueueRequest request, CancellationToken cancellationToken)
    {
        QueueBuildParameters queueBuildParameters = new()
        {
            AppCommitId = request.AppCommitId,
            AppOwner = request.Org,
            AppRepo = request.App,
            AppEnvironment = request.Environment,
            Hostname = request.Hostname,
            TagName = request.TagName,
            GiteaEnvironment = request.GiteaEnvironment,
            AppDeployToken = request.AppDeployToken,
            AltinnStudioHostname = request.AltinnStudioHostname,
            TraceParent = request.TraceParent,
            TraceState = request.TraceState,
        };
        if (request.ShouldPushSyncRootImage)
        {
            queueBuildParameters.PushSyncRootGitopsImage = "true";
        }

        int definitionId = request.UseGitOpsDefinition
            ? azureDevOpsSettings.GitOpsManagerDefinitionId
            : azureDevOpsSettings.DeployDefinitionId;

        return azureDevOpsBuildClient.QueueAsync(queueBuildParameters, definitionId, cancellationToken);
    }
}
