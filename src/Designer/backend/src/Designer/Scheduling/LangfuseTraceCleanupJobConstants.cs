namespace Altinn.Studio.Designer.Scheduling;

public static class LangfuseTraceCleanupJobConstants
{
    public const string JobName = nameof(LangfuseTraceCleanupJob);
    public const string TriggerName = $"{JobName}Trigger";
    public const string CronScheduleNightly = "0 30 1 * * ?";
}
