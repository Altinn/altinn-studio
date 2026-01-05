using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Entities;

[Table("process_engine_tasks")]
internal sealed class ProcessEngineTaskEntity : IWithCommonJobMeta
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [MaxLength(500)]
    public required string Key { get; set; }

    public ProcessEngineItemStatus Status { get; set; }

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

    public static ProcessEngineTaskEntity FromDomainModel(ProcessEngineTask task) =>
        new()
        {
            Id = task.DatabaseId,
            Key = task.Key,
            Status = task.Status,
            ProcessingOrder = task.ProcessingOrder,
            StartTime = task.StartTime,
            BackoffUntil = task.BackoffUntil,
            RequeueCount = task.RequeueCount,
            ActorUserIdOrOrgNumber = task.Actor.UserIdOrOrgNumber,
            ActorLanguage = task.Actor.Language,
            CommandJson = JsonSerializer.Serialize(task.Command),
            RetryStrategyJson = task.RetryStrategy != null ? JsonSerializer.Serialize(task.RetryStrategy) : null,
        };

    public ProcessEngineTask ToDomainModel()
    {
        var command =
            JsonSerializer.Deserialize<ProcessEngineCommand>(CommandJson)
            ?? throw new InvalidOperationException("Failed to deserialize CommandJson");
        var retryStrategy =
            RetryStrategyJson != null
                ? JsonSerializer.Deserialize<ProcessEngineRetryStrategy>(RetryStrategyJson)
                : null;

        return new ProcessEngineTask
        {
            DatabaseId = Id,
            Key = Key,
            Status = Status,
            ProcessingOrder = ProcessingOrder,
            StartTime = StartTime,
            BackoffUntil = BackoffUntil,
            RequeueCount = RequeueCount,
            Actor = new ProcessEngineActor { UserIdOrOrgNumber = ActorUserIdOrOrgNumber, Language = ActorLanguage },
            Command = command,
            RetryStrategy = retryStrategy,
        };
    }
}
