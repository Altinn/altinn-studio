#nullable disable
using System;

namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// Request model for deploy event webhook
/// </summary>
public class DeployEventRequest
{
    /// <summary>
    /// The build ID from Azure DevOps pipeline that triggered the deployment
    /// </summary>
    public string BuildId { get; set; }

    /// <summary>
    /// A human-readable description of the event
    /// </summary>
    public string Message { get; set; }

    /// <summary>
    /// The timestamp when the event occurred
    /// </summary>
    public DateTimeOffset Timestamp { get; set; }

    /// <summary>
    /// A machine-readable event type (e.g., "InstallSucceeded", "InstallFailed", "UpgradeSucceeded", "UpgradeFailed")
    /// </summary>
    public string EventType { get; set; }
}
