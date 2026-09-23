using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models;

[JsonConverter(typeof(JsonStringEnumConverter<GroupType>))]
public enum GroupType
{
    [JsonStringEnumMemberName("default")]
    Default = 0,

    [JsonStringEnumMemberName("info")]
    Info,
}
