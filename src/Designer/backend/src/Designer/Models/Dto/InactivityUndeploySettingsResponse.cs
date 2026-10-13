namespace Altinn.Studio.Designer.Models.Dto;

public record InactivityUndeploySettingsResponse
{
    public bool UndeployOnInactivity { get; init; }
    public int InactivityPeriodDays { get; init; }
}
