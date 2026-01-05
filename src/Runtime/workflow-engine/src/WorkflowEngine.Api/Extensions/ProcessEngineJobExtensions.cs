using WorkflowEngine.Models;

namespace Altinn.App.ProcessEngine.Extensions;

internal static class ProcessEngineJobExtensions
{
    public static bool IsDone(this ProcessEngineJob job) => job.Status.IsDone();

    public static ProcessEngineTaskStatus DatabaseUpdateStatus(this ProcessEngineJob job) =>
        job.DatabaseTask.ProcessEngineStatus();

    public static void CleanupDatabaseTask(this ProcessEngineJob job)
    {
        job.DatabaseTask?.Dispose();
        job.DatabaseTask = null;
    }

    public static IEnumerable<ProcessEngineTask> OrderedTasks(this ProcessEngineJob job) =>
        job.Tasks.OrderBy(t => t.ProcessingOrder);

    public static IEnumerable<ProcessEngineTask> OrderedIncompleteTasks(this ProcessEngineJob job) =>
        job.Tasks.Where(x => !x.IsDone()).OrderBy(x => x.ProcessingOrder);

    public static ProcessEngineItemStatus OverallStatus(this ProcessEngineJob job)
    {
        if (job.Tasks.All(t => t.Status == ProcessEngineItemStatus.Completed))
            return ProcessEngineItemStatus.Completed;

        if (job.Tasks.Any(t => t.Status == ProcessEngineItemStatus.Failed))
            return ProcessEngineItemStatus.Failed;

        if (job.Tasks.Any(t => t.Status == ProcessEngineItemStatus.Canceled))
            return ProcessEngineItemStatus.Canceled;

        return job.Tasks.Any(t => t.Status != ProcessEngineItemStatus.Enqueued)
            ? ProcessEngineItemStatus.Processing
            : ProcessEngineItemStatus.Enqueued;
    }
}
