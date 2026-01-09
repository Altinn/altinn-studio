namespace WorkflowEngine.Models.Extensions;

public static class StepExtensions
{
    public static TaskStatus ExecutionStatus(this Step step) => step.ExecutionTask.Status();

    public static TaskStatus DatabaseUpdateStatus(this Step step) => step.DatabaseTask.Status();

    public static void CleanupDatabaseTask(this Step step)
    {
        step.DatabaseTask?.Dispose();
        step.DatabaseTask = null;
    }

    public static void CleanupExecutionTask(this Step step)
    {
        step.ExecutionTask?.Dispose();
        step.ExecutionTask = null;
    }

    public static bool IsReadyForExecution(this Step step, DateTimeOffset now)
    {
        if (step.BackoffUntil.HasValue && step.BackoffUntil > now)
            return false;

        if (step.StartTime.HasValue && step.StartTime > now)
            return false;

        return true;
    }

    public static bool IsReadyForExecution(this Step step, TimeProvider timeProvider) =>
        IsReadyForExecution(step, timeProvider.GetUtcNow());

    public static bool IsDone(this Step step) => step.Status.IsDone();
}
