using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using WorkflowEngine.Data.Abstractions;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Entities;

[Table("Workflows")]
internal sealed class WorkflowEntity : IHasCommonMetadata
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [MaxLength(500)]
    public required string IdempotencyKey { get; set; }

    public string? InstanceLockKey { get; set; }

    public PersistentItemStatus Status { get; set; }

    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public DateTimeOffset CreatedAt { get; set; }

    [DatabaseGenerated(DatabaseGeneratedOption.Computed)]
    public DateTimeOffset? UpdatedAt { get; set; }

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

    public string? TraceContext { get; set; }

    public ICollection<StepEntity> Steps { get; set; } = [];

    public static WorkflowEntity FromDomainModel(Workflow workflow) =>
        new()
        {
            Id = workflow.DatabaseId,
            IdempotencyKey = workflow.IdempotencyKey,
            InstanceLockKey = workflow.InstanceLockKey,
            Status = workflow.Status,
            ActorUserIdOrOrgNumber = workflow.Actor.UserIdOrOrgNumber,
            ActorLanguage = workflow.Actor.Language,
            InstanceOrg = workflow.InstanceInformation.Org,
            InstanceApp = workflow.InstanceInformation.App,
            InstanceOwnerPartyId = workflow.InstanceInformation.InstanceOwnerPartyId,
            InstanceGuid = workflow.InstanceInformation.InstanceGuid,
            TraceContext = workflow.TraceContext,
            Steps = workflow.Steps.Select(StepEntity.FromDomainModel).ToList(),
        };

    public Workflow ToDomainModel() =>
        new()
        {
            DatabaseId = Id,
            IdempotencyKey = IdempotencyKey,
            InstanceLockKey = InstanceLockKey,
            Status = Status,
            Actor = new Actor { UserIdOrOrgNumber = ActorUserIdOrOrgNumber, Language = ActorLanguage },
            InstanceInformation = new InstanceInformation
            {
                Org = InstanceOrg,
                App = InstanceApp,
                InstanceOwnerPartyId = InstanceOwnerPartyId,
                InstanceGuid = InstanceGuid,
            },
            TraceContext = TraceContext,
            Steps = Steps.Select(t => t.ToDomainModel(TraceContext)).ToList(),
        };
}
