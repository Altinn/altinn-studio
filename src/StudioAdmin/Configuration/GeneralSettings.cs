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
}
