using WorkflowEngine.Models;

namespace WorkflowEngine.Api;

internal class WorkflowConcurrencyResolver : IWorkflowConcurrencyResolver
{
    public bool CanAccept(WorkflowType type, InstanceInformation instance, IEnumerable<Workflow> existingWorkflows)
    {
        var maxConcurrent = GetMaxConcurrent(type);
        if (maxConcurrent is null)
            return true;

        var activeCount = existingWorkflows.Count(w => w.Type == type && w.InstanceInformation == instance);

        return activeCount < maxConcurrent;
    }

    private static int? GetMaxConcurrent(WorkflowType type) =>
        type switch
        {
            WorkflowType.AppProcessChange => 1,
            _ => null,
        };
}
