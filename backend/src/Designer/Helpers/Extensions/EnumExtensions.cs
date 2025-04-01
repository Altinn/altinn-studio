using System;
using System.Linq;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Helpers.Extensions;

public static class JsonStringEnumMemberNameExtensions
{
    public static string GetJsonStringEnumMemberName(this Enum enumValue)
    {
        var memberInfo = enumValue.GetType().GetMember(enumValue.ToString()).FirstOrDefault();

        if (memberInfo != null)
        {
            var attribute = memberInfo
                .GetCustomAttributes(typeof(JsonStringEnumMemberNameAttribute), false)
                .Cast<JsonStringEnumMemberNameAttribute>()
                .FirstOrDefault();

            return attribute?.Name;
        }

        return null;
    }
}
