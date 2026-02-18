using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;

namespace WorkflowEngine.Api;

internal interface IWorkflowConcurrencyResolver
{
    bool CanAcceptWorkflow(WorkflowEnqueueRequest workflow, IEngineRepository repository);
}

internal class WorkflowConcurrencyResolver : IWorkflowConcurrencyResolver
{
    public bool CanAcceptWorkflow(WorkflowEnqueueRequest workflow, IEngineRepository repository)
    {
        var concurrencyLimit = workflow.Type switch
        {
            WorkflowType.AppProcessChange => ConcurrencyLimit.Single,
            _ => ConcurrencyLimit.Infinite,
        };

        if (concurrencyLimit == ConcurrencyLimit.Infinite)
            return true;

        // TODO: Run stored postgres proc and return result

        // Rules:
        // - At most ONE workflow of this type can execute at any given time
        // - If we have a workflow of this type currently processing, we can allow at most ONE dependent workflow
        //   of the same type to be added
        // - Dependent workflows must resolve to the same execution graph as the currently processing one, meaning
        //   the new workflow must have the other one as an ancestor -- as opposed to parallel branches on the family tree

        throw new NotImplementedException();
    }

    private enum ConcurrencyLimit
    {
        Single,
        Infinite,
    }
}
