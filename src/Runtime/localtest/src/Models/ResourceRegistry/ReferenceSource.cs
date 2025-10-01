using System.Runtime.Serialization;

namespace Altinn.ResourceRegistry.Core.Enums
{
    /// <summary>
    /// Enum for the different reference sources for resources in the resource registry
    /// </summary>
    public enum ReferenceSource : int
    {
        [EnumMember(Value = "Default")]    
        Default = 0,

        [EnumMember(Value = "Altinn1")]
        Altinn1 = 1,

        [EnumMember(Value = "Altinn2")]
        Altinn2 = 2,

        [EnumMember(Value = "Altinn3")]
        Altinn3 = 3,

        [EnumMember(Value = "ExternalPlatform")]
        ExternalPlatform = 4
    }
}
