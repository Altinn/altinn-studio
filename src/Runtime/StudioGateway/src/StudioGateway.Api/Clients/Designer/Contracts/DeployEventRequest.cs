namespace StudioGateway.Api.Clients.Designer.Contracts;

/// <summary>
/// Request model for deploy event to be sent to Designer
/// </summary>
internal sealed record DeployEventRequest
{
    /// <summary>
    /// The build ID from Azure DevOps pipeline that triggered the deployment
    /// </summary>
    public required string BuildId { get; init; }

    /// <summary>
    /// A human-readable description of the event
    /// </summary>
    public required string Message { get; init; }

    /// <summary>
    /// The timestamp when the event occurred
    /// </summary>
    public required DateTimeOffset Timestamp { get; init; }

    /// <summary>
    /// A machine-readable event type (e.g., "InstallSucceeded", "InstallFailed", "UpgradeSucceeded", "UpgradeFailed")
    /// </summary>
    public required string EventType { get; init; }
}
