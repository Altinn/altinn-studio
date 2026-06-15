using System.Runtime.Serialization;

namespace Altinn.Studio.Designer.Models.ContactPoints;

public enum ReportFrequency
{
    [EnumMember(Value = "none")]
    None = 0,

    [EnumMember(Value = "daily")]
    Daily = 1,

    [EnumMember(Value = "weekly")]
    Weekly = 2,

    [EnumMember(Value = "monthly")]
    Monthly = 3,
}
