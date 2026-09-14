using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto.AppUpgrade;

public sealed record AppUpgradeRun(
    AppUpgradeRunState State,
    string? RunUrl = null,
    string? CurrentStep = null,
    AppUpgradeResult? Result = null
);

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum AppUpgradeRunState
{
    Queued,
    Running,
    Completed,
}
