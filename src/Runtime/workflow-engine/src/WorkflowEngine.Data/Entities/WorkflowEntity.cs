using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;
using WorkflowEngine.Data.Abstractions;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Entities;

[Table("Workflows")]
internal sealed class WorkflowEntity : IHasCommonMetadata
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    public Guid Id { get; set; }

    [MaxLength(100)]
    public required string OperationId { get; set; }

    public required string IdempotencyKey { get; set; }

    [MaxLength(200)]
    public required string Namespace { get; set; }

    public PersistentItemStatus Status { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? StartAt { get; set; }

    public DateTimeOffset? UpdatedAt { get; set; }

    public DateTimeOffset? BackoffUntil { get; set; }

    [Column(TypeName = "jsonb")]
    public Dictionary<string, string>? Labels { get; set; }

    public Guid? CorrelationId { get; set; }

    [MaxLength(100)]
    public string? DistributedTraceContext { get; set; }

    [MaxLength(100)]
    public string? EngineTraceContext { get; set; }

    [Column(TypeName = "jsonb")]
    public string? ContextJson { get; set; }

    [Column(TypeName = "jsonb")]
    public string? MetadataJson { get; set; }

    public string? InitialState { get; set; }

    public ICollection<StepEntity> Steps { get; set; } = [];
    public ICollection<WorkflowEntity>? Dependencies { get; set; }
    public ICollection<WorkflowEntity>? Links { get; set; }

    public static WorkflowEntity FromDomainModel(Workflow workflow)
    {
        var entity = new WorkflowEntity
        {
            Id = workflow.DatabaseId,
            CorrelationId = workflow.CorrelationId,
            OperationId = workflow.OperationId,
            IdempotencyKey = workflow.IdempotencyKey,
            Namespace = workflow.Namespace,
            CreatedAt = workflow.CreatedAt,
            StartAt = workflow.StartAt,
            UpdatedAt = workflow.UpdatedAt,
            BackoffUntil = workflow.BackoffUntil,
            Status = workflow.Status,
            Labels = workflow.Labels,
            ContextJson = workflow.Context?.GetRawText(),
            DistributedTraceContext = workflow.DistributedTraceContext,
            MetadataJson = workflow.Metadata,
            EngineTraceContext = workflow.EngineTraceContext,
            InitialState = workflow.InitialState,
            Steps = workflow.Steps.OrderBy(x => x.ProcessingOrder).Select(StepEntity.FromDomainModel).ToList(),
            Dependencies = workflow.Dependencies?.Select(FromDomainModel).ToList(),
            Links = workflow.Links?.Select(FromDomainModel).ToList(),
        };

        foreach (var step in entity.Steps)
        {
            step.JobId = entity.Id;
        }

        return entity;
    }

    public Workflow ToDomainModel() =>
        new()
        {
            DatabaseId = Id,
            CorrelationId = CorrelationId,
            IdempotencyKey = IdempotencyKey,
            OperationId = OperationId,
            Namespace = Namespace,
            CreatedAt = CreatedAt,
            StartAt = StartAt,
            UpdatedAt = UpdatedAt,
            BackoffUntil = BackoffUntil,
            Status = Status,
            Labels = Labels,
            Context =
                ContextJson != null ? JsonSerializer.Deserialize<JsonElement>(ContextJson, JsonOptions.Default) : null,
            DistributedTraceContext = DistributedTraceContext,
            Metadata = MetadataJson,
            EngineTraceContext = EngineTraceContext,
            InitialState = InitialState,
            Steps = Steps.OrderBy(x => x.ProcessingOrder).Select(x => x.ToDomainModel()).ToList(),
            Dependencies = Dependencies?.Select(x => x.ToDomainModel()).ToList(),
            Links = Links?.Select(x => x.ToDomainModel()).ToList(),
        };
}
