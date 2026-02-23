using System.Runtime.Serialization;

namespace Altinn.Studio.Designer.Enums
{
    /// <summary>
    /// Enum for reference types of resources in the resource registry
    /// </summary>
    public enum ResourceReferenceType
    {
        [EnumMember(Value = "Default")]
        Default = 0,

        [EnumMember(Value = "Uri")]
        Uri = 1,

        [EnumMember(Value = "DelegationSchemeId")]
        DelegationSchemeId = 2,

        [EnumMember(Value = "MaskinportenScope")]
        MaskinportenScope = 3,

        [EnumMember(Value = "ServiceCode")]
        ServiceCode = 4,

        [EnumMember(Value = "ServiceEditionCode")]
        ServiceEditionCode = 5,

        [EnumMember(Value = "ApplicationId")]
        ApplicationId = 6,

        [EnumMember(Value = "ServiceEditionVersion")]
        ServiceEditionVersion = 7,
    }
}
