namespace StudioGateway.Api.Flux.Contracts;

/// <summary>
/// FluxEvent represents a notification event from Flux CD.
/// Based on https://github.com/fluxcd/pkg/blob/main/apis/event/v1beta1/event.go
/// </summary>
public record FluxEvent
{
    /// <summary>
    /// The object that this event is about.
    /// </summary>
    public required ObjectReference InvolvedObject { get; init; }

    /// <summary>
    /// Severity type of this event (trace, info, error).
    /// </summary>
    public required string Severity { get; init; }

    /// <summary>
    /// The time at which this event was recorded (RFC3339 format).
    /// </summary>
    public required DateTimeOffset Timestamp { get; init; }

    /// <summary>
    /// A human-readable description of this event.
    /// </summary>
    public required string Message { get; init; }

    /// <summary>
    /// A machine understandable reason for the event.
    /// </summary>
    public required string Reason { get; init; }

    /// <summary>
    /// Optional metadata for the event.
    /// </summary>
    public Dictionary<string, string>? Metadata { get; init; }

    /// <summary>
    /// Name of the controller that emitted this event.
    /// </summary>
    public required string ReportingController { get; init; }

    /// <summary>
    /// Optional ID of the controller instance.
    /// </summary>
    public string? ReportingInstance { get; init; }
}
