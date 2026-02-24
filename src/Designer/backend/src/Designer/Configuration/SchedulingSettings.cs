using System;

namespace Altinn.Studio.Designer.Configuration;

public class SchedulingSettings
{
    public bool UsePersistentScheduling { get; set; } = true;
    public bool AddHostedService { get; set; } = true;
    public InactivityUndeployJobTimeoutSettings InactivityUndeployJobTimeouts { get; set; } = new();
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
