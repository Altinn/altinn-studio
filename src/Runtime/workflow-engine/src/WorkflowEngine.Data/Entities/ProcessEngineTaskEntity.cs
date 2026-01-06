using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;
using WorkflowEngine.Data.Abstractions;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Entities;

[Table("process_engine_tasks")]
internal sealed class ProcessEngineTaskEntity : IHasCommonMetadata
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [MaxLength(500)]
    public required string Key { get; set; }

    public PersistentItemStatus Status { get; set; }

    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public DateTimeOffset CreatedAt { get; set; }

    [DatabaseGenerated(DatabaseGeneratedOption.Computed)]
    public DateTimeOffset? UpdatedAt { get; set; }

    public int ProcessingOrder { get; set; }

    public DateTimeOffset? StartTime { get; set; }

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
    public ProcessEngineJobEntity? Job { get; set; }

    public static ProcessEngineTaskEntity FromDomainModel(Step step) =>
        new()
        {
            Id = step.DatabaseId,
            Key = step.Key,
            Status = step.Status,
            ProcessingOrder = step.ProcessingOrder,
            StartTime = step.StartTime,
            BackoffUntil = step.BackoffUntil,
            RequeueCount = step.RequeueCount,
            ActorUserIdOrOrgNumber = step.Actor.UserIdOrOrgNumber,
            ActorLanguage = step.Actor.Language,
            CommandJson = JsonSerializer.Serialize(step.Command),
            RetryStrategyJson = step.RetryStrategy != null ? JsonSerializer.Serialize(step.RetryStrategy) : null,
        };

    public Step ToDomainModel()
    {
        var command =
            JsonSerializer.Deserialize<Command>(CommandJson)
            ?? throw new InvalidOperationException("Failed to deserialize CommandJson");
        var retryStrategy =
            RetryStrategyJson != null ? JsonSerializer.Deserialize<RetryStrategy>(RetryStrategyJson) : null;

        return new Step
        {
            DatabaseId = Id,
            Key = Key,
            Status = Status,
            ProcessingOrder = ProcessingOrder,
            StartTime = StartTime,
            BackoffUntil = BackoffUntil,
            RequeueCount = RequeueCount,
            Actor = new Actor { UserIdOrOrgNumber = ActorUserIdOrOrgNumber, Language = ActorLanguage },
            Command = command,
            RetryStrategy = retryStrategy,
        };
    }
}
