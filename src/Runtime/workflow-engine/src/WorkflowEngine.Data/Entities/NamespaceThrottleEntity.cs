using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Entities;

/// <summary>
/// Per-namespace circuit breaker state for failure-storm throttling. One row per namespace that
/// has tripped the breaker; the throttle sweep is the sole writer. Closed rows linger for a grace
/// period (instead of being deleted) so stragglers parked by stale replica snapshots can still be
/// cleared by the sweep.
/// </summary>
[Table("namespace_throttles", Schema = SchemaNames.Engine)]
internal sealed class NamespaceThrottleEntity
{
    [Key]
    [MaxLength(200)]
    public required string Namespace { get; set; }

    public NamespaceThrottleState State { get; set; }

    public DateTimeOffset TrippedAt { get; set; }

    public TimeSpan CurrentWindow { get; set; }

    [Column(TypeName = "jsonb")]
    public List<ThrottleCanary>? Canaries { get; set; }

    public DateTimeOffset? LastEvaluatedAt { get; set; }

    public int LastRequeuedCount { get; set; }

    public int LastActiveCount { get; set; }

    public DateTimeOffset? UpdatedAt { get; set; }

    public static NamespaceThrottleEntity FromDomainModel(NamespaceThrottle throttle) =>
        new()
        {
            Namespace = throttle.Namespace,
            State = throttle.State,
            TrippedAt = throttle.TrippedAt,
            CurrentWindow = throttle.CurrentWindow,
            Canaries = throttle.Canaries.Count > 0 ? [.. throttle.Canaries] : null,
            LastEvaluatedAt = throttle.LastEvaluatedAt,
            LastRequeuedCount = throttle.LastRequeuedCount,
            LastActiveCount = throttle.LastActiveCount,
            UpdatedAt = throttle.UpdatedAt,
        };

    public NamespaceThrottle ToDomainModel() =>
        new()
        {
            Namespace = Namespace,
            State = State,
            TrippedAt = TrippedAt,
            CurrentWindow = CurrentWindow,
            Canaries = Canaries ?? [],
            LastEvaluatedAt = LastEvaluatedAt,
            LastRequeuedCount = LastRequeuedCount,
            LastActiveCount = LastActiveCount,
            UpdatedAt = UpdatedAt,
        };
}
