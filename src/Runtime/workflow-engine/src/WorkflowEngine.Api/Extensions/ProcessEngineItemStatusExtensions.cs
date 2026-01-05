using WorkflowEngine.Models;

namespace Altinn.App.ProcessEngine.Extensions;

internal static class ProcessEngineItemStatusExtensions
{
    public static bool IsDone(this ProcessEngineItemStatus status) =>
        status
            is ProcessEngineItemStatus.Completed
                or ProcessEngineItemStatus.Failed
                or ProcessEngineItemStatus.Canceled;
}
