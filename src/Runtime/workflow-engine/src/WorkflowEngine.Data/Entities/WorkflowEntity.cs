using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using WorkflowEngine.Data.Abstractions;
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

    [MaxLength(100)]
    public string? InstanceLockKey { get; set; }

    public PersistentItemStatus Status { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? StartAt { get; set; }

    public DateTimeOffset? UpdatedAt { get; set; }

    public DateTimeOffset? BackoffUntil { get; set; }

    [MaxLength(50)]
    public required string ActorUserIdOrOrgNumber { get; set; }

    [MaxLength(10)]
    public string? ActorLanguage { get; set; }

    [MaxLength(100)]
    public required string InstanceOrg { get; set; }

    [MaxLength(100)]
    public required string InstanceApp { get; set; }

    public int InstanceOwnerPartyId { get; set; }

    public Guid InstanceGuid { get; set; }

    public Guid? CorrelationId { get; set; }

    public required string Namespace { get; set; }

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

    public static WorkflowEntity FromDomainModel(Workflow workflow)
    {
        var entity = new WorkflowEntity
        {
            Id = workflow.DatabaseId,
            CorrelationId = workflow.CorrelationId,
            InstanceLockKey = workflow.InstanceLockKey,
            OperationId = workflow.OperationId,
            IdempotencyKey = workflow.IdempotencyKey,
            CreatedAt = workflow.CreatedAt,
            StartAt = workflow.StartAt,
            UpdatedAt = workflow.UpdatedAt,
            BackoffUntil = workflow.BackoffUntil,
            Status = workflow.Status,
            ActorUserIdOrOrgNumber = workflow.Actor.UserIdOrOrgNumber,
            ActorLanguage = workflow.Actor.Language,
            InstanceOrg = workflow.InstanceInformation.Org,
            InstanceApp = workflow.InstanceInformation.App,
            InstanceOwnerPartyId = workflow.InstanceInformation.InstanceOwnerPartyId,
            InstanceGuid = workflow.InstanceInformation.InstanceGuid,
            Namespace = workflow.Namespace,
            TraceContext = workflow.DistributedTraceContext,
            MetadataJson = workflow.Metadata,
            EngineTraceId = workflow.EngineTraceContext,
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
            InstanceLockKey = InstanceLockKey,
            IdempotencyKey = IdempotencyKey,
            OperationId = OperationId,
            CreatedAt = CreatedAt,
            StartAt = StartAt,
            UpdatedAt = UpdatedAt,
            BackoffUntil = BackoffUntil,
            Status = Status,
            Actor = new Actor { UserIdOrOrgNumber = ActorUserIdOrOrgNumber, Language = ActorLanguage },
            InstanceInformation = new InstanceInformation
            {
                Org = InstanceOrg,
                App = InstanceApp,
                InstanceOwnerPartyId = InstanceOwnerPartyId,
                InstanceGuid = InstanceGuid,
            },
            Namespace = Namespace,
            DistributedTraceContext = TraceContext,
            Metadata = MetadataJson,
            EngineTraceContext = EngineTraceId,
            InitialState = InitialState,
            Steps = Steps.OrderBy(x => x.ProcessingOrder).Select(x => x.ToDomainModel()).ToList(),
            Dependencies = Dependencies?.Select(x => x.ToDomainModel()).ToList(),
            Links = Links?.Select(x => x.ToDomainModel()).ToList(),
        };
}
