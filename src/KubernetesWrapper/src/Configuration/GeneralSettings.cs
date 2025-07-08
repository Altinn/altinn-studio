using System.ComponentModel.DataAnnotations;

namespace KubernetesWrapper.Configuration;

public class GeneralSettings
{
    [Required]
    public required string ApplicationLawWorkspaceId { get; init; }

    [Required]
    public required string OperationalLawWorkspaceId { get; init; }
}
