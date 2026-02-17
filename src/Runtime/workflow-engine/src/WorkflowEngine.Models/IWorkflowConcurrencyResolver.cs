namespace WorkflowEngine.Models;

public interface IWorkflowConcurrencyResolver
{
    bool CanAccept(WorkflowType type, InstanceInformation instance, IEnumerable<Workflow> existingWorkflows);
}
