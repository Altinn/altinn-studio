namespace Altinn.App.ProcessEngine.Extensions;

internal static class TaskExtensions
{
    public static ProcessEngineTaskStatus ProcessEngineStatus(this Task? task)
    {
        return task switch
        {
            null => ProcessEngineTaskStatus.None,
            { IsCompleted: false } => ProcessEngineTaskStatus.Started,
            { IsCompleted: true } => ProcessEngineTaskStatus.Finished,
        };
    }
}
