using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto.AppUpgrade;

public sealed record AppUpgradePreparation(AppUpgradePreparationStatus Status, string Message);

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum AppUpgradePreparationStatus
{
    Ready,
    LocalChangesBlocking,
    UnsupportedVersion,
}
