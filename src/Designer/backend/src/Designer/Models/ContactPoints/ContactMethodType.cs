using System.Runtime.Serialization;

namespace Altinn.Studio.Designer.Models.ContactPoints;

public enum ContactMethodType
{
    [EnumMember(Value = "email")]
    Email = 0,

    [EnumMember(Value = "sms")]
    Sms = 1,

    [EnumMember(Value = "slack")]
    Slack = 2,
}
