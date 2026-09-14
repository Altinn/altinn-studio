using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto.AppUpgrade;

public sealed record AppUpgradeStart(AppUpgradeStartStatus Status, string Message, string? BranchName = null);

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum AppUpgradeStartStatus
{
    Started,
    UnsupportedVersion,
    Failed,
}
