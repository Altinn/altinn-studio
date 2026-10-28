using System.ComponentModel.DataAnnotations;
using Altinn.Studio.Designer.Services.Implementation;

namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// The app's own inactivity undeploy settings. A null value inherits the org's.
/// </summary>
public record AppSettingsUpsertRequest
{
    public bool? UndeployOnInactivity { get; init; }

    [Range(
        InactivityUndeploySettingsResolver.MinimumInactivityPeriodDays,
        InactivityUndeploySettingsResolver.MaximumInactivityPeriodDays
    )]
    public int? InactivityPeriodDays { get; init; }
}
