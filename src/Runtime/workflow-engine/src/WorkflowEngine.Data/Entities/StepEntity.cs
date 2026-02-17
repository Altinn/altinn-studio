using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;
using WorkflowEngine.Data.Abstractions;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Data.Entities;

[Table("Steps")]
internal sealed class StepEntity : IHasCommonMetadata
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [MaxLength(500)]
    public required string IdempotencyKey { get; set; }

    [MaxLength(100)]
    public required string OperationId { get; set; }

    public PersistentItemStatus Status { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? UpdatedAt { get; set; }

    public int ProcessingOrder { get; set; }

    public DateTimeOffset? BackoffUntil { get; set; }

    public int RequeueCount { get; set; }

    [MaxLength(50)]
    public required string ActorUserIdOrOrgNumber { get; set; }

    [MaxLength(10)]
    public string? ActorLanguage { get; set; }

    [Column(TypeName = "jsonb")]
    public string CommandJson { get; set; } = "{}";

    [Column(TypeName = "jsonb")]
    public string? RetryStrategyJson { get; set; }

    // Foreign key and navigation property
    [ForeignKey(nameof(Job))]
    public long JobId { get; set; }
    public WorkflowEntity? Job { get; set; }

    public static StepEntity FromDomainModel(Step step)
    {
        return new StepEntity
        {
            Id = step.DatabaseId,
            IdempotencyKey = step.IdempotencyKey,
            OperationId = step.OperationId,
            Status = step.Status,
            CreatedAt = step.CreatedAt,
            UpdatedAt = step.UpdatedAt,
            ProcessingOrder = step.ProcessingOrder,
            BackoffUntil = step.BackoffUntil,
            RequeueCount = step.RequeueCount,
            ActorUserIdOrOrgNumber = step.Actor.UserIdOrOrgNumber,
            ActorLanguage = step.Actor.Language,
            CommandJson = JsonSerializer.Serialize(step.Command),
            RetryStrategyJson = step.RetryStrategy != null ? JsonSerializer.Serialize(step.RetryStrategy) : null,
        };
    }

    public Step ToDomainModel(string? traceContext = null)
    {
        var command =
            JsonSerializer.Deserialize<Command>(CommandJson)
            ?? throw new InvalidOperationException("Failed to deserialize CommandJson");
        var retryStrategy =
            RetryStrategyJson != null ? JsonSerializer.Deserialize<RetryStrategy>(RetryStrategyJson) : null;

        return new Step
        {
            DatabaseId = Id,
            IdempotencyKey = IdempotencyKey,
            OperationId = OperationId,
            Status = Status,
            ProcessingOrder = ProcessingOrder,
            CreatedAt = CreatedAt,
            UpdatedAt = UpdatedAt,
            BackoffUntil = BackoffUntil,
            RequeueCount = RequeueCount,
            Actor = new Actor { UserIdOrOrgNumber = ActorUserIdOrOrgNumber, Language = ActorLanguage },
            Command = command,
            RetryStrategy = retryStrategy,
            DistributedTraceContext = traceContext,
        };
    }
}
