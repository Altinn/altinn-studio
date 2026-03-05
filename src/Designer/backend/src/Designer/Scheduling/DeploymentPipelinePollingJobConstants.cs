#nullable disable
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Scheduling;

public static class DeploymentPipelinePollingJobConstants
{
    public static class Arguments
    {
        public const string Org = "org";
        public const string App = "app";
        public const string Developer = "developer";
        public const string WorkflowId = "workflowId";
        public const string ExternalBuildId = "externalBuildId";
        public const string PipelineType = "pipelineType";
        public const string Environment = "environment";
        public const string TraceParent = "traceparent";
        public const string TraceState = "tracestate";
    }

    public const string DeploymentPipelineGroup = nameof(DeploymentPipelineGroup);
    public const int PollingIntervalInSeconds = 10;

    public static string JobIdentity(AltinnRepoContext repoContext, string workflowId) =>
        $"{nameof(DeploymentPipelinePollingJob)}-{repoContext.Org}-{repoContext.Repo}-{workflowId}";

    public static string TriggerIdentity(AltinnRepoContext repoContext, string workflowId) =>
        $"{nameof(DeploymentPipelinePollingJob)}-{repoContext.Org}-{repoContext.Repo}-{workflowId}";
}
