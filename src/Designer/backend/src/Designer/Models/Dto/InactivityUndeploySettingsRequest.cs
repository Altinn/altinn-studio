using System.ComponentModel.DataAnnotations;
using Altinn.Studio.Designer.Services.Implementation;

namespace Altinn.Studio.Designer.Models.Dto;

public record InactivityUndeploySettingsRequest
{
    [Required]
    public bool? UndeployOnInactivity { get; init; }

    [Required]
    [Range(
        InactivityUndeploySettingsResolver.MinimumInactivityPeriodDays,
        InactivityUndeploySettingsResolver.MaximumInactivityPeriodDays
    )]
    public int? InactivityPeriodDays { get; init; }
}
