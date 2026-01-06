using WorkflowEngine.Models;

namespace WorkflowEngine.Api.Extensions;

internal static class WorkflowEngineItemStatusExtensions
{
    extension(PersistentItemStatus status)
    {
        public bool IsDone() =>
            status is PersistentItemStatus.Completed or PersistentItemStatus.Failed or PersistentItemStatus.Canceled;
    }
}
