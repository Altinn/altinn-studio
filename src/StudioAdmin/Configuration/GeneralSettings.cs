using System.ComponentModel.DataAnnotations;

namespace Altinn.Studio.Admin.Configuration;

public class GeneralSettings
{
    [Required]
    [Url]
    public required string EnvironmentsUrl { get; init; }

    [Required]
    [Url]
    public required string OrganizationsUrl { get; init; }

    [Required]
    public required string ApplicationLogAnalyticsWorkspaceId { get; init; }

    [Required]
    public required string OperationalLogAnalyticsWorkspaceId { get; init; }

}
