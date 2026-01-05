using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Entities;

[Table("process_engine_jobs")]
internal sealed class ProcessEngineJobEntity : IWithCommonJobMeta
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

    public ICollection<ProcessEngineTaskEntity> Tasks { get; set; } = [];

    public static ProcessEngineJobEntity FromDomainModel(ProcessEngineJob job) =>
        new()
        {
            Id = job.DatabaseId,
            Key = job.Key,
            Status = job.Status,
            ActorUserIdOrOrgNumber = job.Actor.UserIdOrOrgNumber,
            ActorLanguage = job.Actor.Language,
            InstanceOrg = job.InstanceInformation.Org,
            InstanceApp = job.InstanceInformation.App,
            InstanceOwnerPartyId = job.InstanceInformation.InstanceOwnerPartyId,
            InstanceGuid = job.InstanceInformation.InstanceGuid,
            Tasks = job.Tasks.Select(ProcessEngineTaskEntity.FromDomainModel).ToList(),
        };

    public ProcessEngineJob ToDomainModel() =>
        new()
        {
            DatabaseId = Id,
            Key = Key,
            Status = Status,
            Actor = new ProcessEngineActor { UserIdOrOrgNumber = ActorUserIdOrOrgNumber, Language = ActorLanguage },
            InstanceInformation = new InstanceInformation
            {
                Org = InstanceOrg,
                App = InstanceApp,
                InstanceOwnerPartyId = InstanceOwnerPartyId,
                InstanceGuid = InstanceGuid,
            },
            Tasks = Tasks.Select(t => t.ToDomainModel()).ToList(),
        };
}
