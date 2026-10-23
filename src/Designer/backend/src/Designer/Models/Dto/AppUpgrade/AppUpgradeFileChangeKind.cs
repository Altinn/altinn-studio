using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto.AppUpgrade;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum AppUpgradeFileChangeKind
{
    Added,
    Modified,
    Deleted,
    Renamed,
}
