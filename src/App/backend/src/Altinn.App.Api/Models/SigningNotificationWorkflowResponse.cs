namespace Altinn.App.Api.Models;

/// <summary>Execution status for one signee's notification in the current signing task entry.</summary>
public sealed record SigningNotificationWorkflowResponse
{
    /// <summary>The workflow to resume after correcting a failure.</summary>
    public required Guid WorkflowId { get; init; }

    /// <summary>The opaque recipient identity frozen during this task entry.</summary>
    public required Guid SigneeId { get; init; }

    /// <summary>The recipient's party id.</summary>
    public required int PartyId { get; init; }

    /// <summary>The workflow engine status, such as Requeued, Completed or Failed.</summary>
    public required string Status { get; init; }

    /// <summary>The retry count for this notification step.</summary>
    public required int RetryCount { get; init; }

    /// <summary>A stable failure category, without dependency response bodies or recipient identifiers.</summary>
    public string? ErrorCode { get; init; }
}
