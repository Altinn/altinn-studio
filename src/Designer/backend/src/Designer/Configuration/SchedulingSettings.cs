using System;

namespace Altinn.Studio.Designer.Configuration;

public class SchedulingSettings
{
    public bool UsePersistentScheduling { get; set; } = true;
    public bool AddHostedService { get; set; } = true;
    public InactivityUndeployJobTimeoutSettings InactivityUndeployJobTimeouts { get; set; } = new();
    public ChatInactivityCleanupSettings ChatInactivityCleanup { get; set; } = new();
    public RepositoryCleanupSettings RepositoryCleanup { get; set; } = new();
}

public class InactivityUndeployJobTimeoutSettings
{
    public int RootJobMinutes { get; set; } = 2;
    public int PerOrgJobMinutes { get; set; } = 15;
    public int PerAppJobMinutes { get; set; } = 10;

    public TimeSpan RootJobTimeout => TimeSpan.FromMinutes(RootJobMinutes);
    public TimeSpan PerOrgJobTimeout => TimeSpan.FromMinutes(PerOrgJobMinutes);
    public TimeSpan PerAppJobTimeout => TimeSpan.FromMinutes(PerAppJobMinutes);
}

public class ChatInactivityCleanupSettings
{
    public int RetentionDays { get; set; } = 90;
}

public class RepositoryCleanupSettings
{
    public bool Enabled { get; set; }
    public int RetentionDays { get; set; } = 30;
    public int MaxRepositoriesPerRun { get; set; } = 50;
    public int DeletionRetryAttempts { get; set; } = 3;
    public int DeletionRetryDelayMilliseconds { get; set; } = 1000;
    public int LockTimeoutSeconds { get; set; } = 5;
    public int JobTimeoutMinutes { get; set; } = 30;
    public int InitialDelayHours { get; set; } = 24;
    public string CronExpression { get; set; } = "0 45 * * * ?";

    public TimeSpan RetentionPeriod => TimeSpan.FromDays(RetentionDays);
    public TimeSpan LockTimeout => TimeSpan.FromSeconds(LockTimeoutSeconds);
    public TimeSpan JobTimeout => TimeSpan.FromMinutes(JobTimeoutMinutes);
    public TimeSpan DeletionRetryDelay => TimeSpan.FromMilliseconds(DeletionRetryDelayMilliseconds);
}
