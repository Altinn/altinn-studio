using System.Text.Json.Serialization;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Studio.Admin.Models;

public class SimpleInstance
{
    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("instanceOwnerPartyId")]
    public required string InstanceOwnerPartyId { get; set; }

    [JsonPropertyName("org")]
    public required string Org { get; set; }

    [JsonPropertyName("app")]
    public required string App { get; set; }

    [JsonPropertyName("currentTask")]
    public string? CurrentTask { get; set; }

    [JsonPropertyName("dueBefore")]
    public DateTimeOffset? DueBefore { get; set; }

    [JsonPropertyName("isComplete")]
    public required bool IsComplete { get; set; }

    [JsonPropertyName("completedAt")]
    public DateTimeOffset? CompletedAt { get; set; }

    [JsonPropertyName("isArchived")]
    public required bool IsArchived { get; set; }

    [JsonPropertyName("archivedAt")]
    public DateTimeOffset? ArchivedAt { get; set; }

    [JsonPropertyName("isSoftDeleted")]
    public required bool IsSoftDeleted { get; set; }

    [JsonPropertyName("softDeletedAt")]
    public DateTimeOffset? SoftDeletedAt { get; set; }

    [JsonPropertyName("isHardDeleted")]
    public required bool IsHardDeleted { get; set; }

    [JsonPropertyName("hardDeletedAt")]
    public DateTimeOffset? HardDeletedAt { get; set; }

    [JsonPropertyName("isConfirmed")]
    public required bool IsConfirmed { get; set; }

    [JsonPropertyName("confirmedAt")]
    public DateTimeOffset? ConfirmedAt { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTimeOffset? CreatedAt { get; set; }

    [JsonPropertyName("lastChangedAt")]
    public DateTimeOffset? LastChangedAt { get; set; }

    public static SimpleInstance FromInstance(Instance instance)
    {
        return new SimpleInstance()
        {
            Id = instance.Id.Split("/")[1],
            InstanceOwnerPartyId = instance.Id.Split("/")[0],
            Org = instance.Org,
            App = instance.AppId.Split("/")[1], // TODO: Can the app name contain "/"?
            CurrentTask = instance.Process.CurrentTask?.Name,
            DueBefore = instance.DueBefore,
            IsComplete = instance.Process.Ended != null,
            CompletedAt = instance.Process.Ended,
            IsArchived = instance.Status.IsArchived,
            ArchivedAt = instance.Status.Archived,
            IsSoftDeleted = instance.Status.IsSoftDeleted,
            SoftDeletedAt = instance.Status.SoftDeleted,
            IsHardDeleted = instance.Status.IsHardDeleted,
            HardDeletedAt = instance.Status.HardDeleted,
            IsConfirmed = instance.CompleteConfirmations?.Count is int Count && Count > 0,
            ConfirmedAt = instance.CompleteConfirmations?.OrderBy(c => c.ConfirmedOn).FirstOrDefault()?.ConfirmedOn,
            CreatedAt = instance.Created,
            LastChangedAt = instance.LastChanged,
        };
    }
}
