using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Scheduling;

public static class DeploymentDispatchJobConstants
{
    public static class Arguments
    {
        public const string Org = "org";
        public const string WorkflowId = "workflowId";
        public const string TraceParent = "traceparent";
        public const string TraceState = "tracestate";
    }

    public const string DeploymentDispatchGroup = nameof(DeploymentDispatchGroup);

    public static string JobIdentity(AltinnRepoContext repoContext, string workflowId) =>
        $"{nameof(DeploymentDispatchJob)}-{repoContext.Org}-{repoContext.Repo}-{workflowId}";

    public static string TriggerIdentity(AltinnRepoContext repoContext, string workflowId) =>
        $"{nameof(DeploymentDispatchJob)}-{repoContext.Org}-{repoContext.Repo}-{workflowId}";
}
