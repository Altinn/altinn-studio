using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum GroupType
{
    [JsonStringEnumMemberName("default")]
    Default = 0,

    [JsonStringEnumMemberName("info")]
    Info,
}
