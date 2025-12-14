using System;
using System.ComponentModel.DataAnnotations;

namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// Request model for deploy event webhook
/// </summary>
public class DeployEventRequest
{
    /// <summary>
    /// The build ID from Azure DevOps pipeline that triggered the deployment.
    /// Can be null for uninstall events when the HelmRelease has been deleted.
    /// </summary>
    public string? BuildId { get; set; }

    /// <summary>
    /// A human-readable description of the event
    /// </summary>
    [Required]
    public required string Message { get; set; }

    /// <summary>
    /// The timestamp when the event occurred
    /// </summary>
    [Required]
    public required DateTimeOffset Timestamp { get; set; }

    /// <summary>
    /// A machine-readable event type (e.g., "InstallSucceeded", "InstallFailed", "UpgradeSucceeded", "UpgradeFailed")
    /// </summary>
    [Required]
    public required string EventType { get; set; }

    /// <summary>
    /// The target environment for the deployment (e.g., "at22", "tt02", "production").
    /// </summary>
    [Required]
    public required string Environment { get; set; }
}
