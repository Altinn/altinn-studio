using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;
using WorkflowEngine.Data.Abstractions;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Data.Entities;

[Table("Steps")]
internal sealed class StepEntity : IHasCommonMetadata
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    public Guid Id { get; set; }

    [MaxLength(100)]
    public required string OperationId { get; set; }

    public required string IdempotencyKey { get; set; }

    public PersistentItemStatus Status { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? UpdatedAt { get; set; }

    public int ProcessingOrder { get; set; }

    public DateTimeOffset? BackoffUntil { get; set; }

    public int RequeueCount { get; set; }

    [Column(TypeName = "jsonb")]
    public string CommandJson { get; set; } = "{}";

    [Column(TypeName = "jsonb")]
    public string? RetryStrategyJson { get; set; }

    [Column(TypeName = "jsonb")]
    public string? MetadataJson { get; set; }

    public string? StateOut { get; set; }

    // Foreign key and navigation property
    [ForeignKey(nameof(Job))]
    public Guid JobId { get; set; }
    public WorkflowEntity? Job { get; set; }

    public static StepEntity FromDomainModel(Step step)
    {
        return new StepEntity
        {
            Id = step.DatabaseId,
            OperationId = step.OperationId,
            IdempotencyKey = step.IdempotencyKey,
            Status = step.Status,
            CreatedAt = step.CreatedAt,
            UpdatedAt = step.UpdatedAt,
            ProcessingOrder = step.ProcessingOrder,
            BackoffUntil = step.BackoffUntil,
            RequeueCount = step.RequeueCount,
            CommandJson = JsonSerializer.Serialize(step.Command, JsonOptions.Default),
            RetryStrategyJson =
                step.RetryStrategy != null ? JsonSerializer.Serialize(step.RetryStrategy, JsonOptions.Default) : null,
            MetadataJson = step?.Metadata,
            StateOut = step.StateOut,
        };
    }

    public Step ToDomainModel()
    {
        var command =
            JsonSerializer.Deserialize<CommandDefinition>(CommandJson, JsonOptions.Default)
            ?? throw new InvalidOperationException("Failed to deserialize CommandJson");
        var retryStrategy =
            RetryStrategyJson != null
                ? JsonSerializer.Deserialize<RetryStrategy>(RetryStrategyJson, JsonOptions.Default)
                : null;

        return new Step
        {
            DatabaseId = Id,
            OperationId = OperationId,
            IdempotencyKey = IdempotencyKey,
            Status = Status,
            ProcessingOrder = ProcessingOrder,
            CreatedAt = CreatedAt,
            UpdatedAt = UpdatedAt,
            BackoffUntil = BackoffUntil,
            RequeueCount = RequeueCount,
            Command = command,
            RetryStrategy = retryStrategy,
            StateOut = StateOut,
        };
    }
}
