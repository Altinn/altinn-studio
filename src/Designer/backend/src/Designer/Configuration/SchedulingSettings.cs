using System;
using System.Linq;

namespace Altinn.Studio.Designer.Configuration;

public class SchedulingSettings
{
    public bool UsePersistentScheduling { get; set; } = true;
    public bool AddHostedService { get; set; } = true;
    public InactivityUndeployJobTimeoutSettings InactivityUndeployJobTimeouts { get; set; } = new();
    public InactivityUndeployEnforcementSettings InactivityUndeploy { get; set; } = new();
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

public enum InactivityUndeployMode
{
    /// <summary>
    /// Evaluates all orgs but undeploys apps only for the enforced orgs.
    /// </summary>
    DryRun,

    /// <summary>
    /// Undeploys inactive apps for all orgs.
    /// </summary>
    Enforce,
}

public class InactivityUndeployEnforcementSettings
{
    public InactivityUndeployMode Mode { get; set; } = InactivityUndeployMode.DryRun;

    /// <summary>
    /// Orgs whose inactive apps are undeployed in <see cref="InactivityUndeployMode.DryRun"/> mode as well. The
    /// default list is in appsettings.json, as the configuration binder adds to a default set here instead of
    /// replacing it.
    /// </summary>
    public string[] EnforcedOrgs { get; set; } = [];

    /// <summary>
    /// The most system undeploys in any 24 hours, across all orgs. Each undeploy queues an Azure DevOps build.
    /// </summary>
    public int MaxUndeploysPerDay { get; set; } = 50;

    public bool IsEnforced(string org) =>
        Mode == InactivityUndeployMode.Enforce || EnforcedOrgs.Contains(org, StringComparer.OrdinalIgnoreCase);
}

public class ChatInactivityCleanupSettings
{
    public int RetentionDays { get; set; } = 90;
}

public class RepositoryCleanupSettings
{
    public bool Enabled { get; set; }
    public int RetentionDays { get; set; } = 90;
    public int MaxRepositoriesPerRun { get; set; } = 200;
    public int DeletionRetryAttempts { get; set; } = 3;
    public int DeletionRetryDelayMilliseconds { get; set; } = 1000;
    public int LockTimeoutSeconds { get; set; } = 5;
    public int JobTimeoutMinutes { get; set; } = 120;
    public string CronExpression { get; set; } = "0 0 0 * * ?";

    public TimeSpan RetentionPeriod => TimeSpan.FromDays(RetentionDays);
    public TimeSpan LockTimeout => TimeSpan.FromSeconds(LockTimeoutSeconds);
    public TimeSpan JobTimeout => TimeSpan.FromMinutes(JobTimeoutMinutes);
    public TimeSpan DeletionRetryDelay => TimeSpan.FromMilliseconds(DeletionRetryDelayMilliseconds);
}
