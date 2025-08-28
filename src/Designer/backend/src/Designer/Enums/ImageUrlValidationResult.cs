using System.Runtime.Serialization;

namespace Altinn.Studio.Designer.Enums;

public enum ImageUrlValidationResult
{
    [EnumMember(Value = "NotValidImage")] NotValidImage,
    [EnumMember(Value = "Ok")] Ok,
}
