using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Data.Entities;

[Table("steps", Schema = SchemaNames.Engine)]
internal sealed class StepEntity
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    public Guid Id { get; set; }

    [MaxLength(100)]
    public required string OperationId { get; set; }

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
    public Dictionary<string, string>? Labels { get; set; }

    [Column(TypeName = "jsonb")]
    public List<ErrorEntry>? ErrorHistory { get; set; }

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
            EngineTraceContext = step.EngineTraceContext,
            Status = step.Status,
            CreatedAt = step.CreatedAt,
            UpdatedAt = step.UpdatedAt,
            ProcessingOrder = step.ProcessingOrder,
            RequeueCount = step.RequeueCount,
            CommandJson = JsonSerializer.Serialize(step.Command, JsonOptions.Default),
            RetryStrategyJson =
                step.RetryStrategy != null ? JsonSerializer.Serialize(step.RetryStrategy, JsonOptions.Default) : null,
            Labels = step.Labels,
            ErrorHistory = step.ErrorHistory.Count > 0 ? step.ErrorHistory : null,
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
            EngineTraceContext = EngineTraceContext,
            Status = Status,
            ProcessingOrder = ProcessingOrder,
            CreatedAt = CreatedAt,
            UpdatedAt = UpdatedAt,
            RequeueCount = RequeueCount,
            Command = command,
            RetryStrategy = retryStrategy,
            Labels = Labels,
            ErrorHistory = ErrorHistory ?? [],
            StateOut = StateOut,
        };
    }
}
