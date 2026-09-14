using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto.AppUpgrade;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum AppUpgradeMessageStatus
{
    Info,
    Ok,
    Skip,
    Warning,
    Todo,
    Failed,
}
