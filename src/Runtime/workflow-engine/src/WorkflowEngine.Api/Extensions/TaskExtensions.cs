using Task = System.Threading.Tasks.Task;
using TaskStatus = WorkflowEngine.Models.TaskStatus;

namespace WorkflowEngine.Api.Extensions;

internal static class TaskExtensions
{
    public static TaskStatus Status(this Task? task)
    {
        return task switch
        {
            null => TaskStatus.None,
            { IsCompleted: false } => TaskStatus.Started,
            { IsCompleted: true } => TaskStatus.Finished,
        };
    }
}
