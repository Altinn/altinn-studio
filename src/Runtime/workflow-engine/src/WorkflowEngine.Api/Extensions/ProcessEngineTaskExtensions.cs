namespace Altinn.App.ProcessEngine.Extensions;

internal static class ProcessEngineTaskExtensions
{
    public static ProcessEngineTaskStatus ExecutionStatus(this ProcessEngineTask task) =>
        task.ExecutionTask.ProcessEngineStatus();

    public static ProcessEngineTaskStatus DatabaseUpdateStatus(this ProcessEngineTask task) =>
        task.DatabaseTask.ProcessEngineStatus();

    public static void CleanupDatabaseTask(this ProcessEngineTask task)
    {
        task.DatabaseTask?.Dispose();
        task.DatabaseTask = null;
    }

    public static void CleanupExecutionTask(this ProcessEngineTask task)
    {
        task.ExecutionTask?.Dispose();
        task.ExecutionTask = null;
    }

    public static bool IsReadyForExecution(this ProcessEngineTask task, DateTimeOffset now)
    {
        if (task.BackoffUntil.HasValue && task.BackoffUntil > now)
            return false;

        if (task.StartTime.HasValue && task.StartTime > now)
            return false;

        return true;
    }

    public static bool IsReadyForExecution(this ProcessEngineTask task, TimeProvider timeProvider) =>
        IsReadyForExecution(task, timeProvider.GetUtcNow());

    public static bool IsDone(this ProcessEngineTask task) => task.Status.IsDone();
}
