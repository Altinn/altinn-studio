using System.Runtime.Serialization;

namespace Altinn.Studio.Designer.Enums;

/// <summary>
/// ImageUrlValidationResult
/// </summary>
public enum ImageUrlValidationResult
{
    [EnumMember(Value = "Ok")]
    Ok,

    [EnumMember(Value = "NotAnImage")]
    NotAnImage,

    [EnumMember(Value = "NotValidUrl")]
    NotValidUrl,
}
