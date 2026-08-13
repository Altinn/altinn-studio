using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// Public representation of one namespace's failure-storm circuit breaker state
/// (see <see cref="NamespaceThrottle"/>), returned by the throttle observability and
/// manual-override endpoints.
/// </summary>
public sealed record NamespaceThrottleResponse
{
    /// <summary>
    /// The namespace this breaker guards.
    /// </summary>
    [JsonPropertyName("namespace")]
    public required string Namespace { get; init; }

    /// <summary>
    /// Current breaker state. A <see cref="NamespaceThrottleState.Closed"/> row lingers for a
    /// grace period before deletion, so recently closed breakers remain visible here.
    /// </summary>
    [JsonPropertyName("state")]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public required NamespaceThrottleState State { get; init; }

    /// <summary>
    /// When the breaker last tripped.
    /// </summary>
    [JsonPropertyName("trippedAt")]
    public required DateTimeOffset TrippedAt { get; init; }

    /// <summary>
    /// The current throttle window applied to parked workflows.
    /// </summary>
    [JsonPropertyName("currentWindow")]
    public required TimeSpan CurrentWindow { get; init; }

    /// <summary>
    /// Number of canary workflows currently probing recovery on the normal retry schedule.
    /// </summary>
    [JsonPropertyName("canaryCount")]
    public required int CanaryCount { get; init; }

    /// <summary>
    /// When the sweep last evaluated this namespace.
    /// </summary>
    [JsonPropertyName("lastEvaluatedAt")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public DateTimeOffset? LastEvaluatedAt { get; init; }

    /// <summary>
    /// The namespace's <c>Requeued</c> workflow count observed at the last evaluation.
    /// </summary>
    [JsonPropertyName("lastRequeuedCount")]
    public required int LastRequeuedCount { get; init; }

    /// <summary>
    /// The namespace's active (incomplete) workflow count observed at the last evaluation.
    /// </summary>
    [JsonPropertyName("lastActiveCount")]
    public required int LastActiveCount { get; init; }

    /// <summary>
    /// Last time the state row was updated.
    /// </summary>
    [JsonPropertyName("updatedAt")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public DateTimeOffset? UpdatedAt { get; init; }

    /// <summary>
    /// Projects a <see cref="NamespaceThrottle"/> to its public response representation.
    /// </summary>
    public static NamespaceThrottleResponse FromThrottle(NamespaceThrottle throttle) =>
        new()
        {
            Namespace = throttle.Namespace,
            State = throttle.State,
            TrippedAt = throttle.TrippedAt,
            CurrentWindow = throttle.CurrentWindow,
            CanaryCount = throttle.Canaries.Count,
            LastEvaluatedAt = throttle.LastEvaluatedAt,
            LastRequeuedCount = throttle.LastRequeuedCount,
            LastActiveCount = throttle.LastActiveCount,
            UpdatedAt = throttle.UpdatedAt,
        };
}
