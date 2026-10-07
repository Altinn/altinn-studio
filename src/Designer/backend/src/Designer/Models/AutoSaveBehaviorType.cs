using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models;

/// <summary>
/// Describes when an app saves form data.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter<AutoSaveBehaviorType>))]
public enum AutoSaveBehaviorType
{
    [JsonStringEnumMemberName("onChangeFormData")]
    OnChangeFormData = 0,

    [JsonStringEnumMemberName("onChangePage")]
    OnChangePage,
}
