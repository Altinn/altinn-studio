using System.Runtime.Serialization;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum AutoSaveBehaviourType
{
    [EnumMember(Value = "onChangeFormData")]
    OnChangeFormData = 0,

    [EnumMember(Value = "onChangePage")]
    OnChangePage,
}
