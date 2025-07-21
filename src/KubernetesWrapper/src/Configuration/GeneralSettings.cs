using System.ComponentModel.DataAnnotations;

namespace KubernetesWrapper.Configuration;

public class GeneralSettings
{
    [Required]
    public required string ApplicationLogAnalyticsWorkspaceId { get; init; }

    [Required]
    public required string OperationalLogAnalyticsWorkspaceId { get; init; }
}
