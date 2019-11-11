using System;
using System.Linq;
using System.Runtime.Serialization;

namespace AltinnCore.Designer.TypedHttpClients.AzureDevOps.Enums
{
    /// <summary>
    /// Contains extension methods for Enum
    /// </summary>
    public static class EnumExtensions
    {
        /// <summary>
        /// Extension method to retrieve the value from EnumMemberAttribute
        /// which can potentially be different from the Enum member.ToString() value
        /// </summary>
        /// <param name="enum">Any Enum</param>
        /// <returns></returns>
        public static string ToEnumMemberAttributeValue(this Enum @enum)
        {
            EnumMemberAttribute attr = @enum
                .GetType()
                .GetMember(@enum.ToString())
                .FirstOrDefault()
                ?.GetCustomAttributes(false)
                .OfType<EnumMemberAttribute>()
                .FirstOrDefault();

            return attr == null ? @enum.ToString() : attr.Value;
        }
    }
}
