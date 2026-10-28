namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// The app's own inactivity undeploy settings, where null means inherited, and the org's effective settings that
/// the app inherits.
/// </summary>
public record AppSettingsResponse
{
    public bool? UndeployOnInactivity { get; init; }
    public int? InactivityPeriodDays { get; init; }
    public bool OrgUndeployOnInactivity { get; init; }
    public int OrgInactivityPeriodDays { get; init; }
}
