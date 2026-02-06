namespace WorkflowEngine.Models.Extensions;

public static class TaskExtensions
{
    public static TaskStatus Status(this Task? task)
    {
        return task switch
        {
            null => TaskStatus.None,
            { IsCompleted: false } => TaskStatus.Started,
            { IsFaulted: true } => TaskStatus.Failed,
            { IsCompleted: true } => TaskStatus.Finished,
        };
    }
}
