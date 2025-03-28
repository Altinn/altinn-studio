using System.Runtime.Serialization;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum GroupType
{
    [EnumMember(Value = "default")]
    Default = 0,

    [EnumMember(Value = "info")]
    Info,
}
