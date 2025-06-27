using System.Text.Json.Serialization;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Studio.Admin.Models;

public class SimpleInstance
{
    [JsonPropertyName("id")]
    public required string Id { get; set; }

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
        var partyIdPrefix = $"{instance.InstanceOwner.PartyId}/";
        var orgPrefix = $"{instance.Org}/";

        if (!instance.Id.StartsWith(partyIdPrefix))
        {
            throw new InvalidOperationException($"Instance id {instance.Id} has an unexpected format, expected '{{instanceOwnerPartyId}}/{{instanceId}}'.");
        }

        if (!instance.AppId.StartsWith(orgPrefix))
        {
            throw new InvalidOperationException($"App id {instance.AppId} has an unexpected format, expected '{{org}}/{{app}}'.");
        }

        return new SimpleInstance()
        {
            Id = instance.Id.Substring(partyIdPrefix.Length),
            Org = instance.Org,
            App = instance.AppId.Substring(orgPrefix.Length),
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
            IsConfirmed = instance.CompleteConfirmations?.Count > 0,
            ConfirmedAt = instance
                .CompleteConfirmations?.OrderBy(c => c.ConfirmedOn)
                .FirstOrDefault()
                ?.ConfirmedOn,
            CreatedAt = instance.Created,
            LastChangedAt = instance.LastChanged,
        };
    }
}
