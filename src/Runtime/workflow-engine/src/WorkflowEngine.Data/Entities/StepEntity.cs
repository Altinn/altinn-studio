using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;
using WorkflowEngine.Data.Abstractions;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Data.Entities;

[Table("Steps", Schema = Constants.SchemaNames.Engine)]
internal sealed class StepEntity : IHasCommonMetadata
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    public Guid Id { get; set; }

    [MaxLength(100)]
    public required string OperationId { get; set; }

    public required string IdempotencyKey { get; set; }

    [MaxLength(100)]
    public string? EngineTraceContext { get; set; }

    public PersistentItemStatus Status { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? UpdatedAt { get; set; }

    public int ProcessingOrder { get; set; }

    public int RequeueCount { get; set; }

    [Column(TypeName = "jsonb")]
    public string CommandJson { get; set; } = "{}";

    [Column(TypeName = "jsonb")]
    public string? RetryStrategyJson { get; set; }

    [Column(TypeName = "jsonb")]
    public string? MetadataJson { get; set; }

    public string? LastError { get; set; }

    [Column(TypeName = "jsonb")]
    public string? ErrorHistoryJson { get; set; }

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
            EngineTraceContext = step.EngineTraceContext,
            Status = step.Status,
            CreatedAt = step.CreatedAt,
            UpdatedAt = step.UpdatedAt,
            ProcessingOrder = step.ProcessingOrder,
            RequeueCount = step.RequeueCount,
            CommandJson = JsonSerializer.Serialize(step.Command, JsonOptions.Default),
            RetryStrategyJson =
                step.RetryStrategy != null ? JsonSerializer.Serialize(step.RetryStrategy, JsonOptions.Default) : null,
            MetadataJson = step.Metadata,
            LastError = step.LastError,
            ErrorHistoryJson =
                step.ErrorHistory.Count > 0 ? JsonSerializer.Serialize(step.ErrorHistory, JsonOptions.Default) : null,
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
            EngineTraceContext = EngineTraceContext,
            Status = Status,
            ProcessingOrder = ProcessingOrder,
            CreatedAt = CreatedAt,
            UpdatedAt = UpdatedAt,
            RequeueCount = RequeueCount,
            Command = command,
            RetryStrategy = retryStrategy,
            LastError = LastError,
            ErrorHistory =
                ErrorHistoryJson != null
                    ? JsonSerializer.Deserialize<List<ErrorEntry>>(ErrorHistoryJson, JsonOptions.Default) ?? []
                    : [],
            StateOut = StateOut,
        };
    }
}
