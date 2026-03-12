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
    [Column("TenantId")]
    public required string Namespace { get; set; }

    public PersistentItemStatus Status { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? StartAt { get; set; }

    public DateTimeOffset? UpdatedAt { get; set; }

    [Column(TypeName = "jsonb")]
    public string? LabelsJson { get; set; }

    [Column(TypeName = "jsonb")]
    public string? ContextJson { get; set; }

    [MaxLength(100)]
    public string? TraceContext { get; set; }

    [Column(TypeName = "jsonb")]
    public string? MetadataJson { get; set; }

    [MaxLength(100)]
    public string? EngineTraceId { get; set; }

    public string? InitialState { get; set; }

    public ICollection<StepEntity> Steps { get; set; } = [];
    public ICollection<WorkflowEntity>? Dependencies { get; set; }
    public ICollection<WorkflowEntity>? Links { get; set; }

    public static WorkflowEntity FromDomainModel(Workflow workflow) =>
        new()
        {
            Id = workflow.DatabaseId,
            OperationId = workflow.OperationId,
            IdempotencyKey = workflow.IdempotencyKey,
            Namespace = workflow.Namespace,
            CreatedAt = workflow.CreatedAt,
            StartAt = workflow.StartAt,
            UpdatedAt = workflow.UpdatedAt,
            Status = workflow.Status,
            LabelsJson =
                workflow.Labels != null ? JsonSerializer.Serialize(workflow.Labels, JsonOptions.Default) : null,
            ContextJson = workflow.Context.HasValue ? workflow.Context.Value.GetRawText() : null,
            TraceContext = workflow.DistributedTraceContext,
            MetadataJson = workflow.Metadata,
            EngineTraceId = workflow.EngineTraceContext,
            InitialState = workflow.InitialState,
            Steps = workflow.Steps.OrderBy(x => x.ProcessingOrder).Select(StepEntity.FromDomainModel).ToList(),
            Dependencies = workflow.Dependencies?.Select(FromDomainModel).ToList(),
            Links = workflow.Links?.Select(FromDomainModel).ToList(),
        };

    public Workflow ToDomainModel() =>
        new()
        {
            DatabaseId = Id,
            IdempotencyKey = IdempotencyKey,
            OperationId = OperationId,
            Namespace = Namespace,
            CreatedAt = CreatedAt,
            StartAt = StartAt,
            UpdatedAt = UpdatedAt,
            Status = Status,
            Labels =
                LabelsJson != null
                    ? JsonSerializer.Deserialize<Dictionary<string, string>>(LabelsJson, JsonOptions.Default)
                    : null,
            Context =
                ContextJson != null ? JsonSerializer.Deserialize<JsonElement>(ContextJson, JsonOptions.Default) : null,
            DistributedTraceContext = TraceContext,
            Metadata = MetadataJson,
            EngineTraceContext = EngineTraceId,
            InitialState = InitialState,
            Steps = Steps.OrderBy(x => x.ProcessingOrder).Select(x => x.ToDomainModel()).ToList(),
            Dependencies = Dependencies?.Select(x => x.ToDomainModel()).ToList(),
            Links = Links?.Select(x => x.ToDomainModel()).ToList(),
        };
}
